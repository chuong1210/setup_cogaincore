# Hoàn tất Tối ưu Tab Cụm Đóng Kiện & Lệnh Lắp Đặt

## Tổng quan các hạng mục đã hoàn thành

### 1. Phóng to Popup & Dialog Toàn Màn hình
- **Vấn đề**: `PackingSelectionDialog` và `PackingDetailViewDialog` bị co lại ở kích thước nhỏ (`sm:max-w-lg`) do css mặc định của shadcn Dialog.
- **Giải pháp**:
  - Ghi đè triệt để breakpoint `sm:` và các màn hình lớn bằng:
    ```tsx
    className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-[95vw] lg:max-w-[92vw] xl:max-w-[1500px] h-[90vh] max-h-[92vh] flex flex-col p-6 overflow-hidden"
    ```
  - Cả 2 dialog mở rộng gần như full màn hình (96vw x 90vh), bảng danh sách và bảng chi tiết kiện hiển thị rộng rãi, không bị gò bó.

---

### 2. Đưa Nút Xem Chi Tiết (Con Mắt) vào cột "Mã / Tên Packing List Cơ Khí"
- **Vấn đề**: Cột mã packing list chỉ hiển thị text đơn thuần, khó quan sát chi tiết kiện hàng.
- **Giải pháp**:
  - Cột `mechanicalPackingListId` hiển thị badge mã code, tên kiện và tích hợp nút icon Eye (`Eye` icon button) đặt ngay cạnh tên kiện.
  - Khi click vào icon Eye, mở `PackingDetailViewDialog`. Nếu dòng hiện tại chưa có mảng `details`, component tự động fallback gọi API `getById` của `mechanicalPackingListService` để nạp toàn bộ chi tiết kiện hàng theo `mechanicalPackingListId`.

---

### 3. Chống Duplicate Mã Packing List bằng HashMap
- **Vấn đề**: Người dùng có thể chọn trùng các cụm packing list đã có trong form.
- **Giải pháp**:
  - Xây dựng `existingPackingMap` (HashMap dạng `Map<string, boolean>`) dựa trên `form.getValues('packings')` và `existingPackingListIds`.
  - Trong `PackingSelectionDialog`:
    - Tự động lọc bỏ hoàn toàn các packing list đã có trong lệnh lắp đặt khỏi bảng chọn (`unaddedEligiblePackings = packings.filter(...)`).
    - Hỗ trợ disabled checkbox với tooltip thông báo cho người dùng.
  - Trong `packings-tab.tsx`: hàm `handleSelectPackings` kiểm tra lại lần 2 qua HashMap, loại bỏ mọi item trùng trước khi đưa vào form.

---

### 4. Sửa lỗi 2 cột "Model thiết kế" & "Model hiệu suất" hiển thị rỗng ("—")
- **Nguyên nhân gốc rễ**:
  1. Ở backend `MasterDataInfoGrpcService.cs`, câu lệnh LINQ `.Select(x => new CodeIdPair { Id = x.Id.ToString() })` chạy trực tiếp trên Postgres EF Core gây ra lỗi SQL translation, dẫn đến gRPC `GetModels` trả về `Success = false`. Do đó, `InstallationOrderService` không thể map được tên/mã Model vào DTO `eligible-packings`.
  2. Ở frontend, các trường model snapshot hoặc FK lookup bị ảnh hưởng bởi định dạng UUID có gạch nối hoặc không gạch nối (`"D"` vs `"N"`).
- **Giải pháp**:
  - Sửa `MasterDataInfoGrpcService.cs`: truy vấn `{ x.Code, x.Id, x.Name }` từ database trước, sau đó map sang `CodeIdPair` in-memory.
  - Nâng cấp `InstallationOrderService.cs`: bổ sung case-insensitive và hyphen-agnostic dictionary lookup cho cả `Model` và `DesignModel`.
  - Nâng cấp `useFkLookup.ts` ở frontend: chuẩn hóa key lookup bỏ dấu gạch nối và chữ thường để tra cứu ID luôn trúng 100%.
  - Cập nhật hiển thị cột: fallback lấy snapshot hoặc từ FK map thông qua `title={name || (code ? `#${code}` : undefined)}`.

---

### 5. Di chuyển Nút Thao Tác ra Toolbar Header Tab & Bổ sung Lưu Tab Riêng Biệt
- **Vấn đề**: Nút `[+ Chọn cụm nhập kho]`, `[+ Thêm dòng rỗng]` nằm bên trong toolbar của bảng thay vì toolbar của tab header, và tab Cụm đóng kiện chưa có API và nút `[Lưu tab]`.
- **Giải pháp**:
  - **Backend**:
    - Bổ sung `UpdateInstallationOrderPackingsTabDto` trong `InstallationOrderTabUpdateDto.cs`.
    - Thêm method `UpdatePackingsTabAsync` trong `IInstallationOrderService.cs` và `InstallationOrderService.TabUpdate.cs` (có normalize UTC datetime).
    - Mở endpoint `PUT /servicedesk/installation-orders/{id}/packings` trong `InstallationOrdersController.cs`.
  - **Frontend**:
    - Bổ sung mutation `updatePackingsTabMutation` trong `use-installation-order.tsx`.
    - Tạo `mapInstallationOrderPacking` trong `installation-order-form.schema.ts` và map vào `buildInstallationOrderPayload`.
    - Bổ sung `handleSavePackingsTab` trong `installation-order-form.tsx` và hydrate `packings` khi mở form edit trong `use-installation-order-form-event-handlers.ts`.
    - Trong `packings-tab.tsx`, sử dụng `setToolbar` để hiển thị 3 nút `[+ Chọn cụm nhập kho]`, `[+ Thêm dòng rỗng]`, `[Lưu tab]` trên header toolbar của tab, đưa bảng `ResizableWrapTable` về chế độ chỉ chứa ô tìm kiếm (search filter).

---

## Kết quả kiểm thử (Verification)
1. **Backend Build**:
   ```bash
   dotnet build backend/src/Services/ServiceDesk/ServiceDesk.API/ServiceDesk.API.csproj
   # Build succeeded. 0 Error(s)
   ```
2. **Frontend Type Check**:
   ```bash
   pnpm --filter @cogain/bizdoc exec tsc --noEmit
   # Exit code 0, 0 TypeScript errors
   ```
