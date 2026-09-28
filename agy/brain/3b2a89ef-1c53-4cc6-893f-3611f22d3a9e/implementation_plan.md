# Phân Tích Cấu Trúc Giao Diện & Kế Hoạch Tối Ưu Hóa Giao Diện Packing List Report (Anti-Slop)

## 1. Phân Tích Cấu Trúc Giao Diện Hiện Tại

### A. Giao diện `production-team-acceptance-report`
- **Mục đích & Ngữ cảnh**: Màn hình báo cáo tổng hợp nghiệm thu sản xuất theo tổ hoặc theo biên bản.
- **Kiến trúc bố cục**:
  1. **Bộ lọc Top**: Sử dụng `Card` có thể thu gọn (`isExpanded`), bên ngoài hiển thị các tag tóm tắt bộ lọc (`filterSummaryTags`) kèm nút xóa nhanh `X`.
  2. **Bộ lọc phân tầng (Cascaded Filters)**: Tích hợp `WorkItemCascadeFilters` cho chuỗi quan hệ: `Dự án` -> `Mã LSX` -> `Biên bản NT`.
  3. **Bộ lọc chi tiết**: Sử dụng `ComboboxWithFilters` (ITP, Model), `Input` (Mã SAP cũ), `Combobox` (Tổ), `NumericInput` + `Combobox` (Kỳ lương Tháng/Năm).
  4. **Chế độ xem đa góc nhìn (Tabs)**:
     - **Tab 1 - Xem theo biên bản (`EReportType.Minute`)**: Bảng `CustomTable` dạng master-detail. Cột đầu tiên là `expander` để bung rộng (`renderSubComponent`) bảng con chi tiết nghiệm thu bên dưới từng dòng biên bản.
     - **Tab 2 - Xem theo tổ (`EReportType.Team`)**: Danh sách các Card accordion độc lập (`TeamExpandItem`). Mỗi tổ là 1 card gồm STT, Mã/Tên tổ, Kỳ lương, Tổng thành tiền nổi bật với `text-primary font-bold`. Khi bấm vào sẽ mở bảng chi tiết `CustomTable` (tableMinWidth 2200px) bên trong nền `bg-muted/10`.
- **Ưu điểm**:
  - Phân tách rõ ràng giữa tổng quan và chi tiết.
  - Phù hợp cho báo cáo tài chính / nghiệm thu nhiều cấp.
- **Nhược điểm cần tránh**:
  - Ở Tab 2 (theo tổ), từng `TeamExpandItem` tự quản lý state `isExpanded` nội bộ độc lập, không có nút điều khiển chung "Mở rộng tất cả / Thu gọn tất cả" (Expand/Collapse All) ở cấp trang, khiến người dùng phải bấm từng card bằng tay nếu muốn xem hết.

---

### B. Giao diện `GoodsIssueReceiptRequest` (`AcceptanceSection` & `GoodsIssueReceiptRequestDetailTable`)
- **Mục đích & Ngữ cảnh**: Màn hình chi tiết phiếu đề nghị xuất kho hàng hóa. Phần chi tiết gồm 2 tab: Đóng kiện (`packing`) và Nghiệm thu công đoạn (`acceptance`).
- **Kiến trúc `GoodsIssueReceiptRequestAcceptanceSection`**:
  1. **Nút Expand All / Collapse All chuẩn mực**:
     - Nằm ngay đầu danh sách: `{minutes.length > 1 && (<div className="flex justify-end"><Button variant="ghost" size="sm" onClick={...}>...)}`.
     - Dùng icon trực quan: `ChevronsUpDown` (Mở rộng tất cả) và `ChevronsDownUp` (Thu gọn tất cả).
     - State quản lý tập trung bằng `Set<string>` lưu danh sách IDs đang mở, tự động reset khi danh sách thay đổi qua `ref`.
  2. **Cấu trúc Card Công đoạn / Biên bản nghiệm thu**:
     - Header là nút bấm toàn hàng (`button w-full flex items-center justify-between`) với hover nhẹ `hover:bg-muted/40`.
     - Điểm nhấn thị giác (Visual Accent) dứt khoát: Thanh dọc màu thương hiệu `<span className="h-4 w-1.5 shrink-0 rounded-full bg-primary" />`.
     - Tên công đoạn in đậm, mã công đoạn phụ mờ, mã biên bản đặt trong pill badge `bg-primary/5 text-primary ring-1 ring-inset ring-primary/20`.
     - Phía bên phải: Hiển thị số lượng chi tiết (`{count} chi tiết`) và biểu tượng `ChevronUp`/`ChevronDown`.
  3. **Bảng chi tiết `GoodsIssueReceiptRequestDetailTable` & `PackingListGoodsIssueReceiptRequestDetailTable`**:
     - Sử dụng chuẩn `ResizableWrapTable` của hệ thống.
     - Tích hợp `toolbarProps` mạnh mẽ: Tìm kiếm văn bản tức thời (Debounce 300ms) kết hợp Popover lọc đa cột linh hoạt (`renderFilterContent`).
     - Badge trạng thái gọn gàng, có chấm tròn màu nhận diện (Dot indicator) đại diện cho trạng thái Nhập đủ / Chưa đủ / Chưa nhập.

---

### C. Đánh giá hiện trạng `packing-list-report` & Các điểm "AI Slop" cần loại bỏ

| Vấn đề hiện tại | Biểu hiện AI Slop / Điểm trừ UX | Giải pháp tối ưu theo chuẩn Clean & Anti-Slop |
| :--- | :--- | :--- |
| **Vị trí nút Expand/Collapse All** | Bị giấu khuất ở góc phải thanh bộ lọc phụ (`lg:border-l lg:pl-3`), nếu ít hơn 2 nhóm thì mất hẳn; người dùng rất khó nhìn thấy. | Đưa nút **Mở rộng tất cả / Thu gọn tất cả** lên thanh Toolbar chính ngay phía trên danh sách Card, đồng bộ hóa cùng badge đếm số lượng tổng thể (`X thành phẩm · Y kiện hàng`). |
| **Header của từng Card Thành phẩm bị nhồi nhét** | Header nhét cả thanh Progress Bar màu xanh lá, các tag mã packing list, model chips tím/chàm, text số lượng... khiến header quá cao, rối mắt, khó quét nội dung theo chiều ngang. | Tái cấu trúc Header thành 2 tầng thanh thoát: **Hàng 1**: STT badge, Mã & Tên Thành phẩm, Model Chips tinh tế; **Hàng 2 hoặc Cột phải**: Tiến độ đóng kiện dạng số liệu tinh gọn + Mini Progress line thanh mảnh + Tình trạng nhập kho/giao hàng và nút Chevron. |
| **Thanh Filter phụ dính (Sticky Toolbar)** | Ép 5 combobox vào 1 hàng ngang, chiếm diện tích màn hình lớn và tạo cảm giác nặng nề, lặp lại các nút lọc. | Tinh giản spacing, cấu trúc các combobox rõ ràng, có phân nhóm trực quan, nút "Xóa lọc" hiển thị tự nhiên khi có filter đang kích hoạt. |
| **Màu sắc & Phụ kiện trang trí thừa thãi** | Dùng nhiều màu ngẫu hứng (indigo, purple, amber, emerald, slate) không đồng nhất với design tokens của dự án. | Chuẩn hóa bảng màu theo Token hệ thống (`primary`, `muted`, `foreground`, `border`), dùng màu có chủ đích (Emerald cho Hoàn thành, Amber cho Một phần/Đang xử lý, Muted/Slate cho Chưa thực hiện). |
| **Trải nghiệm bảng chi tiết** | Bảng con trong từng card đã có `ResizableWrapTable` nhưng khi mở rộng ra nền `bg-muted/20` chưa tạo được độ sâu và phân tầng rõ nét với card cha. | Tạo viền ngăn cách sắc nét, nền bảng con sáng sạch với thead `!bg-[var(--figma-background-selected-primary)]`, header bảng con rõ ràng. |

---

## 2. Kế Hoạch Thay Đổi (Proposed Changes)

### Component: `packing-list-report`

#### 1. Cải tiến `index.tsx`
- Tối ưu lại cấu trúc layout tổng thể:
  - **Thanh tổng quan KPI (`PackingListSummaryBar`)**: Giữ 4 khối metric quan trọng nhưng tinh chỉnh lại typography và spacing cho sắc sảo.
  - **Toolbar phụ & Điều khiển danh sách**:
    - Thiết kế lại hàng công cụ: Bên trái là các bộ lọc nhanh (Thành phẩm, Model, Trạng thái) và số lượng kết quả.
    - Bên phải đặt cụm hành động chuyên biệt: Nút **Mở rộng tất cả / Thu gọn tất cả** (sử dụng icon `ChevronsUpDown`/`ChevronsDownUp`, nhãn i18n rõ ràng) và Popover chọn cột hiển thị.
    - Đảm bảo khi danh sách có từ 1 nhóm trở lên, nút vẫn hiển thị rõ ràng và người dùng có thể thao tác tức thì.

#### 2. Cải tiến `_components/packing-list-report-expand-item.tsx`
- Thiết kế lại phần Header của Card Thành phẩm (`FinishedGoodExpandItem`):
  - Khối bên trái: STT badge gọn gàng (`h-7 w-7`), Mã TP (`bg-primary/10 text-primary font-mono font-bold`), Tên TP (`font-semibold text-sm`), các chips Model (Hiệu suất & Thiết kế) định dạng tối giản, không dùng màu mè lòe loẹt.
  - Khối thống kê bên phải:
    - Hiển thị tiến độ đóng kiện: tỷ lệ % nổi bật, kèm số lượng `SL: X/Y` và khối lượng `KL: A/B kg`.
    - Thống kê nhanh Nhập kho & Giao hàng theo font mono tabular-nums dễ đọc.
    - Badge đếm số TagNo (`X kiện`) và nút mũi tên Chevron xoay mượt mà khi mở rộng/thu gọn.
  - Phần thân mở rộng: Bọc trong container có viền rõ ràng, thanh công cụ của `ResizableWrapTable` (Search + Filter Popover) hoạt động mượt mà.

#### 3. Cải tiến `_components/packing-list-summary-bar.tsx`
- Tinh chỉnh các thẻ KPI: Dự án, Quy mô hàng hóa, Tiến độ đóng kiện, Nhập kho & Giao công trình.
- Loại bỏ các gradient giả tạo, dùng đúng token nền `bg-card` và border mỏng chuẩn mực.

#### 4. Đảm bảo tuân thủ Project Rules & Anti-Slop
- **Zero hardcoded text**: Mọi chuỗi hiển thị đều qua `t('mechanicalPackingList:...', { defaultValue: '...' })`.
- **Không dùng raw HTML input/select**: Dùng hoàn toàn shared UI (`Button`, `Combobox`, `ResizableWrapTable`, v.v.).
- Không đưa vào các biểu tượng AI slop (sparkles, glowing borders, floating drop shadows).

---

## 3. Kế Hoạch Xác Minh (Verification Plan)

### Automated Tests / Type Check
- Kiểm tra build & typecheck frontend:
  ```powershell
  cd c:\Users\Admin\Desktop\CogainCore\cogain-core\frontend\bizdoc
  pnpm build # hoặc pnpm tsc --noEmit
  ```

### Manual Verification
- Kiểm tra trực quan trên trình duyệt (dev server đang chạy tại port Vite của `frontend/bizdoc`):
  1. Mở trang `/logistic/packing-list-report`.
  2. Chọn một dự án có dữ liệu (ví dụ dự án có nhiều thành phẩm).
  3. Bấm "Áp dụng bộ lọc".
  4. Kiểm tra nút "Mở rộng tất cả / Thu gọn tất cả": bấm mở để tất cả các card thành phẩm đồng loạt bung bảng chi tiết ra; bấm thu gọn để đóng tất cả lại.
  5. Thử nghiệm mở/đóng từng card đơn lẻ.
  6. Kiểm tra các bộ lọc con và thanh tìm kiếm trong bảng chi tiết.
  7. Kiểm tra giao diện ở các kích thước màn hình (desktop và responsive).
