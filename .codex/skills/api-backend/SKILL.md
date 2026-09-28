---
name: backend-patterns
description: Step-by-step workflow for adding a new backend endpoint to a microservice (entity → repo → service → controller). Use when the user asks to add an API endpoint, CRUD feature, new entity, or "create endpoint" / "add API" in a .NET service.
---

# Backend: Add a new endpoint

Trigger this skill when adding any new HTTP endpoint to a microservice (`HR`, `MasterData`, `ServiceDesk`, `WorkFlow`, `BusinessDocument`, `ERP`, `Reporting`).

## Prerequisites — gather before coding

1. **Which service?** (e.g., `HR`)
2. **Feature/aggregate name?** (e.g., `Shift`, `Employee`)
3. **Does the entity already exist?** Check `backend/src/Services/{Svc}/{Svc}.Data/Entities/`.
4. **Is this a standard CRUD or custom endpoint?**

## Quick path: Standard CRUD entity (80% of cases)

If the entity needs full CRUD (get, getById, paged, dropdown, create, update, delete), follow the BaseService + BaseController path below. This gives you all endpoints automatically.

## Workflow (in order)

### 1. Entity (skip if exists)

File: `backend/src/Services/{Svc}/{Svc}.Data/Entities/{Entity}.cs`

```csharp
[AutoFilter]           // Enable AutoFilterService for filter/sort
[CodeGeneration]       // Optional: enable auto code generation
public class Shift : EntityAuditBase<Guid>  // or WorkItemEntityAuditBase<Guid> for WorkItem entities
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset StartTime { get; set; }   // Always DateTimeOffset, NOT DateTime
    public Guid EmployeeId { get; set; }
    public EStatus Status { get; set; } = EStatus.Active;
    public Employee Employee { get; set; } = null!;
}
```

Key rules:

- Always inherit `EntityAuditBase<Guid>` (or `WorkItemEntityAuditBase<Guid>` for WorkItem entities)
- Id is auto-generated GuidV7 — never set manually
- Use `DateTimeOffset`, not `DateTime`
- Soft delete via `DeletedDate` — never hard-delete
- `UomId` for unit-of-measure fields (never `UnitId`)
- Add `[AutoFilter]` attribute on the class

### 2. EF Configuration

File: `backend/src/Services/{Svc}/{Svc}.Data/Persistence/Configurations/{Entity}Configuration.cs`

```csharp
public class ShiftConfiguration : IEntityTypeConfiguration<Shift>
{
    public void Configure(EntityTypeBuilder<Shift> builder)
    {
        builder.ToTable("shifts");
        builder.HasKey(x => x.Id);
        builder.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId);

        // Unique Code with soft-delete filter — MANDATORY for all entities with a Code field
        builder.HasIndex(x => x.Code)
               .IsUnique()
               .HasFilter("\"deleted_date\" IS NULL");
    }
}
```

> **CRITICAL**: Every entity with a `Code` property MUST have this unique index with the soft-delete filter. This prevents duplicate codes among active records while allowing deleted records to be re-created with the same code.

### 3. Migration

```bash
cd backend
dotnet ef migrations add Add{Entity} -p src/Services/{Svc}/{Svc}.Data -s src/Services/{Svc}/{Svc}.API
```

Migration auto-applies on service startup.

### 4. CacheKeys (appsettings.json)

File: `backend/src/Services/{Svc}/{Svc}.API/appsettings.json`
Add entity name → cache prefix mapping inside `"CacheKeys"`:

```json
"CacheKeys": {
  "Shift": "SH"
}
```

The prefix is a short uppercase code. Required for Ocelot route generation — the merge script uses CacheKeys to discover controllers.

### 5. DTOs (4 per entity)

Files in `backend/src/Services/{Svc}/{Svc}.Services/DTOs/{Feature}/`:

- `ShiftDto.cs` — read/output (inherit `EntityBaseDto<Guid>` or `WorkItemEntityBaseDto`)
- `ShiftCreateDto.cs` — create input (flat properties, no Id)
- `ShiftUpdateDto.cs` — update input (same as create + Id)
- `ShiftDropdownDto.cs` — use `DropdownDto<Guid>` (Id, Code, Name) for standard dropdowns

Filter DTOs if custom paging needed:

- `ShiftFilterPaging.cs` — inherit `AutoFilterPaging`, add custom filter fields

### 6. AutoMapper profile

File: `backend/src/Services/{Svc}/{Svc}.Services/AutoMapperConfig/{Feature}Profile.cs`

```csharp
public class ShiftProfile : Profile
{
    public ShiftProfile()
    {
        // 4 standard mappings per entity
        CreateMap<Shift, ShiftDto>().ReverseMap();
        CreateMap<Shift, DropdownDto<Guid>>();
        CreateMap<ShiftCreateDto, Shift>();
        CreateMap<ShiftUpdateDto, Shift>()
            .ForMember(d => d.Id, opt => opt.Ignore());  // CRITICAL: prevent 409 on update
    }
}
```

Key rules:

- UpdateDto → Entity MUST ignore `.Id` via `.ForMember(d => d.Id, opt => opt.Ignore())`
- Ignore child collections on UpdateDto if handling manually: `.ForMember(d => d.Children, opt => opt.Ignore())`
- NEVER add `CreateMap<ShiftDto, Shift>()` if `ReverseMap()` already covers it

### 7. Service interface + implementation

**Interface** — `Services/Interface/IShiftService.cs`:

```csharp
public interface IShiftService : IBaseService<Shift, ShiftDto, ShiftCreateDto, ShiftUpdateDto, DropdownDto<Guid>, AutoFilter, ShiftFilterPaging>
{
    // Custom methods beyond CRUD go here
}
```

**Implementation** — `Services/Implement/Shift/ShiftService.cs`:

```csharp
public class ShiftService : BaseService<Shift, ShiftDto, ShiftCreateDto, ShiftUpdateDto, DropdownDto<Guid>, AutoFilter, ShiftFilterPaging>, IShiftService
{
    public ShiftService(
        IMapper mapper,
        IRedisAutoIncrementGenerator codeGen,
        IConfiguration configuration,
        IUnitOfWork unitOfWork,
        AutoFilterService autoFilterService,
        ILogger<ShiftService> logger)
        : base(mapper, codeGen, configuration, unitOfWork, autoFilterService, logger) { }

    // Override hooks as needed:
    // BeforeCreateAsync, AfterMapperAsync, AfterCreateAsync
    // BeforeUpdateAsync, AfterMappingAsync, AfterUpdateAsync
    // BeforeGetByIdAsync, AfterGetByIdAsync, BeforeReturnGetByIdAsync
    // BeforeGetPagedAsync, BeforeApplyAutoFilterAsync, AfterGetPagedAsync
    // GetUpdateIncludeString()

    // Custom filter example — override BeforeApplyAutoFilterAsync:
    protected override Task<IQueryable<Shift>> BeforeApplyAutoFilterAsync(
        IQueryable<Shift> query, ShiftFilterPaging parameters)
    {
        if (parameters.MyCustomField.HasValue)
            query = query.Where(x => x.SomeField == parameters.MyCustomField.Value);
        return Task.FromResult(query);
    }
}
```

Register in `Program.cs` (or DI extension):

```csharp
services.AddScoped<IShiftService, ShiftService>();
```

### 8. Controller

File: `{Svc}.API/Controllers/{Feature}/ShiftsController.cs`

Choose the base class based on whether the entity needs Excel import/export:

```csharp
// WITH Excel → BaseExcelController (extends BaseController, adds 3 Excel endpoints)
[Authorize]
public class ShiftsController : BaseExcelController<IShiftService, Shift, ShiftDto, ShiftCreateDto, ShiftUpdateDto, DropdownDto<Guid>, AutoFilter, ShiftFilterPaging>
{
    public ShiftsController(IShiftService service) : base(service) { }
}

// WITHOUT Excel → BaseController
[Authorize]
public class ShiftsController : BaseController<IShiftService, Shift, ShiftDto, ShiftCreateDto, ShiftUpdateDto, DropdownDto<Guid>, AutoFilter, ShiftFilterPaging>
{
    public ShiftsController(IShiftService service) : base(service) { }
}
```

**BaseExcelController auto-adds 3 endpoints** (no need to declare them manually):
| Method | Route | Action |
|---|---|---|
| GET | `/export-template` | ExportTemplate |
| POST | `/import/excel` | ImportFromExcel |
| GET | `/export-data` | ExportData |

Auto-generated endpoints from BaseController:
| Method | Route | Action |
|---|---|---|
| GET | `/{id}` | GetById |
| GET | `/template` | GetTemplate (Excel) |
| GET | `/` | GetAll |
| GET | `/paged` | GetPaged |
| GET | `/dropdown` | GetDropdown (Active only) |
| GET | `/check-exist-generation-code` | CheckExistGenerationCode |
| POST | `/` | Create |
| POST | `/ids` | GetByIds |
| PUT | `/{id}` | Update |
| DELETE | `/{id}` | Delete (soft) |
| DELETE | `/` | DeleteByIds (soft) |

### 9. Custom endpoints (if needed)

If you need a custom endpoint beyond CRUD, add it to the controller:

```csharp
[HttpPost("assign")]
public async Task<ApiResponse<ShiftDto>> Assign([FromBody] AssignShiftRequest req, CancellationToken ct)
{
    var data = await Service.AssignAsync(req, ct);
    return new ApiResponse<ShiftDto>
    {
        StatusCode = HttpStatusCode.OK,
        Data = data,
        Message = "Shift assigned"
    };
}
```

### 10. Tests

Add to `backend/tests/{Svc}.UnitTests/Services/{Feature}/ShiftService_GetById_Should.cs`:

- Inherit from `{Svc}TestBase` (provides in-memory DbContext, AutoMapper, mocked Redis, ILogger)
- Naming: `<Service>_<Method>_Should.<scenario>`
- At least: happy path + 1 validation failure + 1 not-found
- Use FluentAssertions: `result.Should().NotBeNull(); result.Data.Code.Should().Be("ABC");`

### 11. Ocelot gateway routes

```bash
cd backend
node merge-ocelot.js
```

Regenerates `src/ApiGateways/OcelotApiGw/ocelot.json` from all services' CacheKeys.

### 12. Verify

```bash
dotnet build backend/CogainSolution.sln -c Release
dotnet test backend/tests/{Svc}.UnitTests/ -c Release
```

## Custom patterns (non-CRUD)

### Excel Import/Export

Override in service: `ParseExcelToImportDtos`, `GenerateTemplateBytesAsync`, `GenerateExportDataBytesAsync`.

- Import: validate → parse → ProcessImportWithValidation (transaction)
- Export: generate bytes → upload via FTP
- Performance: fetch validation data upfront in Dictionary/HashSet

**Import data validation (MANDATORY — use shared helpers, never hand-roll):**

All validation MUST use helpers from `Infrastructure.Services.Import` namespace. See `.claude/rules/backend.md` for full reference.

| Helper Class             | Key Methods                                                                                                         | Used For                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `ExcelParsingHelpers`    | `ValidateExcelFile()`, `ValidateHeaders()`, `ParseDateTimeSafe()`, `CheckDuplicateCodeInFile()`                     | File & header validation, date parsing             |
| `ExcelImportHelpers`     | `ValidateRequiredFields()`, `ValidateParentGraph()`, `CheckDuplicateCode()`, `ParseStatus()`, `ShouldSetInactive()` | Row-level required fields, parent-child, status    |
| `ExcelImportParseHelper` | `TryParseDecimal()`, `ParseDecimalOrZero()`                                                                         | Numeric parsing (supports vi-VN format `1.234,56`) |
| `ExcelImportConstants`   | `FormatRowError()`, `GetRowNumber()`                                                                                | Consistent error message formatting                |
| `ImportLookupHelpers`    | `ToCodeDictionary()`, `ToGuidDictionary()`, `CollectCodes()`                                                        | Build O(1) FK lookup dictionaries                  |

**Validation checklist for `ParseExcelToImportDtos`:**

1. **Numbers**: `TryParseDecimal(raw, out val)` + validate `> 0` for quantities/amounts. NEVER `decimal.Parse()` raw.
2. **Dates**: `ParseDateTimeSafe(cell, row, fieldName)`. NEVER `DateTime.Parse()` raw on Excel cells.
3. **Required fields**: Validate Code & Name not empty. Use `ExcelImportConstants.CodeEmptyError` / `NameEmptyError`.
4. **Duplicate codes**: `CheckDuplicateCodeInFile()` (within file) + `CheckDuplicateCode()` (within batch).
5. **FK lookup**: Build `Dictionary<string, T>` via `ToCodeDictionary()` BEFORE the loop. O(1), never O(N).
6. **Parent hierarchy**: `ValidateParentGraph()` for topological sort + circular dependency detection.
7. **Post-parse**: `ValidateResultNotEmpty()` ensures at least 1 valid row. Return `Result.Failure("\n".join(errors))` if any errors.

**Quality checklist (backend MUST verify):**

1. **Sheet names**: Set manually (e.g., `worksheet.Name = "Sản phẩm"`) — do NOT let AI auto-generate sheet names.
2. **Column parity**: Columns in data export file and template file must match exactly (same set, same order).
3. **FK reference data**: For FK columns, include a **hidden reference sheet** named with `Data-` prefix (e.g., `Data-Nhóm hợp đồng`). Reference queries MUST filter `.Where(x => x.Status == EStatus.Active)`. For Group entities, include parent code column.
4. **Status dropdown**: Add data validation list `"Active,Inactive"` on Status column in template.
5. **Group entities with Parent**: Use topological sort for circular dependency detection + two-phase save (entities without parent first, then resolve ParentId by Code after reload). Reference: `CurrencyGroupService.cs`.
6. **Export**: Use `QueryWithIncludes` + AutoMapper (not manual cell-by-cell) when entity has nav props.

**Frontend rules:**

- Import template: use `useMutation` (trigger on click, NOT on mount) inside `<ImportDialog>` `onExportTemplate` callback.
- File naming: frontend passes `DataExport_<Name>` / `Template_<Name>` with translation (e.g. `DataExport_Sản phẩm`). Both files share the SAME base translated name.

### WorkItem integration

- Entity: inherit `WorkItemEntityAuditBase<Guid>`, DTO: inherit `WorkItemEntityBaseDto`
- Inject `IWorkItemLifecycleService` into service (composition, not inheritance)
- Create: `_workItemLifecycleService.CreateWithWorkItemAsync(categoryCode, dbCreate, buildRequest)`
- Delete: stage local delete → delete remote WorkItem → commit (compensation on failure)

### Custom filter for GetPaged

- Create filter DTO inheriting `AutoFilterPaging` with custom properties
- Override `BeforeApplyAutoFilterAsync` in service to add custom WHERE clauses

## Checklist before commit

- [ ] Entity inherits `EntityAuditBase<Guid>` with `[AutoFilter]` attribute
- [ ] EF configuration (`IEntityTypeConfiguration<T>`)
- [ ] Migration created
- [ ] CacheKeys added to `appsettings.json`
- [ ] 4 DTOs: Dto, CreateDto, UpdateDto, DropdownDto
- [ ] AutoMapper: 4 mappings with `.ForMember(d => d.Id, opt => opt.Ignore())` on UpdateDto
- [ ] Service inherits `BaseService<T,...>` with hooks overridden if needed
- [ ] Service + Repository registered in DI
- [ ] Controller inherits `BaseController<T,...>` or returns `ApiResponse<T>`
- [ ] `node merge-ocelot.js` ran from `backend/`
- [ ] Unit tests: happy path + error paths
- [ ] Build + tests green
- [ ] Commit: `feat({svc}:{feature}): <description>`
