# Tổng Kết Tối Ưu Hóa Giao Diện Packing List Report

## 1. Nội Dung Đã Hoàn Thành

### A. Tối ưu tiêu đề thẻ Thành phẩm & Đồng bộ Font chữ (Theo yêu cầu mới nhất)
1. **Làm gọn khối thông tin bên trái của Card Header ([`packing-list-report-expand-item.tsx`](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/logistic/packing-list-report/_components/packing-list-report-expand-item.tsx))**:
   - Định dạng chuẩn: **`Tên TP - Tên model thiết kế - Tên model`**.
   - Bỏ toàn bộ các chip/tag lặp lại và nhãn thừa ("Model:", "Model TK:").
   - Hiển thị trên 1 hàng duy nhất, gọn gàng, thanh thoát với vạch màu thương hiệu `bg-primary` và số thứ tự `stt`.
2. **Loại bỏ hoàn toàn `font-mono` (Dùng 1 font chữ duy nhất)**:
   - Đã gỡ bỏ toàn bộ class `font-mono` khỏi:
     - Header của từng thẻ thành phẩm.
     - Thanh KPI tổng thể ([`packing-list-summary-bar.tsx`](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/logistic/packing-list-report/_components/packing-list-summary-bar.tsx)).
     - Cột và ô bảng chi tiết ([`packing-list-report-columns.tsx`](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/logistic/packing-list-report/_components/packing-list-report-columns.tsx)).
   - Giữ lại `tabular-nums` để các con số căn gióng thẳng hàng ngay ngắn mà không biến dạng font.

---

### B. Thanh điều khiển danh sách & Nút Expand All / Collapse All chuyên biệt
1. **Vị trí trực quan**:
   - Bố trí ngay trên danh sách thẻ thành phẩm ([`index.tsx`](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/logistic/packing-list-report/index.tsx)), đồng bộ với phong cách của `GoodsIssueReceiptRequestAcceptanceSection`.
2. **Tính năng**:
   - Nút **Mở rộng tất cả / Thu gọn tất cả** (`ChevronsUpDown` / `ChevronsDownUp`).
   - Nút **Cột hiển thị** (Popover chọn nhóm cột).
   - Bộ đếm: `X / Y nhóm · Z kiện`.
3. **Thanh lọc phụ**:
   - Chỉ tập trung cho lọc nhanh, không còn bị chật chội.

---

## 2. Kết Quả Kiểm Thử (Verification)
- **TypeScript Check**: `pnpm tsc --noEmit` hoàn thành với mã thoát **0** (0 lỗi type).
- **Grep Check font-mono**: Không còn class `font-mono` nào tồn tại trong toàn bộ thư mục `packing-list-report`.
- **Grep Check em-dash**: Không còn ký tự `—` nào trong code hay text hiển thị.
