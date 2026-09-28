# Phân Tích 4 Trụ Cột Kiến Trúc ERP (Phần Mở Rộng)

Bên cạnh lõi Kế toán Kho cực kỳ đồ sộ, hệ thống ERP này còn sở hữu 4 phân hệ (trụ cột) được thiết kế với tư duy phần mềm doanh nghiệp (Enterprise) rất hiện đại. Dưới đây là phân tích bóc tách từng trụ cột.

---

## TRỤ CỘT 1: ENGINE BÁO CÁO TÀI CHÍNH ĐỘNG (Dynamic Financial Reports)

Ở các phần mềm kế toán cũ, Bảng Cân đối Kế toán (Balance Sheet) hay Báo cáo Kết quả Kinh doanh (Income Statement) thường bị **hard-code** cứng vào code. Nếu thông tư của Bộ Tài chính thay đổi, lập trình viên phải sửa code và deploy lại. Hệ thống này giải quyết hoàn toàn bằng cấu hình Dữ liệu (Data-driven).

**Các thực thể tham gia:**
- `FinancialReport`: Định nghĩa biểu mẫu báo cáo (Tên báo cáo, Cấu trúc độ rộng các cột hiển thị).
- `FinancialReportColumn`: Định nghĩa các cột giá trị (Ví dụ: Cột "Kỳ này", Cột "Kỳ trước").
- `FinancialReportLine`: Định nghĩa từng dòng (Chỉ tiêu) trên báo cáo.

**Cách thức hoạt động cực kỳ linh hoạt:**
Mỗi dòng (`FinancialReportLine`) có trường `Formula` (Công thức tính toán) theo cú pháp riêng của hệ thống:
1. **Dấu cộng/trừ Mã tài khoản**: Nếu nhập `111+112`, hệ thống tự hiểu đi gom toàn bộ số dư của các tài khoản bắt đầu bằng 111 và 112 cộng lại.
2. **Tham chiếu Chỉ tiêu khác**: Ký pháp `[Mã chỉ tiêu]`. Nếu dòng "Lợi nhuận gộp" có mã chỉ tiêu là `20`, công thức của nó sẽ là `[10] - [11]` (Lấy chỉ tiêu Doanh thu trừ đi Giá vốn). Hệ thống dùng đệ quy (Recursion) để tính toán cây công thức này lúc Runtime.
3. **NormalBalance (Tính chất Nợ/Có)**: Dòng tài sản mang tính chất Nợ (`Debit`), dòng Nguồn vốn mang tính chất Có (`Credit`). Nhờ vậy, khi móc số dư tài khoản lên báo cáo sẽ không bị in ra số âm một cách vô lý.

$\rightarrow$ **Kết quả:** Kế toán trưởng có thể tự "kéo thả", "vẽ" ra một Báo cáo Lưu chuyển tiền tệ hoàn toàn mới hoặc tùy biến Bảng cân đối theo chuẩn IFRS mà không cần 1 dòng code nào từ IT.

---

## TRỤ CỘT 2: KHẤU HAO TÀI SẢN & PHÂN BỔ DỰ ÁN (Asset Depreciation Run)

Module Tài sản cố định (Fixed Assets) của hệ thống không lưu số dư hao mòn lũy kế vào một trường duy nhất (tránh data staleness). Thay vào đó, nó tính toán on-the-fly dựa trên các bút toán lịch sử.

**Các thực thể tham gia:**
- `AssetDepreciationRun`: Một "lần bấm nút" chạy khấu hao cuối tháng của Kế toán.
- `AssetDepreciationEntry`: Bút toán khấu hao của từng tài sản cụ thể sinh ra trong lần chạy đó.
- `AssetDepreciationEntryProjectSplit`: **Đây là "Vũ khí bí mật" của phân hệ Tài sản.**

**Bài toán chẻ nhỏ chi phí dự án (Project Split):**
Nếu công ty có 1 chiếc Máy Xúc (Tài sản). Trong tháng 8, chiếc máy xúc này làm việc ở Dự án A (10 ngày), Dự án B (15 ngày), Dự án C (5 ngày).
- Nếu chỉ hạch toán khấu hao bình thường, toàn bộ 30 triệu tiền khấu hao sẽ chui vào tài khoản Chi phí chung. Kế toán quản trị không thể biết Dự án nào đang lỗ hay lãi.
- Bằng tính năng `ProjectSplit`, khi `AssetDepreciationRun` kích hoạt, nó sẽ quét xem trong kỳ đó Máy Xúc đang được gắn vào các dự án nào. Hệ thống tự động **chẻ (split)** bút toán 30 triệu ra làm 3:
  - 10 triệu hạch toán Nợ TK Chi phí Dự án A.
  - 15 triệu hạch toán Nợ TK Chi phí Dự án B.
  - 5 triệu hạch toán Nợ TK Chi phí Dự án C.

Điều này làm cho hệ thống Kế toán Quản trị (Managerial Accounting) của dự án này trở nên đặc biệt mạnh mẽ đối với các doanh nghiệp xây lắp, dự án.

---

## TRỤ CỘT 3: KẾ TOÁN VỐN BẰNG TIỀN (Cash/Fund Accounting)

Phân hệ quản lý Thu/Chi và Dòng tiền (Treasury). Nó cũng tuân thủ nguyên tắc "Yêu cầu $\rightarrow$ Thực thi" giống như Kho.

**Các thực thể tham gia:**
- Lập Yêu Cầu: `PaymentRequest` (Yêu cầu chi tiền), `ReceiptRequest` (Yêu cầu thu tiền).
- Thực thi Thanh Toán: `PaymentVoucher` (Phiếu chi / Ủy nhiệm chi), `ReceiptVoucher` (Phiếu thu / Báo có).

**Điểm nhấn:**
- Quá trình chuyển từ Request sang Voucher được kiểm soát bằng luồng duyệt (Workflow).
- `PaymentVoucher` tích hợp trực tiếp với bộ máy **Journal Posting Engine**. Nghĩa là khi thủ quỹ bấm "Đã thanh toán", hệ thống tự động phát sinh bút toán Nợ TK 331 (Phải trả người bán) / Có TK 112 (Tiền gửi ngân hàng) và tiến hành **Đối trừ (Clearing/Matching)** hóa đơn (AP - Accounts Payable).

---

## TRỤ CỘT 4: THÀNH PHẨM & LẬP KẾ HOẠCH (Production & MRP)

Dù chưa được phát triển đến mức MES (Manufacturing Execution System) phức tạp, hệ thống vẫn có nền móng vững chắc cho Sản xuất.

**Các thực thể tham gia:**
- `FinishedGoodsReceipt`: Phiếu nhập kho thành phẩm. Phiếu này cực kỳ đặc biệt vì nó đi ngược chiều với Phiếu xuất kho.
- Khi sản xuất hoàn thành, hệ thống sẽ chốt "Chi phí sản xuất dở dang" (TK 154) để quy ra giá thành cho `FinishedGoodsReceipt`.
- `Mrp` (Material Requirements Planning) & `CapacityPlanning`: Các bảng tính toán nhu cầu nguyên vật liệu và năng lực máy móc để phòng Thu mua (Purchasing) có thể ra quyết định mua hàng (Sinh ra các `GoodsReceiptPoRequest`) tự động trước khi thiếu hụt vật tư.

---

### TỔNG KẾT
Cùng với "Valuation Engine" và "Dynamic Journal Template" đã phân tích ở các bài trước, **Báo cáo tài chính động** và **Phân bổ tài sản theo Dự án** khẳng định lại một lần nữa: Hệ thống ERP này được thiết kế để giải quyết các bài toán Kế toán ở quy mô Doanh nghiệp Lớn, đề cao tính **Data-driven** (Mọi thứ đều là cấu hình dữ liệu, không phải hard-code) và **Event Sourcing** (Không lưu số dư cứng, dùng lịch sử giao dịch làm nguồn sự thật tuyệt đối).
