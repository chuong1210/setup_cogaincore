# Kế hoạch triển khai: Tối ưu popup Chọn cụm nhập kho, ngăn chặn duplicate, hiển thị Model và chuẩn hoá Toolbar

## Mô tả mục tiêu & Vấn đề cần giải quyết
1. **Kích thước Form/Dialog**: Popup "Chọn cụm nhập kho thành phẩm" (`PackingSelectionDialog`) và "Chi tiết cụm đóng kiện" (`PackingDetailViewDialog`) hiện bị thu nhỏ (`sm:max-w-lg` từ default `DialogContent` ghi đè CSS responsive). Cần mở rộng chiếm trọn không gian màn hình (`sm:max-w-[96vw]`, chiều cao 92vh).
2. **Nút con mắt 👁️ xem chi tiết cụm đóng kiện**: Đưa nút con mắt vào trực tiếp cột "Mã / Tên Packing List Cơ Khí" của từng dòng cụm nhập kho để xem nhanh chi tiết từng cụm. Đồng thời hỗ trợ tự động tải chi tiết nếu mảng `details` trống nhưng có `mechanicalPackingListId`.
3. **Ngăn chặn Duplicate Packing List bằng HashMap**:
   - Khi mở popup Chọn cụm, tự động lọc bỏ các cụm đã tồn tại trong bảng (so khớp cả ID và Mã Packing List qua HashMap).
   - Khi bấm "Thêm đã chọn", tại hàm `onSelect`, kiểm tra HashMap chặt chẽ một lần nữa trước khi `append` để tuyệt đối không cho phép trùng lặp.
4. **Hiển thị 2 cột Model thiết kế & Model hiệu suất**:
   - Backend `MasterDataInfoGrpcService.cs`: Sửa lỗi Linq Npgsql `x.Id.ToString()` trong SQL projection của `GetFinishedGoodModelsByIds`, tách truy vấn SQL và ánh xạ bộ nhớ để gRPC enrich Model snapshot thành công 100%.
   - Backend `InstallationOrderService.cs`: Cải tiến cơ chế enrich Model snapshot (hỗ trợ dictionary lookup case-insensitive và chuẩn hoá chuỗi GUID).
   - Frontend (`packing-selection-dialog.tsx`, `packings-tab.tsx`, `use-fk-lookup.ts`): Cải tiến cell hiển thị Model thiết kế & Model hiệu suất, kết hợp đa tầng: snapshot trả về → `itpMap` từ tab Thành phẩm → `useFkLookup` API fallback.
5. **Chuẩn hoá Toolbar Tab (Chuyển nút Thêm / Lưu tab lên Header Toolbar)**:
   - Di chuyển nút `[+ Chọn cụm nhập kho]`, `[+ Thêm dòng rỗng]`, `[Lưu tab]` từ `toolbarProps.actions` của `ResizableWrapTable` sang `setToolbar?.(...)` ở header tab, đồng bộ hoàn toàn với `finished-goods-tab.tsx` và `processes-tab.tsx`.
   - `toolbarProps` của `ResizableWrapTable` chỉ giữ ô tìm kiếm và số lượng bản ghi.

---

## User Review Required
> [!IMPORTANT]
> - Backend: Sửa lỗi Linq projection trong gRPC `GetFinishedGoodModelsByIds` của `MasterData` và cơ chế enrich tại `InstallationOrderService`. Không chạy database migration theo General Project Rules.
> - Frontend: Tuân thủ nghiêm ngặt quy tắc Zero Hardcoded Text (`useTranslation`), không dùng `any`, sử dụng component chuẩn của dự án (`Button`, `ResizableWrapTable`, `DialogContent`).

---

## Proposed Changes

### 1. Backend: Sửa gRPC MasterData & Enrich Snapshot Model trong InstallationOrderService

#### [MODIFY] [MasterDataInfoGrpcService.cs](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/src/Services/MasterData/MasterData.API/GrpcServices/MasterDataInfoGrpcService.cs)
- Sửa `GetFinishedGoodModelsByIds`:
  ```csharp
  var rawItems = await repo.Query()
      .Where(x => ids.Contains(x.Id))
      .Select(x => new { x.Code, x.Id, x.Name })
      .ToListAsync();

  var items = rawItems
      .Select(x => new CodeIdPair { Code = x.Code ?? "", Id = x.Id.ToString(), Name = x.Name ?? "" })
      .ToList();
  ```
  Tránh lỗi `The LINQ expression 'x.Id.ToString()' could not be translated` trên Npgsql.

#### [MODIFY] [InstallationOrderService.cs](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/src/Services/ServiceDesk/ServiceDesk.Services/Implement/Production/InstallationOrderService.cs)
- Cải thiện `EnrichModelsAndFinishedGoodsFromMasterDataAsync`: Xây dựng dictionary tra cứu Model cả theo format GUID có gạch ngang và không gạch ngang (`"D"` và `"N"`), tránh miss do định dạng GUID.
- `MapToEligiblePackingDto`: Fallback chuỗi rỗng sang `MechanicalPackingList` snapshot.

---

### 2. Frontend Shared: Hoàn thiện case-insensitive cho `useFkLookup`

#### [MODIFY] [use-fk-lookup.ts](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/hooks/use-fk-lookup.ts)
- Bổ sung `map.set(item.id.toLowerCase(), item)` và `getInfo: (id) => map.get(id) || map.get(id.toLowerCase())` để tra cứu FK ID không phân biệt chữ hoa / thường.

---

### 3. Frontend Bizdoc: Dialog Size, Duplicate HashMap, Model Columns, Eye Detail View

#### [MODIFY] [packing-selection-dialog.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-order/-components/installation-detail-tab/packing-selection-dialog.tsx)
- Cập nhật `DialogContent`:
  `className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-[95vw] lg:max-w-[92vw] xl:max-w-[1500px] h-[90vh] max-h-[92vh] flex flex-col p-6 overflow-hidden"`
- HashMap lọc bỏ hoàn toàn các cụm đã tồn tại trong form:
  - Tự động lấy trực tiếp `form.getValues('packings')` kết hợp với `existingPackingIds` và `existingPackingCodes`.
  - Danh sách bảng hiển thị lọc bỏ (`filter(!isAlreadyAdded)`) hoặc vô hiệu hóa triệt để để người dùng không bao giờ chọn trùng.
  - Hiển thị badge / text thông báo số lượng cụm khả dụng và số lượng đã thêm.
- Cột Model thiết kế & Model hiệu suất:
  - Hiển thị `name || code || '—'`, fallback theo thứ tự: snapshot → `itpMap` → `fk.model.getInfo(id)`.

#### [MODIFY] [packing-detail-view-dialog.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-order/-components/installation-detail-tab/packing-detail-view-dialog.tsx)
- Cập nhật `DialogContent`:
  `className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-[95vw] lg:max-w-[92vw] xl:max-w-[1500px] h-[90vh] max-h-[92vh] flex flex-col p-6 overflow-hidden"`
- Hỗ trợ prop `mechanicalPackingListId`: Tự động gọi `mechanicalPackingListService.getById` nếu danh sách `details` rỗng để đảm bảo luôn hiển thị đầy đủ chi tiết đóng kiện.

#### [MODIFY] [packings-tab.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-order/-components/installation-detail-tab/packings-tab.tsx)
- Nhận các props: `canAddDetail`, `canSaveTab`, `onSaveTab`, `isSavingTab`, `setToolbar`.
- Tạo `useEffect` gắn toolbar lên Header:
  - Nút `[+ Chọn cụm nhập kho]`
  - Nút `[+ Thêm dòng rỗng]`
  - Nút `[Lưu tab]` (khi `canSaveTab && onSaveTab`)
- Xóa bỏ `actions` khỏi `toolbarProps` của `ResizableWrapTable` (chỉ để ô tìm kiếm và số lượng bản ghi như yêu cầu của user).
- Cột "Mã / Tên Packing List Cơ Khí": Đặt nút con mắt 👁️ xem chi tiết rõ ràng, bấm mở `PackingDetailViewDialog`.
- Cột "Model thiết kế" & "Model hiệu suất": Hiển thị linh hoạt `name || code || '—'`.
- Hàm `onSelect`: Áp dụng HashMap toàn diện (so khớp `mechanicalPackingListCodeSnapshot`, `mechanicalPackingListId`, `id`) trước khi `append`.

#### [MODIFY] [installation-order-detail-table.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-order/-components/installation-order-detail-table.tsx)
- Thêm `onSavePackingsTab`, `isSavingPackingsTab` vào `SubTabsProps`.
- Truyền `canAddDetail`, `isReadOnly`, `canSaveTab`, `onSaveTab={onSavePackingsTab}`, `isSavingTab={isSavingPackingsTab}`, `setToolbar={setActiveTabToolbar}` vào `<InstallationOrderPackingsTab />`.

#### [MODIFY] [use-installation-order.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-order/-hooks/use-installation-order.tsx)
- Bổ sung `updatePackingsTabMutation` gọi `installationOrderService.updatePackingsTab(id, data)`.

#### [MODIFY] [installation-order-form.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-order/-components/installation-order-form.tsx)
- Tạo callback `handleSavePackingsTab` gọi `updatePackingsTabMutation.mutateAsync`.
- Truyền `onSavePackingsTab={handleSavePackingsTab}` và `isSavingPackingsTab={updatePackingsTabMutation.isPending}` xuống `InstallationOrderSubTabs`.

---

## Verification Plan

### Automated Tests / Type Checking
1. Kiểm tra build backend:
   ```powershell
   dotnet build backend/src/Services/MasterData/MasterData.API/MasterData.API.csproj
   dotnet build backend/src/Services/ServiceDesk/ServiceDesk.API/ServiceDesk.API.csproj
   ```
2. Kiểm tra TypeScript toàn bộ frontend:
   ```powershell
   pnpm --filter bizdoc tsc --noEmit
   ```

### Manual Verification
1. Mở Lệnh lắp đặt, chuyển sang tab "Cụm thành phẩm":
   - Xác nhận thanh toolbar trên đầu tab xuất hiện các nút `[+ Chọn cụm nhập kho]`, `[+ Thêm dòng rỗng]`, `[Lưu tab]`.
   - Xác nhận bảng bên dưới thanh toolbar chỉ còn thanh tìm kiếm.
2. Bấm `[+ Chọn cụm nhập kho]`:
   - Xác nhận form popup to rộng (`sm:max-w-[96vw]`, 90vh), bảng rộng rãi hiển thị đầy đủ các cột không bị bóp nghẹt.
   - Xác nhận 2 cột "Model thiết kế" và "Model hiệu suất" hiển thị đầy đủ tên / mã Model.
   - Tích chọn một số cụm và bấm "Thêm đã chọn".
   - Mở lại popup "Chọn cụm nhập kho": xác nhận các cụm đã thêm không còn cho phép chọn lại hoặc đã được ẩn đi, không bị duplicate.
3. Trên bảng tab "Cụm thành phẩm":
   - Cột "Mã / Tên Packing List Cơ Khí" có icon con mắt 👁️ xem chi tiết.
   - Bấm vào icon con mắt: Form chi tiết mở to rộng và hiển thị đầy đủ danh sách các bộ phận, quy cách, kích thước của cụm đóng kiện.
