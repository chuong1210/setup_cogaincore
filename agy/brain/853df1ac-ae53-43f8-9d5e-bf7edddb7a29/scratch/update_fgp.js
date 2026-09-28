const fs = require('fs');
const file = 'c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/src/Services/ServiceDesk/ServiceDesk.Services/Implement/PackingList/FinishedGoodsPackingService.cs';
let content = fs.readFileSync(file, 'utf8');

const oldMethod = `    private async Task<Result> ValidateNoLockedDetailsAsync(IEnumerable<Guid> mechDetailIds)
    {
        var changeRepo = _unitOfWork.GetRepository<MechanicalPackingListDetailChange>();
        var lockedTags = await changeRepo.Query()
            .Include(c => c.TargetDetail)
            .Where(c => mechDetailIds.Contains(c.TargetDetailId!.Value)
                        && c.RequestStatus == ChangeRequestStatus.Pending
                        && c.RequestType == ChangeRequestType.Modify)
            .Select(c => c.TargetDetail!.TagNo)
            .ToListAsync();

        if (lockedTags.Count == 0) return Result.Success();

        return Result.Failure(
            $"Không thể thực hiện — các tag sau đang chờ duyệt chỉnh sửa: {string.Join(", ", lockedTags)}. " +
            "Vui lòng chờ leader duyệt hoặc từ chối trước.",
            System.Net.HttpStatusCode.Conflict);
    }`;

const newMethod = `    private async Task<Result> ValidateNoLockedDetailsAsync(IEnumerable<Guid> mechDetailIds)
    {
        var idList = mechDetailIds.Distinct().ToList();
        if (idList.Count == 0) return Result.Success();

        var changeRepo = _unitOfWork.GetRepository<MechanicalPackingListDetailChange>();
        var lockedChanges = await changeRepo.Query()
            .Include(c => c.TargetDetail)
            .Include(c => c.TargetMaterialDetail)
            .Where(c => ((c.TargetDetailId.HasValue && idList.Contains(c.TargetDetailId.Value))
                         || (c.TargetMaterialDetailId.HasValue && idList.Contains(c.TargetMaterialDetailId.Value)))
                        && c.RequestStatus == ChangeRequestStatus.Pending
                        && c.RequestType == ChangeRequestType.Modify)
            .ToListAsync();

        if (lockedChanges.Count == 0) return Result.Success();

        var lockedNames = lockedChanges
            .Select(c => c.TargetDetail?.TagNo
                         ?? c.TargetMaterialDetail?.MaterialCodeSnapshot
                         ?? c.TargetMaterialDetail?.MaterialNameSnapshot
                         ?? "chi tiết")
            .Distinct();

        return Result.Failure(
            $"Không thể thực hiện — các chi tiết sau đang chờ duyệt chỉnh sửa: {string.Join(", ", lockedNames)}. " +
            "Vui lòng chờ leader duyệt hoặc từ chối trước.",
            System.Net.HttpStatusCode.Conflict);
    }`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOld = oldMethod.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedOld)) {
    console.error('OLD METHOD NOT FOUND');
    process.exit(1);
}

const replaced = normalizedContent.replace(normalizedOld, newMethod.replace(/\r\n/g, '\n'));
const finalContent = content.includes('\r\n') ? replaced.replace(/\n/g, '\r\n') : replaced;

fs.writeFileSync(file, finalContent, 'utf8');
console.log('SUCCESS');
