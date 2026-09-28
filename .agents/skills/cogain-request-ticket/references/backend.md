# Backend Architecture for Request Tickets ("Phiếu")

This document details the backend engineering pattern for request tickets and business documents ("Phiếu") in `cogain-core`, modeled directly after the reference implementation in `OvertimeRequestService`.

---

## 1. Core Concepts & Responsibilities

A "Phiếu" (e.g., `OvertimeRequest`, `LeaveRequest`, `BusinessTripRequest`, `SiteDelivery`) is a multi-aggregate, cross-service business document governed by a workflow engine. It differs from standard master data CRUD in 4 critical aspects:

1. **Snapshot Persistence**: Frozen audit copies of external reference names and codes (`*CodeSnapshot`, `*NameSnapshot`) to avoid distributed joins and preserve historical integrity.
2. **Child Collection Reconciliation (`ISyncsChildren`)**: Clean diff-based synchronization of child rows (`Details`, `Attachments`) without duplicate insertions or accidental hard-deletes.
3. **WorkItem Workflow Lifecycle**: Seamless integration with the MasterData / WorkFlow engine (`CreateWithWorkItemAsync`, `TransitionAsync`).
4. **Cross-Service Operational Sync**: Live enrichment on view (e.g. biometric clock times from HR via gRPC) vs. immutable audit freeze upon supervisor/manager confirmation.

---

## 2. Entity Architecture

The aggregate root must implement `ITicketAccessControl` and `ISyncsChildren<TEntity>`.

```csharp
using Contracts.Attributes;
using Contracts.Domains;
using Contracts.Domain.Interfaces;
using Shared.Enums;

namespace ServiceDesk.Data.Entities.SampleTicket;

[AutoFilter]
[CodeGeneration("Phiếu yêu cầu mẫu", EContextScope.ServiceDesk, typeof(SampleTicketRequest))]
public record SampleTicketRequest : EntityAuditBase<Guid>, ITicketAccessControl, ISyncsChildren<SampleTicketRequest>
{
    public string CategoryCode => nameof(SampleTicketRequest);

    // ITicketAccessControl: users granted view/manage permissions beyond creator
    public IEnumerable<Guid> GetRelatedUserIds() => new[] { SupervisorId };

    public string Code { get; set; } = string.Empty;
    public DateTime Date { get; set; }

    // Header references & snapshots
    public Guid SupervisorId { get; set; }
    public string SupervisorCodeSnapshot { get; set; } = string.Empty;
    public string SupervisorNameSnapshot { get; set; } = string.Empty;

    public Guid? DepartmentId { get; set; }
    public string? DepartmentCodeSnapshot { get; set; }
    public string? DepartmentNameSnapshot { get; set; }

    // Status / Notes / Derived
    public string? SupervisorNote { get; set; }
    public decimal CompletionRate { get; set; }

    // Child Collections
    public ICollection<SampleTicketDetail> Details { get; set; } = [];
    public ICollection<SampleTicketAttachment> Attachments { get; set; } = [];

    // --- ISyncsChildren<SampleTicketRequest> Implementation ---
    public void SyncChildren(SampleTicketRequest incoming)
    {
        SyncDetails(incoming.Details);
        SyncAttachments(incoming.Attachments);
    }

    public void SyncDetails(IEnumerable<SampleTicketDetail>? incoming)
    {
        Details ??= [];
        // SyncChildCollection: match by primary key (Id); if empty, fallback to natural key (e.g., ItemId or EmployeeId)
        SyncChildCollection(
            Details,
            incoming,
            d => d.ItemId,
            onUpdate: (existing, item) =>
            {
                existing.ItemId = item.ItemId;
                existing.ProjectId = item.ProjectId;
                existing.Quantity = item.Quantity;
                existing.UnitPrice = item.UnitPrice;
                existing.Note = item.Note;
            });
    }

    public void SyncAttachments(IEnumerable<SampleTicketAttachment>? incoming)
    {
        Attachments ??= [];
        SyncChildCollection(
            Attachments,
            incoming,
            a => a.Url,
            onUpdate: (existing, item) =>
            {
                existing.Name = item.Name;
                existing.Url = item.Url;
                existing.Type = item.Type;
                existing.Size = item.Size;
            });
    }
}
```

### Detail Entity Pattern with Snapshots
```csharp
public record SampleTicketDetail : EntityAuditBase<Guid>
{
    public Guid SampleTicketRequestId { get; set; }
    public SampleTicketRequest SampleTicketRequest { get; set; } = null!;

    // Item/Resource reference & snapshot
    public Guid ItemId { get; set; }
    public string ItemCodeSnapshot { get; set; } = string.Empty;
    public string ItemNameSnapshot { get; set; } = string.Empty;

    // Project reference & snapshot
    public Guid ProjectId { get; set; }
    public string ProjectCodeSnapshot { get; set; } = string.Empty;
    public string ProjectNameSnapshot { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount => Quantity * UnitPrice;

    public string? Note { get; set; }
}
```

---

## 3. Snapshot Policy Engine (`ISnapshotPolicy`)

In microservices, reference data (Employees in `HR`, Projects in `MasterData`) must not be queried via synchronous database joins. `SnapshotPolicyEngine` resolves these references via gRPC using a strict **Two-Phase Lifecycle**.

### Two-Phase Execution Lifecycle (P6/BI-1 Architecture Rule)
1. **Phase 1: COLLECT (`CollectAsync`)**:
   - **Must execute OUTSIDE the database transaction**.
   - Loads existing FK state from DB (`LoadCurrentReferencesAsync`).
   - Computes differences (diffing): only changed or new FKs are collected.
   - Calls `engine.CollectAsync(references, cancellationToken)` to fetch codes/names in batch via gRPC.
   - Gathers auxiliary metadata (e.g. Team types, shift details).
2. **Phase 2: APPLY (`Apply`)**:
   - **Executes INSIDE the transaction** when entities are mapped.
   - Writes `CodeSnapshot` and `NameSnapshot` onto the entity and child items.
   - For `Create`: Run in `AfterMapperAsync`.
   - For `Update`: Run in `AfterReconcileCollectionsAsync` (CRITICAL: must run after `SyncChildren` so newly added detail lines exist on the entity graph!).
   - For custom action paths (e.g. `SupervisorConfirmAsync`): Run in `ExecuteCompensatedTransactionAsync` before `SaveChangesAsync`.

### Implementation Template: `SampleTicketSnapshotPolicy`
```csharp
using Contracts.Domain.Entities;
using Contracts.Domain.Interfaces;
using Contracts.Snapshots;
using Infrastructure.Snapshots;
using Microsoft.EntityFrameworkCore;
using static Infrastructure.Snapshots.SnapshotPolicyMappings;

namespace ServiceDesk.Services.Implement.SampleTicket;

public sealed class SampleTicketSnapshotPolicy(
    IUnitOfWork unitOfWork,
    SnapshotPolicyEngine engine)
    : ISnapshotPolicy<CreateAndUpdateSampleTicketDto, SampleTicketRequest>
{
    private static readonly SnapshotField<HeaderCommand, PriorReferences, SampleTicketRequest>[] HeaderFields =
    [
        new("Supervisor", SnapshotKinds.Employee, "Supervisor",
            x => x.SupervisorId, x => x.SupervisorId, x => x.SupervisorId,
            x => x.SupervisorCodeSnapshot, x => x.SupervisorNameSnapshot,
            (x, c, n) => (x.SupervisorCodeSnapshot, x.SupervisorNameSnapshot) = (c, n)),

        new("Department", SnapshotKinds.Organization, "Department",
            x => x.DepartmentId, x => x.DepartmentId, x => x.DepartmentId,
            x => x.DepartmentCodeSnapshot, x => x.DepartmentNameSnapshot,
            (x, c, n) => (x.DepartmentCodeSnapshot, x.DepartmentNameSnapshot) = (c, n))
    ];

    public async Task<Result<SnapshotPolicyContext>> CollectAsync(
        CreateAndUpdateSampleTicketDto command,
        Guid? existingId,
        CancellationToken cancellationToken)
    {
        var oldState = existingId.HasValue 
            ? await LoadCurrentReferencesAsync(existingId.Value, cancellationToken) 
            : PriorReferences.Empty;

        var references = new List<SnapshotReferenceChange>();

        // 1. Header references
        var header = new HeaderCommand(command.SupervisorId, command.DepartmentId);
        references.AddRange(HeaderFields.Select(f => f.CreateReference(SnapshotBindingKey.Header(f.Field), header, oldState)));

        // 2. Detail child references
        foreach (var detail in command.Details ?? [])
        {
            var prior = detail.Id.HasValue 
                ? oldState.Details.GetValueOrDefault(detail.Id.Value, PriorDetailReferences.Empty) 
                : PriorDetailReferences.Empty;
            
            var identity = detail.Id ?? detail.EmployeeId;

            references.Add(Reference(DetailBinding(identity, "Employee"), SnapshotKinds.Employee, 
                detail.EmployeeId, prior.EmployeeId, "Employee"));
            references.Add(Reference(DetailBinding(identity, "Project"), SnapshotKinds.Project, 
                detail.ProjectId, prior.ProjectId, "Project"));
        }

        return await engine.CollectAsync(references, cancellationToken);
    }

    public void Apply(SampleTicketRequest entity, SnapshotPolicyContext context)
    {
        engine.Apply(context, EnumerateTargets(entity));
    }

    private static IEnumerable<SnapshotReferenceTarget> EnumerateTargets(SampleTicketRequest entity)
    {
        foreach (var field in HeaderFields) 
            yield return field.CreateTarget(SnapshotBindingKey.Header(field.Field), entity);

        foreach (var detail in entity.Details ?? [])
        {
            if (detail.DeletedDate.HasValue) continue;
            var identity = detail.Id != Guid.Empty ? detail.Id : detail.EmployeeId;

            yield return Target(DetailBinding(identity, "Employee"), SnapshotKinds.Employee, 
                detail.EmployeeId, detail.EmployeeCodeSnapshot, detail.EmployeeNameSnapshot, 
                (c, n) => (detail.EmployeeCodeSnapshot, detail.EmployeeNameSnapshot) = (c, n));

            yield return Target(DetailBinding(identity, "Project"), SnapshotKinds.Project, 
                detail.ProjectId, detail.ProjectCodeSnapshot, detail.ProjectNameSnapshot, 
                (c, n) => (detail.ProjectCodeSnapshot, detail.ProjectNameSnapshot) = (c, n));
        }
    }

    private async Task<PriorReferences> LoadCurrentReferencesAsync(Guid id, CancellationToken cancellationToken)
    {
        var header = await unitOfWork.GetRepository<SampleTicketRequest>().Query().AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new { x.SupervisorId, x.DepartmentId })
            .FirstOrDefaultAsync(cancellationToken);

        if (header == null) return PriorReferences.Empty;

        var details = await unitOfWork.GetRepository<SampleTicketDetail>().Query().AsNoTracking()
            .Where(x => x.SampleTicketRequestId == id)
            .Select(x => new { x.Id, x.EmployeeId, x.ProjectId })
            .ToListAsync(cancellationToken);

        return new PriorReferences(header.SupervisorId, header.DepartmentId,
            details.ToDictionary(d => d.Id, d => new PriorDetailReferences(d.EmployeeId, d.ProjectId)));
    }

    private static SnapshotBindingKey DetailBinding(Guid identity, string field) =>
        SnapshotBindingKey.Child("Details", identity, field);

    private sealed record PriorDetailReferences(Guid? EmployeeId, Guid? ProjectId)
    {
        public static readonly PriorDetailReferences Empty = new(null, null);
    }

    private sealed record PriorReferences(Guid? SupervisorId, Guid? DepartmentId, IReadOnlyDictionary<Guid, PriorDetailReferences> Details)
    {
        public static readonly PriorReferences Empty = new(null, null, new Dictionary<Guid, PriorDetailReferences>());
    }

    private readonly record struct HeaderCommand(Guid SupervisorId, Guid? DepartmentId);
}
```

---

## 4. Service Implementation Pattern

The service inherits `BaseService` with work item support enabled (`isWorkItemService: true`).

```csharp
public partial class SampleTicketService : BaseService<
    SampleTicketRequest, SampleTicketDto, CreateSampleTicketDto, 
    UpdateSampleTicketDto, SampleTicketDto, AutoFilter, AutoFilterPaging>, 
    ISampleTicketService
{
    private readonly SampleTicketSnapshotPolicy _snapshotPolicy;
    private readonly ISnapshotLifecycleService _snapshotLifecycle;
    private readonly IWorkItemLifecycleService _workItemLifecycleService;
    private readonly HrInfoGrpc.HrInfoGrpcClient _hrGrpcClient;
    private readonly MasterDataInfoGrpc.MasterDataInfoGrpcClient _masterDataGrpcClient;

    public SampleTicketService(
        IMapper mapper,
        IRedisAutoIncrementGenerator redisAutoIncrement,
        IConfiguration config,
        IUnitOfWork unitOfWork,
        AutoFilterService autoFilterService,
        ILogger logger,
        ICurrentUserService currentUserService,
        IFileService fileService,
        IWorkItemLifecycleService workItemLifecycleService,
        SampleTicketSnapshotPolicy snapshotPolicy,
        ISnapshotLifecycleService snapshotLifecycle,
        HrInfoGrpc.HrInfoGrpcClient hrGrpcClient,
        MasterDataInfoGrpc.MasterDataInfoGrpcClient masterDataGrpcClient
    ) : base(mapper, redisAutoIncrement, config, unitOfWork, autoFilterService, logger, currentUserService, fileService, workItemLifecycleService, true)
    {
        _snapshotPolicy = snapshotPolicy;
        _snapshotLifecycle = snapshotLifecycle;
        _workItemLifecycleService = workItemLifecycleService;
        _hrGrpcClient = hrGrpcClient;
        _masterDataGrpcClient = masterDataGrpcClient;
    }

    // Must include child collections for delete and update queries
    protected override string GetDeleteIncludeString() => "Details,Attachments";
    protected override string GetUpdateIncludeString() => "Details,Attachments";

    // ITicketAccessControl: allow supervisor to view ticket even if not creator
    protected override Expression<Func<SampleTicketRequest, bool>> GetAdditionalTicketAccessFilter(Guid currentUserId)
        => x => x.SupervisorId == currentUserId;

    // --- Graph Building for Child Synchronization ---
    protected override SampleTicketRequest BuildIncomingGraph(UpdateSampleTicketDto dto, SampleTicketRequest existing) => new()
    {
        Details = dto.Details?.Select(d => new SampleTicketDetail
        {
            Id = d.Id ?? Guid.Empty,
            ItemId = d.ItemId,
            ProjectId = d.ProjectId,
            Quantity = d.Quantity,
            UnitPrice = d.UnitPrice,
            Note = d.Note
        }).ToList() ?? [],
        Attachments = dto.Attachments?.Select(a => new SampleTicketAttachment
        {
            Id = a.Id,
            Name = a.Name,
            Url = a.Url,
            Type = a.Type,
            Size = a.Size
        }).ToList() ?? []
    };

    // --- Create Pipeline with WorkItem & Collect phase ---
    public override Task<Result<SampleTicketDto>> Create(CreateSampleTicketDto dto)
        => _snapshotLifecycle.ExecuteAsync<SampleTicketRequest, SampleTicketDto>(
            ct => _snapshotPolicy.CollectAsync(dto, existingId: null, ct),
            () => _workItemLifecycleService.CreateWithWorkItemAsync<SampleTicketDto>(
                WorkItemCategoryCode,
                () => base.Create(dto),
                (created, categoryInfo, createdById) => new CreateWorkItemRequest
                {
                    Id = created.Id.ToString(),
                    Code = created.Code,
                    Name = $"Phiếu yêu cầu {created.Code}",
                    CategoryId = categoryInfo.CategoryId,
                    ProcessId = categoryInfo.ProcessId,
                    StartStepId = categoryInfo.StartStepId,
                    CreatedById = createdById,
                    RefTypeId = dto.RefTypeId?.ToString() ?? string.Empty,
                    RefDocId = dto.RefDocId?.ToString() ?? string.Empty
                },
                useTransaction: true),
            RequestAborted);

    protected override async Task AfterMapperAsync(CreateSampleTicketDto dto, SampleTicketRequest entity)
    {
        // Apply snapshots inside the Create transaction
        _snapshotLifecycle.ApplyCurrent(entity, _snapshotPolicy.Apply);
        await base.AfterMapperAsync(dto, entity);
    }

    // --- Update Pipeline with Reconcile & Snapshot Apply ---
    public override Task<Result<SampleTicketDto>> Update(Guid id, UpdateSampleTicketDto dto)
        => _snapshotLifecycle.ExecuteAsync<SampleTicketRequest, SampleTicketDto>(
            ct => _snapshotPolicy.CollectAsync(dto, existingId: id, ct),
            () => base.Update(id, dto),
            RequestAborted);

    protected override async Task AfterReconcileCollectionsAsync(SampleTicketRequest entity, UpdateSampleTicketDto dto)
    {
        // CRITICAL: Apply snapshots AFTER child collection reconciliation
        _snapshotLifecycle.ApplyCurrent(entity, _snapshotPolicy.Apply);
        await base.AfterReconcileCollectionsAsync(entity, dto);
    }

    // --- Live WorkItem Enrichment on Read ---
    protected override async Task BeforeReturnGetByIdAsync(SampleTicketDto dto)
    {
        if (dto == null) return;
        await _masterDataGrpcClient.EnrichWorkItemsAsync([dto], _logger);
    }

    // --- Standard Workflow Step Transition ---
    public async Task<Result> ChangeStep(Guid id, Guid currentStepId, string actionCode, string comment)
    {
        return await _workItemLifecycleService.TransitionAsync(
            id,
            async eid => await _repository.GetByIdAsync(eid),
            new ExecuteWorkItemTransitionRequest
            {
                WorkItemId = id.ToString(),
                ActionCode = actionCode,
                CurrentStepId = currentStepId.ToString(),
                Comment = comment ?? string.Empty
            });
    }
}
```

---

## 5. Workflow Transitions & Action Handlers

In `cogain-core`, workflow transitions for tickets follow two standard patterns:

### Pattern 1: Standard Step Transition (`ChangeStep`)
For generic steps like **Gửi duyệt (Submit)**, **Phê duyệt (Approve)**, **Từ chối (Reject)**, or **Trả lại (Return)**:
```csharp
public async Task<Result> ChangeStep(Guid id, Guid currentStepId, string actionCode, string comment)
{
    return await _workItemLifecycleService.TransitionAsync(
        id,
        async eid => await _repository.GetByIdAsync(eid),
        new ExecuteWorkItemTransitionRequest
        {
            WorkItemId = id.ToString(),
            ActionCode = actionCode,
            CurrentStepId = currentStepId.ToString(),
            Comment = comment ?? string.Empty
        });
}
```

### Pattern 2: Step Transition with Data Update (Compensated Transaction)
When an approval or verification step requires updating local entity data (e.g. approval notes, actual quantities, completion percentage) alongside advancing the workflow:

1. Wrap the logic in `_workItemLifecycleService.ExecuteCompensatedTransactionAsync`.
2. Update local entity fields and details.
3. Save local database changes: `await _unitOfWork.SaveChangesAsync()`.
4. Call `_workItemLifecycleService.TransitionAsync` **LAST** in the transaction. If the workflow engine fails, the local SQL transaction automatically rolls back cleanly!

```csharp
public async Task<Result> ApproveWithDetailsAsync(Guid id, ApproveTicketPayloadDto dto)
{
    return await _workItemLifecycleService.ExecuteCompensatedTransactionAsync(
        $"{nameof(SampleTicketService)}.{nameof(ApproveWithDetailsAsync)}:{id}",
        async compensationScope =>
        {
            var item = await _repository.QueryWithIncludes("Details")
                .FirstOrDefaultAsync(x => x.Id == id);

            if (item == null) 
                return Result.Failure("Ticket does not exist.", HttpStatusCode.NotFound);

            // 1. Update local header or detail fields
            item.SupervisorNote = dto.Note;
            item.CompletionRate = dto.CompletionRate ?? item.CompletionRate;

            await _unitOfWork.SaveChangesAsync();

            // 2. Advance workflow step (ALWAYS LAST)
            var transitionResult = await _workItemLifecycleService.TransitionAsync(
                id,
                async eid => await _repository.GetByIdAsync(eid),
                new ExecuteWorkItemTransitionRequest
                {
                    WorkItemId = id.ToString(),
                    ActionCode = dto.ActionCode,
                    CurrentStepId = dto.CurrentStepId.ToString(),
                    Comment = dto.Comment ?? string.Empty
                });

            return transitionResult;
        },
        RequestAborted);
}
```

### Pattern 3: Cascading Cross-Ticket Step Transitions (Clean Pattern from ProductionOrderService)

In enterprise workflows, changing a step on **Ticket A** often impacts another document (**Ticket B**):
- **Case 1 (Cascading Step Transition)**: Approving or completing Ticket A automatically triggers a step transition on an existing linked Ticket B (e.g., Approving Delivery Receipt transitions Sales Order to Delivered; Completing last Inspection Ticket advances Project Ticket to Handover).
- **Case 2 (Downstream Ticket Generation)**: Completing Ticket A automatically spawns downstream documents and transitions them to their initial steps (e.g., `ProductionOrder` completion spawns `AcceptanceMinute` and `ITR` tickets).
- **Case 3 (Parent Auto-Completion)**: Completing the last child ticket auto-completes the parent WorkItem via `AutoCompleteWorkItemAsync`.

To ensure system consistency, clean code, and zero orphaned states across services, **always follow the clean pattern established in `ProductionOrderService.Method.cs:ExecuteTransitionAsync`**.

#### The 8 Architectural Rules for Clean Cascading Transitions

1. **Pre-Transition Validation (Fast-Fail outside transaction)**:
   - Validate business prerequisites before entering transactions or calling gRPC (e.g., `EnsurePrerequisitesAsync(id)`).
   - If prerequisites fail, return early with `Result.Failure`.

2. **Identity & Request Preparation**:
   - Extract `EmployeeId` and `OrganizationId` via `_currentUserService.GetCurrentIdentityAsync()` to ensure auditability in the workflow engine.

3. **P6 / BI-1 Rule: Collect Freeze Snapshot OUTSIDE the Transaction**:
   - If approving/closing a ticket freezes its reference snapshot, `CollectFreezeSnapshotAsync(id)` **MUST run before** entering the database transaction. Remote gRPC lookups must never hold SQL connection locks!

4. **Compensated Transaction Boundary (`ExecuteCompensatedTransactionAsync`)**:
   - Wrap all state changes (Ticket A transition, snapshot application, Ticket B step change, and local status updates) inside `_workItemLifecycleService.ExecuteCompensatedTransactionAsync`.
   - The provided `IWorkItemCompensationScope` tracks remote side-effects and rolls them back if an exception or failure occurs midway.

5. **Transition Ticket A First & Guard on Completion**:
   - Advance Ticket A's WorkItem first using `_workItemLifecycleService.TransitionAsync`.
   - Capture `response.IsCompleted` in the `afterTransition` callback.
   - If transition fails OR if the step is not the designated milestone (e.g., not completed/approved), return `transitionResult` immediately. Do not execute downstream actions prematurely.

6. **Apply Freeze Snapshot BEFORE Downstream Side-Effects**:
   - Call `ApplyFreezeSnapshotAsync(id, freeze.Data)` *before* triggering Ticket B.
   - This guarantees Ticket B reads and inherits finalized, immutable values from Ticket A.

7. **Cascade Step Change to Ticket B (Propagate `compensationScope`)**:
   - **Do NOT** make scattered, untracked gRPC calls.
   - Execute the transition or creation on Ticket B passing `compensationScope`.
   - If Ticket B's transition/creation fails, return `Result.Failure(...)`. This triggers an immediate, automatic rollback of Ticket A's local DB transaction and compensates remote WorkItem state.

8. **Update Local Status & Return Strongly-Typed Result DTO**:
   - Mark Ticket A entity status (`ApprovedDate`, `Process = EProcessStatus.Completed`).
   - Call `await _unitOfWork.SaveChangesAsync()`.
   - Return `Result<TicketChangeStepResultDto>` containing affected ticket IDs, codes, and messages so the frontend can notify the user with full context.

---

#### Implementation: Cascading Transition to an Existing Linked Ticket (Case 1)

```csharp
public sealed record TicketChangeStepResultDto
{
    public Guid TicketId { get; init; }
    public string TicketCode { get; init; } = string.Empty;
    public Guid? AffectedParentTicketId { get; init; }
    public string? AffectedParentTicketCode { get; init; }
    public string Message { get; init; } = string.Empty;
}

private async Task<Result<TicketChangeStepResultDto>> ExecuteTransitionAsync(
    Guid id, string actionCode, string comment, Guid? currentStepId = null)
{
    // Rule 1: Pre-transition validation (outside transaction)
    if (string.Equals(actionCode, "APPROVE", StringComparison.OrdinalIgnoreCase))
    {
        var prereqCheck = await EnsureReadyForApprovalAsync(id);
        if (!prereqCheck.IsSuccess) 
            return Result<TicketChangeStepResultDto>.Failure(prereqCheck.Message, prereqCheck.StatusCode);
    }

    // Rule 2: Identity resolution for workflow audit trail
    var (empId, orgId) = await _currentUserService.GetCurrentIdentityAsync();
    var request = new ExecuteWorkItemTransitionRequest
    {
        WorkItemId = id.ToString(),
        ActionCode = actionCode.ToUpperInvariant(),
        Comment = comment ?? string.Empty,
        EmployeeId = empId?.ToString() ?? string.Empty,
        OrganizationId = orgId?.ToString() ?? string.Empty
    };
    if (currentStepId.HasValue) request.CurrentStepId = currentStepId.Value.ToString();

    var resultDto = new TicketChangeStepResultDto { TicketId = id };

    // Rule 3: Collect freeze snapshot OUTSIDE transaction (BI-1 / P6 rule)
    var freeze = await CollectFreezeSnapshotAsync(id);
    if (!freeze.IsSuccess) 
        return Result<TicketChangeStepResultDto>.Failure(freeze.Message, freeze.StatusCode);

    // Rule 4: Compensated transaction across tickets
    var txResult = await _workItemLifecycleService.ExecuteCompensatedTransactionAsync(
        $"{nameof(SampleTicketService)}.{nameof(ExecuteTransitionAsync)}:{id}",
        async compensationScope =>
        {
            var isCompleted = false;

            // Rule 5: Transition Ticket A first
            var transitionResult = await _workItemLifecycleService.TransitionAsync(
                id,
                async eid => await _repository.GetByIdAsync(eid),
                request,
                (_, response) =>
                {
                    isCompleted = response.IsCompleted;
                    return Task.CompletedTask;
                });

            // If Ticket A's step change failed, or is not the final step that triggers Ticket B:
            if (!transitionResult.IsSuccess || !isCompleted) 
                return transitionResult;

            // Rule 6: Apply freeze snapshot before downstream actions
            await ApplyFreezeSnapshotAsync(id, freeze.Data);

            // Rule 7: Cascade step transition to linked Ticket B
            var currentTicket = await _repository.Query(x => x.Id == id).FirstOrDefaultAsync();
            if (currentTicket == null) 
                return Result.Failure("Current ticket not found.", HttpStatusCode.NotFound);

            resultDto = resultDto with { TicketCode = currentTicket.Code };

            if (currentTicket.LinkedTicketBId.HasValue)
            {
                var linkedId = currentTicket.LinkedTicketBId.Value;

                // Option A: Call Ticket B service's transition method passing compensationScope
                var ticketBResult = await _ticketBService.AdvanceStepFromLinkedTicketAsync(
                    linkedId, 
                    linkedAction: "SYNC_COMPLETE", 
                    comment: $"Auto-updated from ticket {currentTicket.Code}",
                    compensationScope);

                if (!ticketBResult.IsSuccess)
                {
                    _logger.Warning("[ExecuteTransition] Failed to transition Ticket B {LinkedId}: {Message}", 
                        linkedId, ticketBResult.Message);
                    return Result.Failure($"Failed to transition linked ticket: {ticketBResult.Message}", ticketBResult.StatusCode);
                }

                resultDto = resultDto with 
                { 
                    AffectedParentTicketId = linkedId,
                    AffectedParentTicketCode = ticketBResult.Data?.Code 
                };
            }

            // Rule 8: Update Ticket A local entity status
            currentTicket.ApprovedDate ??= DateTimeOffset.UtcNow;
            currentTicket.Process = EProcessStatus.Completed;
            await _repository.UpdateAsync(currentTicket);
            await _unitOfWork.SaveChangesAsync();

            // (Optional) Rule 3 auto-complete parent WorkItem if configured
            if (currentTicket.ParentWorkItemId.HasValue)
            {
                var completeResp = await _masterDataGrpcClient.AutoCompleteWorkItemAsync(new AutoCompleteWorkItemRequest 
                { 
                    WorkItemId = currentTicket.ParentWorkItemId.Value.ToString() 
                });
                if (!completeResp.Success)
                {
                    _logger.Warning("[ExecuteTransition] AutoCompleteWorkItem failed for parent {ParentId}: {Msg}", 
                        currentTicket.ParentWorkItemId.Value, completeResp.Message);
                }
            }

            return Result.Success(message: transitionResult.Message);
        });

    return txResult.IsSuccess
        ? Result<TicketChangeStepResultDto>.Success(resultDto with { Message = txResult.Message }, message: txResult.Message)
        : Result<TicketChangeStepResultDto>.Failure(txResult.Message, txResult.StatusCode);
}

// Controller endpoint calls ChangeStepAsync
public Task<Result<TicketChangeStepResultDto>> ChangeStepAsync(
    Guid id, Guid currentStepId, string actionCode, string comment)
    => ExecuteTransitionAsync(id, actionCode, comment, currentStepId);
```

---

#### Implementation: Spawning Downstream Tickets with Compensation (Case 2)

Modeled directly after `ProductionOrderService` spawning `AcceptanceMinute` & `ITR`:

```csharp
private async Task<Result<BbntCreationResult>> CreateDownstreamTicketsAsync(
    Guid parentId, IWorkItemCompensationScope compensationScope)
{
    var downstreamService = _downstreamServiceFactory();
    
    // Downstream service internally uses CreateWithWorkItemAsync(..., compensationScope: compensationScope)
    // which registers created WorkItem IDs into compensationScope.TrackCreated(...)
    var createResult = await downstreamService.CreateFromParentAsync(parentId, compensationScope);
    if (!createResult.IsSuccess) 
        return Result<BbntCreationResult>.Failure(createResult.Message, createResult.StatusCode);

    return Result<BbntCreationResult>.Success(new BbntCreationResult(createResult.Data));
}
```

---

## 6. AutoMapper Registration Rules

When configuring `MappingProfile.cs`:
* **Ignore child collections on Update mappings**:
  ```csharp
  CreateMap<UpdateSampleTicketDto, SampleTicketRequest>()
      .ForMember(d => d.Details, opt => opt.Ignore())
      .ForMember(d => d.Attachments, opt => opt.Ignore());
  ```
  *Why?* Child collections are synchronized via `ISyncsChildren.SyncChildren(BuildIncomingGraph(dto, existing))`. AutoMapper reflection mapping over collections causes duplicate records and corrupts tracking!
