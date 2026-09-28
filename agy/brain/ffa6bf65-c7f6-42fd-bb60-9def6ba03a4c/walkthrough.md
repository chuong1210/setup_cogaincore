# Báo cáo sửa lỗi: QC Đánh giá & Hiển thị 16 cột Chi tiết Nghiệm thu Lắp đặt

## 1. Nguyên nhân các lỗi đã xử lý

### Lỗi 1: `"Invalid input: expected string, received number. qc đánh giá nhập số rồi mà nó vẫn lỗi và lỗi hiện thị nó kì quá"`
- **Nguyên nhân gốc rễ:**
  - Trong component `QcResultDialog` (`qc-result-dialog.tsx`), schema validation Zod ban đầu định nghĩa `damageQty: z.string().optional()` và `damageValue: z.string().optional()`.
  - Tuy nhiên, component `<NumericInput />` từ `@shared/ui` khi người dùng nhập số sẽ gọi `onValueChange` truyền giá trị kiểu `number` (`val`).
  - Do React Hook Form nhận giá trị `number` trong khi Zod schema chỉ chấp nhận `string`, Zod lập tức ném ra lỗi mặc định bằng tiếng Anh: **`Invalid input: expected string, received number.`**
  - Giao diện trước đây hiển thị cả 2 ô "Số lượng thiệt hại" và "Giá trị thiệt hại" ngay cả khi chọn hình thức "Sửa chữa" (vốn không phát sinh hủy phôi hay chi phí phế phẩm), gây khó hiểu cho người thao tác.
- **Giải pháp xử lý:**
  - Cập nhật Zod schema sang `z.union([z.number(), z.string()]).nullish()`, đồng thời parse dữ liệu qua `Number(...)` trong hàm `superRefine`.
  - Tách biệt rõ ràng giao diện:
    - **Khi chọn "Chế tạo lại":** Hiển thị khối màu đỏ nổi bật với cảnh báo rõ ràng, bắt buộc nhập số lượng và giá trị thiệt hại, validate với thông báo tiếng Việt cụ thể (`Vui lòng nhập số lượng thiệt hại lớn hơn 0`).
    - **Khi chọn "Sửa chữa":** Ẩn các ô chi phí thiệt hại, tự động reset giá trị và hiển thị thẻ thông báo màu vàng nhạt giải thích rõ chi tiết sẽ được chuyển về tổ lắp đặt sửa chữa theo quy trình, không tính chi phí phế phẩm.
  - Đồng bộ sửa lỗi tương tự tại component `qc-result-dialog.tsx` của các phân hệ nghiệm thu sản xuất (`acceptance-minute`) và bảo trì (`maintenance-acceptance-minute`).

---

### Lỗi 2: `"và vào detail nó ko hiện mấy cột dù bên ngoài có STT, BTP, Model hiệu suất, Trừ trọng lượng, Tiêu chuẩn, Tổ lắp đặt, Đơn giá khoán, ĐVT, SL (Theo TK), SL thực tế, Trọng lượng (kg), Tỷ lệ, Xác nhận, Mô tả kỹ thuật, Nguồn nhân công, QC đánh giá"`
- **Nguyên nhân gốc rễ:**
  - Trong hook cấu hình cột chi tiết [useInstallationAcceptanceDetailColumns](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-acceptance-minute/-hooks/use-installation-acceptance-detail-columns.tsx), 5 cột gồm:
    1. `actualQty` (SL thực tế)
    2. `weight` (Trọng lượng (kg))
    3. `rate` (Tỷ lệ)
    4. `isConfirm` (Xác nhận)
    5. `qcResult` (QC đánh giá)
    đã bị bọc bên trong điều kiện `...(currentStepOrder >= 2 ? [...] : [])`.
  - Khi người dùng vào trang chi tiết phiếu (`$id/detail.tsx`), nếu phiếu đang ở bước 0 hoặc 1 (`currentStepOrder < 2`), cả 5 cột trên bị ẩn hoàn toàn, khiến bảng chi tiết chỉ còn 11 cột thay vì 16 cột.
- **Giải pháp xử lý:**
  - Loại bỏ hoàn toàn điều kiện `currentStepOrder >= 2` trong [use-installation-acceptance-detail-columns.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-acceptance-minute/-hooks/use-installation-acceptance-detail-columns.tsx).
  - Đồng bộ danh sách 16 cột trên bảng mở rộng chi tiết ở trang danh sách [index.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-acceptance-minute/index.tsx) theo đúng thứ tự chuẩn hóa:
    1. `lineNum` / `stt` (STT)
    2. `productOrSemi` (BTP)
    3. `semiFinishedGoodModel` (Model hiệu suất)
    4. `isBaseOnQty` (Trừ trọng lượng)
    5. `productionStandard` (Tiêu chuẩn)
    6. `productionTeam` (Tổ lắp đặt)
    7. `productionCostName` (Đơn giá khoán)
    8. `uom` (ĐVT)
    9. `designedQty` (SL (Theo TK))
    10. `actualQty` (SL thực tế)
    11. `weight` (Trọng lượng (kg))
    12. `rate` (Tỷ lệ)
    13. `isConfirm` (Xác nhận)
    14. `technicalDescription` (Mô tả kỹ thuật)
    15. `manufacturingMethod` (Nguồn nhân công)
    16. `qcResult` (QC đánh giá)

---

## 2. Kết quả kiểm thử & xác thực

1. **TypeScript compilation (Frontend):**
   - Lệnh: `pnpm --filter bizdoc exec tsc --noEmit`
   - Kết quả: **Thành công (0 lỗi, exit code 0)**.

2. **Backend build (.NET):**
   - Lệnh: `dotnet build backend/src/Services/ServiceDesk/ServiceDesk.Data/ServiceDesk.Data.csproj`
   - Kết quả: **Build succeeded (0 Warning, 0 Error)**.
