const fs = require('fs');
const file = 'c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/src/Services/ServiceDesk/ServiceDesk.Services/Implement/PackingList/MechanicalPackingLists/MechanicalPackingListService.Enrich.cs';
let content = fs.readFileSync(file, 'utf8');

// 1. Update EnrichPendingChangesAsync
const oldEnrichPending = `    private async Task EnrichPendingChangesAsync(MechanicalPackingListDto dto)
    {
        if (dto?.Details == null) return;

        var changeRepo = _unitOfWork.GetRepository<MechanicalPackingListDetailChange>();
        var requests = await changeRepo.Query().AsNoTracking()
            .Where(c => c.MechanicalPackingListId == dto.Id
                        && (c.RequestStatus == ChangeRequestStatus.Pending
                            || c.RequestStatus == ChangeRequestStatus.Approved
                            || c.RequestStatus == ChangeRequestStatus.Rejected))
            .ToListAsync();

        if (requests.Count == 0) return;

        var employeeNameMap = await BuildEmployeeNameMapAsync(requests);

        EnrichModifyRequests(dto, requests, employeeNameMap);
        EnrichAddRequests(dto, requests, employeeNameMap);
    }`;

const newEnrichPending = `    private async Task EnrichPendingChangesAsync(MechanicalPackingListDto dto)
    {
        if (dto == null) return;

        var changeRepo = _unitOfWork.GetRepository<MechanicalPackingListDetailChange>();
        var requests = await changeRepo.Query().AsNoTracking()
            .Where(c => c.MechanicalPackingListId == dto.Id
                        && (c.RequestStatus == ChangeRequestStatus.Pending
                            || c.RequestStatus == ChangeRequestStatus.Approved
                            || c.RequestStatus == ChangeRequestStatus.Rejected))
            .ToListAsync();

        if (requests.Count == 0) return;

        var employeeNameMap = await BuildEmployeeNameMapAsync(requests);

        if (dto.Details?.Count > 0)
        {
            EnrichModifyRequests(dto, requests, employeeNameMap);
            EnrichAddRequests(dto, requests, employeeNameMap);
        }

        if (dto.MaterialDetails?.Count > 0)
        {
            EnrichMaterialModifyRequests(dto, requests, employeeNameMap);
        }
    }`;

// 2. Add EnrichMaterialModifyRequests
const afterEnrichModify = `            detail.PendingChange = new PendingChangeDto
            {
                RequestId = req.Id,
                RequestType = req.RequestType,
                RequestStatus = req.RequestStatus,
                QuantityOld = old.Quantity,
                QuantityNew = nw.Quantity,
                DesignWeightOld = old.DesignWeight,
                DesignWeightNew = nw.DesignWeight,
                ResolvedAt = req.ResolvedAt,
                ResolvedByUser = resolvedByDisplay
            };
        }
    }`;

const withMaterialModify = afterEnrichModify + `

    private static void EnrichMaterialModifyRequests(MechanicalPackingListDto dto, List<MechanicalPackingListDetailChange> requests, Dictionary<Guid, string> employeeNameMap)
    {
        var modifyByMatDetailId = requests
            .Where(c => c.TargetMaterialDetailId.HasValue && c.RequestType == ChangeRequestType.Modify)
            .GroupBy(c => c.TargetMaterialDetailId!.Value)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(c => c.RequestStatus == ChangeRequestStatus.Pending ? 0 : 1)
                       .ThenByDescending(c => c.CreatedDate)
                       .First());

        foreach (var mat in dto.MaterialDetails)
        {
            if (!modifyByMatDetailId.TryGetValue(mat.Id, out var req)) continue;

            var isApproved = req.RequestStatus == ChangeRequestStatus.Approved;
            var isRejected = req.RequestStatus == ChangeRequestStatus.Rejected;
            var resolvedByDisplay = req.ResolvedById.HasValue && employeeNameMap.TryGetValue(req.ResolvedById.Value, out var name)
                ? name : req.ResolvedByUser;

            var old = TryDeserializePendingAdjust(req.OldData);
            var nw = TryDeserializePendingAdjust(req.NewData);
            if (old == null || nw == null) continue;

            mat.IsModified = !isApproved && !isRejected;
            mat.IsApproved = isApproved;
            mat.IsRejected = isRejected;
            mat.PendingChange = new PendingChangeDto
            {
                RequestId = req.Id,
                RequestType = req.RequestType,
                RequestStatus = req.RequestStatus,
                QuantityOld = old.Quantity,
                QuantityNew = nw.Quantity,
                ResolvedAt = req.ResolvedAt,
                ResolvedByUser = resolvedByDisplay
            };
        }
    }`;

// 3. Update EnrichActualWeightAndReceiptQuantityAsync
const oldEnrichActual = `    private async Task EnrichActualWeightAndReceiptQuantityAsync(MechanicalPackingListDto dto)
    {
        if (dto?.Details == null || dto.Details.Count == 0) return;`;

const newEnrichActual = `    private async Task EnrichActualWeightAndReceiptQuantityAsync(MechanicalPackingListDto dto)
    {
        if (dto == null || ((dto.Details == null || dto.Details.Count == 0) && (dto.MaterialDetails == null || dto.MaterialDetails.Count == 0))) return;`;

const oldDetailEnrichLoop = `        foreach (var detail in dto.Details)
        {
            detail.ActualWeight = actualWeightByPlDetailId.GetValueOrDefault(detail.Id, 0m);
            detail.PackedQuantity = packedQtyByPlDetailId.GetValueOrDefault(detail.Id, 0m);
            detail.PackedStatus = ComputeDeliveryStatus(detail.PackedQuantity, detail.Quantity);

            detail.ReceiptQuantity = receiptQtyByPlDetailId.GetValueOrDefault(detail.Id, 0m);
            detail.ReceiptStatus = ComputeDeliveryStatus(detail.ReceiptQuantity, detail.Quantity);

            detail.SiteDeliveryQuantity = deliveryQtyByPlDetailId.GetValueOrDefault(detail.Id, 0m);
            detail.SiteDeliveryStatus = ComputeDeliveryStatus(detail.SiteDeliveryQuantity, detail.Quantity);
        }

        dto.SiteDeliveryStatus = ComputeOverallStatus(dto.Details.Select(d => d.SiteDeliveryStatus));`;

const newDetailEnrichLoop = `        if (dto.Details != null && dto.Details.Count > 0)
        {
            foreach (var detail in dto.Details)
            {
                detail.ActualWeight = actualWeightByPlDetailId.GetValueOrDefault(detail.Id, 0m);
                detail.PackedQuantity = packedQtyByPlDetailId.GetValueOrDefault(detail.Id, 0m);
                detail.PackedStatus = ComputeDeliveryStatus(detail.PackedQuantity, detail.Quantity);

                detail.ReceiptQuantity = receiptQtyByPlDetailId.GetValueOrDefault(detail.Id, 0m);
                detail.ReceiptStatus = ComputeDeliveryStatus(detail.ReceiptQuantity, detail.Quantity);

                detail.SiteDeliveryQuantity = deliveryQtyByPlDetailId.GetValueOrDefault(detail.Id, 0m);
                detail.SiteDeliveryStatus = ComputeDeliveryStatus(detail.SiteDeliveryQuantity, detail.Quantity);
            }

            dto.SiteDeliveryStatus = ComputeOverallStatus(dto.Details.Select(d => d.SiteDeliveryStatus));
        }

        if (dto.MaterialDetails != null && dto.MaterialDetails.Count > 0)
        {
            foreach (var mat in dto.MaterialDetails)
            {
                mat.PackedQuantity = packedQtyByPlDetailId.GetValueOrDefault(mat.Id, 0m);
                mat.PackedStatus = ComputeDeliveryStatus(mat.PackedQuantity, mat.Quantity);
            }
        }`;

let normalized = content.replace(/\r\n/g, '\n');

if (!normalized.includes(oldEnrichPending.replace(/\r\n/g, '\n'))) {
    console.error('oldEnrichPending not found');
    process.exit(1);
}
normalized = normalized.replace(oldEnrichPending.replace(/\r\n/g, '\n'), newEnrichPending.replace(/\r\n/g, '\n'));

if (!normalized.includes(afterEnrichModify.replace(/\r\n/g, '\n'))) {
    console.error('afterEnrichModify not found');
    process.exit(1);
}
normalized = normalized.replace(afterEnrichModify.replace(/\r\n/g, '\n'), withMaterialModify.replace(/\r\n/g, '\n'));

if (!normalized.includes(oldEnrichActual.replace(/\r\n/g, '\n'))) {
    console.error('oldEnrichActual not found');
    process.exit(1);
}
normalized = normalized.replace(oldEnrichActual.replace(/\r\n/g, '\n'), newEnrichActual.replace(/\r\n/g, '\n'));

if (!normalized.includes(oldDetailEnrichLoop.replace(/\r\n/g, '\n'))) {
    console.error('oldDetailEnrichLoop not found');
    process.exit(1);
}
normalized = normalized.replace(oldDetailEnrichLoop.replace(/\r\n/g, '\n'), newDetailEnrichLoop.replace(/\r\n/g, '\n'));

const finalContent = content.includes('\r\n') ? normalized.replace(/\n/g, '\r\n') : normalized;
fs.writeFileSync(file, finalContent, 'utf8');
console.log('SUCCESS ENRICH');
