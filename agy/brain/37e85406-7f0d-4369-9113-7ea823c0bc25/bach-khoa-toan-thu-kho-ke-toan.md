# Bách Khoa Toàn Thư: Phân Tích Toàn Diện Phân Hệ Kho & Kế Toán Kho

Tài liệu này bóc tách **từng Danh mục (Master Data)** và **từng loại Phiếu (Ticket/Document)** trong hệ thống Kho (Inventory/Warehouse) của dự án. Hệ thống không chỉ quản lý hàng hóa vật lý mà còn hạch toán kế toán và định giá tồn kho một cách khép kín.

---

## PHẦN 1: TỪ ĐIỂN DANH MỤC GỐC (MASTER DATA)

### 1. Cấu trúc Phân cấp Kho (Warehouse Hierarchy)
Để linh hoạt trong việc cấp quyền và lên báo cáo, hệ thống chia kho thành 3 cấp độ:

#### 1.1. `WarehouseType` (Loại Kho)
- **Bản chất**: Phân loại mức cao nhất (ví dụ: Kho nguyên vật liệu, Kho thành phẩm, Kho phế liệu, Kho công cụ dụng cụ). 
- **Ý nghĩa**: Dùng để gom nhóm khi lên các báo cáo quản trị tổng thể.

#### 1.2. `WarehouseGroup` (Nhóm Kho)
- **Bản chất**: Cấp trung gian trực thuộc Loại Kho. Ví dụ trong "Kho nguyên vật liệu" có thể chia thành "Nhóm kho hóa chất", "Nhóm kho bao bì".
- **Ý nghĩa**: Quản lý các nhóm vật tư có đặc tính bảo quản giống nhau.

#### 1.3. `Warehouse` (Kho Vật Lý / Cửa Hàng)
- **Bản chất**: Thực thể kho thực tế (ví dụ: Kho NVL Xưởng 1, Cửa hàng bán lẻ Quận 7).
- **Các trường quan trọng**:
  - `LocationId`: Tham chiếu địa điểm vật lý.
  - `BranchId`: Chi nhánh trực thuộc (Phục vụ bài toán hạch toán đa chi nhánh).
  - `ResponsibleEmployeeId`: **Thủ kho**. Trường này cực kỳ quan trọng dùng để phân quyền (Row-level Security). Nhân viên chỉ nhìn thấy tồn kho và tài sản thuộc kho mà mình làm thủ kho.
  - `AccountingWarehouseId`: Khóa ngoại trỏ sang Danh mục Kho Kế Toán (Xem 1.4).

#### 1.4. `AccountingWarehouse` (Kho Kế Toán)
- **Bản chất**: Bản đồ ánh xạ (Mapping) giữa Kho vật lý và Hệ thống tài khoản kế toán (Chart of Accounts).
- **Ý nghĩa**: Kế toán không cần tạo tài khoản chi tiết cho 100 cửa hàng. Họ chỉ cần tạo 1 Kho Kế Toán (ví dụ: TK 156 - Hàng hóa) và gắn 100 `Warehouse` vật lý vào `AccountingWarehouse` này. Khi sinh bút toán, hệ thống tự động bốc `InventoryAccountId` từ đây để hạch toán giá vốn.

### 2. Danh mục Hàng hóa & Đơn vị tính (Material & UOM)
*(Nằm ở MasterData Service, nhưng được Snapshot về ERP)*
- **`Material` (Vật tư/Hàng hóa)**: Danh mục sản phẩm cốt lõi. Hệ thống quản lý rất sâu đến mức `ModelId`, `TechnicalSpecificationId` (Thông số kỹ thuật), `DimensionSpecificationId` (Quy cách kích thước).
- **`UnitOfMeasure` (Đơn vị tính)**: Hệ thống hỗ trợ quy đổi đa đơn vị tính:
  - `StockUnitOfMeasure`: Đơn vị lưu kho gốc (Ví dụ: Kg).
  - `IssueUnitOfMeasure`: Đơn vị xuất kho (Ví dụ: Gram).
  - `PurchaseUnitOfMeasure`: Đơn vị mua hàng (Ví dụ: Tấn).

---

## PHẦN 2: CÁC LOẠI PHIẾU & QUY TRÌNH KHO (INVENTORY TICKETS)

Hệ thống tuân thủ chặt chẽ nguyên tắc **Tách biệt Yêu cầu (Request) và Thực thi (Execution)**. Một giao dịch kho luôn đi qua 2 bước để đảm bảo tính tuân thủ (Compliance).

### 1. Nhóm Phiếu Nhập Mua (Goods Receipt PO - GRPO)

#### 1.1. `GoodsReceiptPoRequest` (Yêu cầu Nhập kho mua hàng)
- **Nguồn gốc**: Sinh ra từ bộ phận Mua hàng (Purchasing) sau khi Đơn đặt hàng (PO) được nhà cung cấp giao tới.
- **Nhiệm vụ**: Thông báo cho Thủ kho biết chuẩn bị có hàng về, số lượng dự kiến là bao nhiêu. Phiếu này **KHÔNG** làm tăng tồn kho.

#### 1.2. `GoodsReceiptPo` (Phiếu Nhập kho mua hàng)
- **Nguồn gốc**: Sinh ra khi Thủ kho thực tế kiểm đếm và nhận hàng. Thường được kế thừa dữ liệu từ Yêu cầu nhập kho.
- **Dữ liệu lõi**: `ReceivedQuantity` (Số lượng thực nhận), `UnitPrice` (Đơn giá mua), `DiscountAmount` (Chiết khấu thương mại), `VatRate` (Thuế GTGT).
- **Tác động**: 
  - Đánh dấu `IsPosted = true` $\rightarrow$ Tăng số lượng trong Thẻ kho (`InventoryTransaction`).
  - Gọi Valuation Engine tính lại Giá bình quân di động.
  - Sinh bút toán kế toán: Nợ TK Kho (152/156), Nợ TK Thuế (1331) / Có TK Công nợ (331).

#### 1.3. `GoodsReceiptPoReturn` (Phiếu Trả hàng nhà cung cấp)
- Dùng để xuất trả lại hàng đã nhập kho do lỗi/hỏng.
- Nó hoạt động như một phiếu xuất kho nhưng bản chất kế toán là ghi giảm công nợ mua hàng.

### 2. Nhóm Phiếu Luân Chuyển / Xuất Kho (Inventory Transfer - IT)

#### 2.1. `InventoryTransferRequest` (Yêu cầu Điều chuyển / Xuất kho)
- **Nguồn gốc**: Các phòng ban tạo phiếu yêu cầu xin cấp vật tư (Ví dụ: Xưởng xin cấp 100kg Nhựa để sản xuất, hoặc Cửa hàng A xin luân chuyển 50 cái áo từ Kho Tổng).

#### 2.2. `InventoryTransfer` (Phiếu Điều chuyển / Xuất kho)
- **Đặc tả**: Phiếu này đóng 2 vai trò: **Xuất kho** (nếu không có kho đích) hoặc **Chuyển kho** (từ Kho A sang Kho B).
- **Tính năng phức tạp (Inbound Cost Resolution)**: Khi chuyển từ Kho A $\rightarrow$ B, giá trị nhập vào Kho B không được nhập tay mà được hệ thống tự động bốc từ **Giá bình quân của Kho A tại đúng giây phút xuất kho**.

#### 2.3. `InventoryTransferExcessRecovery` (Phiếu Thu hồi vật tư thừa)
- **Nghiệp vụ**: Khi xưởng sản xuất xong, vật tư lĩnh ra không dùng hết sẽ được trả lại kho.
- Đây là một luồng nhập kho đặc biệt vì giá nhập lại phải khớp với giá xuất lúc ban đầu của quy trình lệnh sản xuất (`ProductionOrderId`).

### 3. Nhóm Phiếu Kiểm Kê & Điều Chỉnh (Stock Count & Adjustment)

#### 3.1. `StockCount` (Phiếu Kiểm kê)
- **Nhiệm vụ**: Chụp lại (Snapshot) tồn kho sổ sách tại một thời điểm, sau đó cho phép nhân viên nhập tồn kho đếm thực tế (Physical count).
- Ghi nhận chênh lệch: Thừa hoặc Thiếu. Phiếu này **chưa làm thay đổi tồn kho**.

#### 3.2. `InventoryAdjustmentTicket` (Phiếu Điều chỉnh tồn kho)
- **Kế thừa**: Được sinh ra từ phiếu Kiểm kê (`StockCount`) đã được duyệt.
- **Tác động**:
  - Nhập phần thừa vào kho (Sinh bút toán tăng kho / giảm chi phí hoặc tăng thu nhập khác).
  - Xuất phần thiếu khỏi kho (Sinh bút toán giảm kho / tăng chi phí hao hụt).

---

## PHẦN 3: TÍCH HỢP SỔ SÁCH & HỆ THỐNG KẾ TOÁN (LEDGER INTEGRATION)

Mọi phiếu kho ở Phần 2 khi được duyệt (`IsPosted = true`) đều chảy vào bộ máy Kế toán theo 2 dòng chảy song song: Dòng chảy Hàng hóa và Dòng chảy Tiền tệ.

### 1. Dòng chảy Hàng hóa: Sổ Kho (`InventoryTransaction`)
- Bảng này chính là Thẻ Kho (Ledger). Mỗi dòng tương ứng với 1 lần nhập hoặc xuất.
- **Dữ liệu lưu**: `QuantityIn`, `QuantityOut`, `BalanceQuantity` (Tồn cuối), `UnitPrice`, `AverageMovingPrice` (Giá bình quân).
- **Liên kết Tài sản cố định**: 
  - Một điểm cực hay của hệ thống là `InventoryTransaction` có hỗ trợ trường `AssetId` song song với `MaterialId`.
  - Nếu công ty mua một cái Máy tiện (TSCĐ) qua phiếu nhập kho GRPO, thẻ kho sẽ ghi nhận cho `AssetId` thay vì `MaterialId`. Điều này giúp hệ thống mua sắm, nhận hàng dùng chung một luồng cho cả Hàng hóa, CCDC và TSCĐ.

### 2. Dòng chảy Tiền tệ: Sổ Cái (`JournalEntry`)
- Hệ thống gọi qua `JournalPostingEngine` và các `IJournalContextProvider` (như đã phân tích ở tài liệu trước).
- Phiếu kho cung cấp Biến (Variables: số lượng, thành tiền, loại hàng).
- Template Kế toán áp dụng Biến để văng ra các dòng Nợ/Có.
- Ghi vào bảng `JournalEntry` và `JournalEntryLine` (Sổ cái).

### 3. Cấu hình Giá vốn (`InventoryCostingSetting`)
- **Moving Average (Bình quân di động)**: Tính lại giá vốn sau MỖI LẦN NHẬP KHO. Mọi phiếu xuất đều lấy giá realtime.
- **Periodic Weighted Average (Bình quân cuối kỳ)**:
  - Cuối tháng Kế toán thực hiện Khóa sổ (`AccountingPeriodLock`).
  - Hệ thống tính lại giá trung bình cả tháng và lưu vào bảng `InventoryPeriodClosingCost`.
  - Chạy Replay áp đè giá trị này ngược lại cho toàn bộ phiếu xuất trong tháng.

---

## TỔNG KẾT
Kiến trúc Kho của hệ thống không phải là kho vật lý đơn thuần (WMS - Warehouse Management System), mà là một hệ thống **Kho Kế Toán (Inventory Accounting)** chuẩn mực ERP. Bằng việc phân tách rõ Yêu cầu - Thực thi, chia dòng chảy thành Thẻ Kho và Sổ Cái, tích hợp định giá Replay và Khóa sổ kế toán, hệ thống đảm bảo tính toàn vẹn dữ liệu tuyệt đối theo các chuẩn mực tài chính khắt khe nhất (VAS/IFRS).
