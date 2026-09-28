# Excel Import & Export Architecture for Request Tickets ("Phiếu")

This document details the complete, production-grade pattern for **Excel Export**, **Template Generation**, and **Excel Import** for request tickets and business documents ("Phiếu") in `cogain-core`. It codifies the strongly-typed `ExcelSchema` pattern used across enterprise services (e.g. `InstallationOrderService`, `PurchaseOrderService`, `SupplyRequestService`).

---

## 1. Overview & Architecture

Request tickets ("Phiếu") in `cogain-core` follow a master-detail structure:
* **Sheet 1 (`Header`)**: General ticket information (Code, Date, Department, Supervisor, WorkItem status).
* **Sheet 2 (`Details`)**: Child line items (Items, Tasks, Projects, Quantities, Unit Prices).
* **Sheet 3+ (`Data_*`)**: Lookup guide sheets (Catalogs of Projects, Employees, Items, UOMs).

To prevent magic column numbers and fragile string comparisons, every ticket module must encapsulate its Excel layout inside a strongly-typed **`ExcelSchema`**.

---

## 2. Strongly-Typed `ExcelSchema` Pattern

Define `ExcelColumn` and `ExcelSchema` inside a dedicated partial service file (e.g., `{Ticket}Service.Excel.cs` or `{Ticket}Service.Method.cs`).

```csharp
namespace ServiceDesk.Services.Implement.SampleTicket;

public record ExcelColumn(int Index, string Name, bool Required = false);

public partial class SampleTicketService
{
    public static class ExcelSchema
    {
        // ── Sheet Name Constants ─────────────────────────────────────────────
        public const string HeaderSheet = "Header";
        public const string DetailsSheet = "Chi tiết";
        public const string DataProjectSheet = "Data_Dự án";
        public const string DataItemSheet = "Data_Vật tư";
        public const string DataDepartmentSheet = "Data_Phòng ban";

        public static int[] RequiredIndexes(params ExcelColumn[] columns)
            => columns.Where(c => c.Required).Select(c => c.Index).ToArray();

        // ── Sheet 1: Header Columns ──────────────────────────────────────────
        public static class Header
        {
            public static readonly ExcelColumn Code = new(1, "Mã phiếu (*)", true);
            public static readonly ExcelColumn Date = new(2, "Ngày áp dụng (*)", true);
            public static readonly ExcelColumn RefType = new(3, "Loại chứng từ tham chiếu");
            public static readonly ExcelColumn RefDocNum = new(4, "Mã chứng từ tham chiếu");
            public static readonly ExcelColumn Supervisor = new(5, "Người phụ trách");
            public static readonly ExcelColumn Department = new(6, "Phòng ban (*)", true);
            public static readonly ExcelColumn Status = new(7, "Trạng thái");
            public static readonly ExcelColumn Step = new(8, "Bước quy trình");
            public static readonly ExcelColumn StepStatus = new(9, "Trạng thái bước");
            public static readonly ExcelColumn CreatedByUser = new(10, "Người tạo");
            public static readonly ExcelColumn CreatedDate = new(11, "Ngày tạo");

            public static readonly string[] Titles =
            [
                Code.Name, Date.Name, RefType.Name, RefDocNum.Name, Supervisor.Name,
                Department.Name, Status.Name, Step.Name, StepStatus.Name,
                CreatedByUser.Name, CreatedDate.Name
            ];

            public static readonly int[] RequiredIndexes = ExcelSchema.RequiredIndexes(Code, Date, Department);
        }

        // ── Sheet 2: Detail Columns ──────────────────────────────────────────
        public static class Details
        {
            public static readonly ExcelColumn MapCode = new(1, "Mã phiếu (*)", true);
            public static readonly ExcelColumn ItemCode = new(2, "Mã vật tư/dịch vụ (*)", true);
            public static readonly ExcelColumn ItemName = new(3, "Tên vật tư/dịch vụ");
            public static readonly ExcelColumn ProjectCode = new(4, "Mã dự án (*)", true);
            public static readonly ExcelColumn ProjectName = new(5, "Tên dự án");
            public static readonly ExcelColumn Quantity = new(6, "Số lượng (*)", true);
            public static readonly ExcelColumn UnitPrice = new(7, "Đơn giá");
            public static readonly ExcelColumn TotalAmount = new(8, "Thành tiền");
            public static readonly ExcelColumn Note = new(9, "Ghi chú");

            public static readonly string[] Titles =
            [
                MapCode.Name, ItemCode.Name, ItemName.Name, ProjectCode.Name, ProjectName.Name,
                Quantity.Name, UnitPrice.Name, TotalAmount.Name, Note.Name
            ];

            public static readonly int[] RequiredIndexes = ExcelSchema.RequiredIndexes(MapCode, ItemCode, ProjectCode, Quantity);
        }
    }
}
```

### Benefits of `ExcelSchema`
1. **Refactoring Safety**: Renaming column headers or changing column orders only requires updating `ExcelSchema`.
2. **Zero Magic Numbers**: Code uses `sheet.Cell(row, ExcelSchema.Details.ItemCode.Index)` instead of `sheet.Cell(row, 2)`.
3. **Automatic Validation**: `RequiredIndexes` instantly tells import validators which cells must not be empty.

---

## 3. Excel Export Pattern (`GenerateExportDataBytesAsync`)

### The Snapshot Advantage in Exports
> [!IMPORTANT]
> **PERFORMANCE RULE**: When exporting ticket data, **NEVER** execute N+1 synchronous queries or gRPC calls to lookup foreign entity names (Employees, Projects, Departments, UOMs).
> **Always read directly from the frozen snapshot columns** (`*CodeSnapshot`, `*NameSnapshot`)!
> Only query **live operational data** that changes over time (such as current WorkItem workflow step and status) in a single batch gRPC call.

### Backend Implementation Template

```csharp
using ClosedXML.Excel;
using CogainSolution.Grpc.MasterDataInfo;
using Microsoft.EntityFrameworkCore;
using Shared.Domain.Entities;
using System.Globalization;

namespace ServiceDesk.Services.Implement.SampleTicket;

public partial class SampleTicketService
{
    protected override string GetExportDataFileName()
        => $"PhieuYeuCau_Export_{DateTime.Now:yyyyMMddHHmmss}.xlsx";

    protected override async Task<byte[]> GenerateExportDataBytesAsync(AutoFilter parameters = null)
    {
        // 1. Query tickets with child details
        IQueryable<SampleTicketRequest> query = CreateBaseQuery("Details").AsNoTracking();
        query = ApplyAutoFilter(query, parameters);
        var requests = await query.ToListAsync();
        if (requests.Count == 0) return [];

        // 2. Batch query LIVE WorkItem workflow statuses from MasterData (single gRPC call)
        var ids = requests.Select(r => r.Id.ToString()).Distinct().ToList();
        var wiResponse = await _masterDataGrpcClient.GetWorkItemsByIdsAsync(new GetIdsRequest { Ids = { ids } });
        var wiMap = wiResponse?.Items?.ToDictionary(w => w.Id, w => w) ?? [];

        using var workbook = new XLWorkbook();

        // ── Sheet 1: Master / Header ─────────────────────────────────────────
        var hSheet = workbook.Worksheets.Add(ExcelSchema.HeaderSheet);
        WriteHeaderRow(hSheet, ExcelSchema.Header.Titles);

        int hRow = 2;
        foreach (var req in requests)
        {
            var wi = wiMap.TryGetValue(req.Id.ToString(), out var w) ? w : null;

            hSheet.Cell(hRow, ExcelSchema.Header.Code.Index).Value = req.Code ?? "";
            hSheet.Cell(hRow, ExcelSchema.Header.Date.Index).Value = req.Date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
            hSheet.Cell(hRow, ExcelSchema.Header.Supervisor.Index).Value = FormatSnapshot(req.SupervisorCodeSnapshot, req.SupervisorNameSnapshot);
            hSheet.Cell(hRow, ExcelSchema.Header.Department.Index).Value = FormatSnapshot(req.DepartmentCodeSnapshot, req.DepartmentNameSnapshot);
            hSheet.Cell(hRow, ExcelSchema.Header.Status.Index).Value = wi?.StatusName ?? "";
            hSheet.Cell(hRow, ExcelSchema.Header.Step.Index).Value = wi?.CurrentStepName ?? "";
            hSheet.Cell(hRow, ExcelSchema.Header.StepStatus.Index).Value = wi?.StepStatusName ?? "";
            hSheet.Cell(hRow, ExcelSchema.Header.CreatedByUser.Index).Value = req.CreatedByUser ?? "";
            hSheet.Cell(hRow, ExcelSchema.Header.CreatedDate.Index).Value = req.CreatedDate.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
            hRow++;
        }

        // ── Sheet 2: Child Details ───────────────────────────────────────────
        var dSheet = workbook.Worksheets.Add(ExcelSchema.DetailsSheet);
        WriteHeaderRow(dSheet, ExcelSchema.Details.Titles);

        int dRow = 2;
        foreach (var req in requests)
        {
            foreach (var d in req.Details ?? [])
            {
                dSheet.Cell(dRow, ExcelSchema.Details.MapCode.Index).Value = req.Code ?? "";
                dSheet.Cell(dRow, ExcelSchema.Details.ItemCode.Index).Value = d.ItemCodeSnapshot ?? "";
                dSheet.Cell(dRow, ExcelSchema.Details.ItemName.Index).Value = d.ItemNameSnapshot ?? "";
                dSheet.Cell(dRow, ExcelSchema.Details.ProjectCode.Index).Value = d.ProjectCodeSnapshot ?? "";
                dSheet.Cell(dRow, ExcelSchema.Details.ProjectName.Index).Value = d.ProjectNameSnapshot ?? "";
                dSheet.Cell(dRow, ExcelSchema.Details.Quantity.Index).Value = d.Quantity;
                dSheet.Cell(dRow, ExcelSchema.Details.UnitPrice.Index).Value = d.UnitPrice;
                dSheet.Cell(dRow, ExcelSchema.Details.TotalAmount.Index).Value = d.TotalAmount;
                dSheet.Cell(dRow, ExcelSchema.Details.Note.Index).Value = d.Note ?? "";
                dRow++;
            }
        }

        // Auto-fit column widths
        hSheet.Columns().AdjustToContents();
        dSheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static void WriteHeaderRow(IXLWorksheet sheet, string[] headers)
    {
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = sheet.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0070C0");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }
        sheet.Row(1).Height = 25;
    }

    private static string FormatSnapshot(string? code, string? name) =>
        (!string.IsNullOrWhiteSpace(code), !string.IsNullOrWhiteSpace(name)) switch
        {
            (true, true) => $"{code} - {name}",
            (true, false) => code ?? "",
            (false, true) => name ?? "",
            _ => ""
        };
}
```

---

## 4. Template Generation Pattern (`GetExportTemplateFileName`)

Generate a clean `.xlsx` template pre-filled with:
1. Header row using `ExcelSchema.Details.Titles`.
2. A sample row showing expected formats.
3. Lookup guide sheets (`Data_Project`, `Data_Item`) populated with active codes and names.

```csharp
protected override string GetExportTemplateFileName() => "PhieuYeuCau_ImportTemplate.xlsx";

public async Task<byte[]> GenerateImportTemplateBytesAsync()
{
    using var workbook = new XLWorkbook();

    // 1. Data Sheet
    var sheet = workbook.Worksheets.Add(ExcelSchema.DetailsSheet);
    WriteHeaderRow(sheet, ExcelSchema.Details.Titles);

    // Sample row
    sheet.Cell(2, ExcelSchema.Details.MapCode.Index).Value = "YC-2026-001";
    sheet.Cell(2, ExcelSchema.Details.ItemCode.Index).Value = "VT001";
    sheet.Cell(2, ExcelSchema.Details.ProjectCode.Index).Value = "DA001";
    sheet.Cell(2, ExcelSchema.Details.Quantity.Index).Value = 10;
    sheet.Cell(2, ExcelSchema.Details.Note.Index).Value = "Dòng mẫu";

    // 2. Guide sheet: Project catalog
    var prjSheet = workbook.Worksheets.Add(ExcelSchema.DataProjectSheet);
    WriteHeaderRow(prjSheet, ["Mã dự án", "Tên dự án"]);
    // Populate active projects...

    // 3. Guide sheet: Item catalog
    var itemSheet = workbook.Worksheets.Add(ExcelSchema.DataItemSheet);
    WriteHeaderRow(itemSheet, ["Mã vật tư", "Tên vật tư"]);
    // Populate active items...

    sheet.Columns().AdjustToContents();
    prjSheet.Columns().AdjustToContents();
    itemSheet.Columns().AdjustToContents();

    using var ms = new MemoryStream();
    workbook.SaveAs(ms);
    return ms.ToArray();
}
```

---

## 5. Excel Import Pattern (`CustomParseExcelToDtosAsync`)

`BaseService` provides built-in hooks for parsing, pre-loading references, and validating Excel files.

### 1. `CustomParseExcelToDtosAsync` (Parsing with ClosedXML & `ExcelSchema`)
```csharp
protected override async Task<Result<IEnumerable<CreateSampleTicketDetailDto>>> CustomParseExcelToDtosAsync(
    Stream stream, string fileName)
{
    try
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.FirstOrDefault(x => x.Name == ExcelSchema.DetailsSheet) 
                    ?? workbook.Worksheets.FirstOrDefault();

        if (sheet == null)
            return Result<IEnumerable<CreateSampleTicketDetailDto>>.Failure("File không có sheet dữ liệu.");

        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        if (lastRow < 2)
            return Result<IEnumerable<CreateSampleTicketDetailDto>>.Failure("File không có dòng dữ liệu nào.");

        var list = new List<CreateSampleTicketDetailDto>();

        for (int r = 2; r <= lastRow; r++)
        {
            var itemCode = sheet.Cell(r, ExcelSchema.Details.ItemCode.Index).GetString().Trim();
            var prjCode = sheet.Cell(r, ExcelSchema.Details.ProjectCode.Index).GetString().Trim();
            var qtyStr = sheet.Cell(r, ExcelSchema.Details.Quantity.Index).GetString().Trim();
            var unitPriceStr = sheet.Cell(r, ExcelSchema.Details.UnitPrice.Index).GetString().Trim();
            var note = sheet.Cell(r, ExcelSchema.Details.Note.Index).GetString().Trim();

            // Ignore blank rows
            if (string.IsNullOrEmpty(itemCode) && string.IsNullOrEmpty(prjCode)) continue;

            if (!decimal.TryParse(qtyStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty) || qty <= 0)
            {
                return Result<IEnumerable<CreateSampleTicketDetailDto>>.Failure(
                    $"Dòng {r}: Số lượng '{qtyStr}' không hợp lệ (phải là số dương).");
            }

            decimal.TryParse(unitPriceStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var unitPrice);

            list.Add(new CreateSampleTicketDetailDto
            {
                ItemCode = itemCode,
                ProjectCode = prjCode,
                Quantity = qty,
                UnitPrice = unitPrice,
                Note = note
            });
        }

        return Result<IEnumerable<CreateSampleTicketDetailDto>>.Success(list);
    }
    catch (Exception ex)
    {
        _logger.Error(ex, "Lỗi parse file Excel");
        return Result<IEnumerable<CreateSampleTicketDetailDto>>.Failure($"Lỗi đọc file: {ex.Message}");
    }
}
```

### 2. `LoadImportReferencesAsync` (Batch Pre-loading Lookups)
> [!TIP]
> **NEVER query in a loop!** Pre-load all referenced Codes into in-memory dictionaries in a single batch query.

```csharp
private Dictionary<string, Guid> _itemMap = new(StringComparer.OrdinalIgnoreCase);
private Dictionary<string, Guid> _prjMap = new(StringComparer.OrdinalIgnoreCase);

protected override async Task LoadImportReferencesAsync(IEnumerable<CreateSampleTicketDetailDto> dtos)
{
    var list = dtos.ToList();
    if (list.Count == 0) return;

    var itemCodes = list.Select(x => x.ItemCode).Distinct().ToArray();
    var prjCodes = list.Select(x => x.ProjectCode).Distinct().ToArray();

    // Query external microservices or local DB in batch
    _itemMap = await _unitOfWork.GetRepository<Item>().Query().AsNoTracking()
        .Where(x => itemCodes.Contains(x.Code))
        .ToDictionaryAsync(x => x.Code, x => x.Id, StringComparer.OrdinalIgnoreCase);

    _prjMap = await _unitOfWork.GetRepository<Project>().Query().AsNoTracking()
        .Where(x => prjCodes.Contains(x.Code))
        .ToDictionaryAsync(x => x.Code, x => x.Id, StringComparer.OrdinalIgnoreCase);
}
```

### 3. `ValidateImportDtosAsync` (Row-by-Row Validation)
Return explicit, user-friendly error messages that pinpoint the exact row number and field:

```csharp
protected override Task<List<string>> ValidateImportDtosAsync(IEnumerable<CreateSampleTicketDetailDto> dtos)
{
    var errors = new List<string>();
    int row = 2;

    foreach (var dto in dtos)
    {
        if (string.IsNullOrEmpty(dto.ItemCode))
            errors.Add($"Dòng {row}: Thiếu Mã vật tư/dịch vụ.");
        else if (!_itemMap.ContainsKey(dto.ItemCode))
            errors.Add($"Dòng {row}: Mã vật tư '{dto.ItemCode}' không tồn tại trong hệ thống.");

        if (string.IsNullOrEmpty(dto.ProjectCode))
            errors.Add($"Dòng {row}: Thiếu Mã dự án.");
        else if (!_prjMap.ContainsKey(dto.ProjectCode))
            errors.Add($"Dòng {row}: Mã dự án '{dto.ProjectCode}' không tồn tại.");

        row++;
    }

    return Task.FromResult(errors);
}
```

---

## 6. Frontend Integration

### 1. Export Trigger (List Toolbar)
In `routes/_app/<ticket>/index.tsx`:
```tsx
const handleExportData = async () => {
  try {
    const res = await sampleTicketService.exportData(currentFilters);
    if (res.data) {
      // res.data contains the uploaded FTP file URL
      window.open(res.data, '_blank');
    }
  } catch (error) {
    toast.error('Lỗi khi xuất file Excel');
  }
};
```

### 2. Client-Side Detail Import into Child Table
When users want to populate the child lines of a ticket directly from an Excel file before saving:
```tsx
import * as XLSX from 'xlsx';

const handleImportExcelToGrid = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet);

  const importedDetails = jsonRows.map((row) => ({
    itemId: row['Mã vật tư/dịch vụ'] || '',
    projectId: row['Mã dự án'] || '',
    quantity: Number(row['Số lượng']) || 1,
    unitPrice: Number(row['Đơn giá']) || 0,
    note: row['Ghi chú'] || '',
  }));

  // Append or replace rows in useFieldArray
  append(importedDetails);
};
```
