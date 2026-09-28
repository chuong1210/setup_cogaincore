# Phân Tích Chuyên Sâu: Phân Hệ Lập Kế Hoạch (MRP & Safety Stock)

Phân hệ Planning (Lập kế hoạch) là "bộ não" của khối Sản xuất & Cung ứng trong ERP. Nó trả lời câu hỏi cốt lõi: **"Chúng ta cần mua/sản xuất vật tư gì, số lượng bao nhiêu, và khi nào để không bị đứt gãy sản xuất nhưng cũng không tồn kho quá nhiều?"**

Dưới đây là bản phân tích bóc tách chi tiết từng thành phần trong `ERP.Data.Entities.Mrp` mà bạn đã hỏi.

---

## 1. MaterialSafetyStock (Định mức tồn kho an toàn)
**Đường dẫn**: `planning/material-safety-stock` / `MaterialSafetyStock.cs`

### Vai trò
Đây là **Master Data** quan trọng nhất của phân hệ Planning. Nó đóng vai trò như một chiếc "phao cứu sinh", quy định mức tồn kho tối thiểu phải luôn có trong kho để đề phòng các rủi ro:
* Đơn hàng tăng đột biến (Demand spike).
* Nhà cung cấp giao hàng trễ (Lead time delay).
* Hàng bị lỗi hỏng bất thường trong sản xuất.

### Cấu trúc dữ liệu
```csharp
public Guid MaterialId { get; set; }
public Guid ModelId { get; set; }
public Guid WarehouseId { get; set; }
public decimal SafetyStockQuantity { get; set; }
```

### Phân tích nghiệp vụ
* **Độ mịn của cấu hình (Granularity)**: Hệ thống cho phép thiết lập Safety Stock chi tiết đến từng `Model` của vật tư và từng `Warehouse` (Kho). 
  * *Ví dụ:* Cùng là "Ống đồng", nhưng ở Kho Sản Xuất Xưởng 1 cần tồn an toàn là 500 mét, còn ở Kho Phụ Trợ Xưởng 2 chỉ cần 50 mét.
* **Tác động**: Con số `SafetyStockQuantity` này sẽ được tự động kéo vào màn hình MRP để làm "ngưỡng đáy". Nếu tồn kho dự báo rớt xuống dưới mức này, hệ thống sẽ báo động đỏ yêu cầu mua thêm.

---

## 2. MRP - Material Requirements Planning (Phiếu Hoạch Định)
**Đường dẫn**: `planning/mrp` / `Mrp.cs`

### Vai trò
Đây không phải là Master Data, mà là một **Document (Phiếu giao dịch)** có workflow duyệt (`WorkItemEntityAuditBase`, `ITicketAccessControl`). 
Mỗi lần bộ phận kế hoạch chạy MRP (hàng tuần/hàng tháng), hệ thống sẽ sinh ra một phiếu MRP lưu lại toàn bộ ngữ cảnh tính toán tại thời điểm đó.

### Phân tích nghiệp vụ
* **Tại sao phải là một Phiếu (Ticket)?** Tính toán MRP là một quá trình rất nặng và thay đổi liên tục theo thời gian thực (vì kho xuất nhập liên tục). Việc lưu nó thành một Phiếu giúp "chốt" (snapshot) lại kết quả tính toán. Giám đốc có thể mở Phiếu MRP của tuần trước ra xem lý do tại sao nhân viên lại đề xuất mua 10,000 linh kiện.
* **Thuộc tính quan trọng**:
  * `RunDate`: Thời điểm chạy kế hoạch (rất quan trọng để chốt số liệu kho).
  * `RequiredDate`: Ngày cần hàng (để hệ thống lùi lại tính ngày cần đặt hàng - Lead Time).
  * `PlanType = Production`: Hệ thống hỗ trợ phân biệt mục đích chạy MRP (phục vụ sản xuất hay thương mại/bán lẻ).

---

## 3. MrpDetail (Trái tim của bài toán MRP)
**Đường dẫn**: `MrpDetail.cs`

### Vai trò
Đây là nơi chứa **Công thức tính toán thần thánh** của mọi hệ thống ERP. Nó tính toán chi tiết cho từng mã vật tư trên một dòng của Phiếu MRP.

### Bóc tách công thức tính toán (Thuật toán Netting)
Mục tiêu cuối cùng là tính ra `OrderQuantity` (Số lượng cần mua/sản xuất thêm).

**Công thức tổng quát:**
> **Tồn dự báo (Projected Stock)** = [Tồn hiện tại] + [Nguồn cung sắp về] - [Nhu cầu sẽ xuất] - [Nhu cầu sản xuất]
> **Số lượng cần mua (Order Quantity)** = MAX(0, [Tồn an toàn] - [Tồn dự báo])

Hệ thống CogainCore chia rất nhỏ các biến số này để cực kỳ chính xác:

#### A. Nguồn lực hiện có (Current)
* `CurrentStockQuantity`: Tồn kho vật lý hiện tại trong kho.

#### B. Nguồn cung sắp về (Incoming Supply)
Hàng chưa vào kho nhưng CHẮC CHẮN sẽ vào trong tương lai gần:
* `IncomingGrporQuantity`: Hàng đang chờ nhập từ NCC (GRPO Request).
* `IncomingPoQuantity`: Hàng đã chốt Đơn đặt hàng (PO) nhưng chưa giao.
* `IncomingPrQuantity`: Hàng đang nằm trong Yêu cầu mua hàng (PR) đang chờ duyệt.
* `IncomingIterQuantity`: Hàng đang đi trên đường từ kho khác chuyển tới (Inter-branch Transfer).

#### C. Nhu cầu sẽ xuất ra (Outbound / Demand)
Hàng vẫn đang ở trong kho, nhưng KHÔNG ĐƯỢC PHÉP DÙNG vì đã "hứa" cho việc khác:
* `RequiredQuantity`: Số lượng vật tư cần để chạy các Lệnh sản xuất (Production Orders) sắp tới.
* `OutgoingItrQuantity`: Hàng đã hứa sẽ điều chuyển đi kho khác.
* `OutgoingGrpoReturnQuantity`: Hàng chuẩn bị xuất trả lại Nhà cung cấp do lỗi.
* `OutgoingDeliveryPackagingQuantity`: Hàng đã đóng gói chuẩn bị giao cho Khách.

=> **Logic cực kỳ thông minh**: Hệ thống không mù quáng nhìn vào số dư kho. Nếu trong kho có 1000 cái, nhưng đã hứa cho lệnh sản xuất 800, và hứa trả NCC 300, thì "Tồn dự báo" là Âm (-100). Dù thủ kho báo "còn hàng", hệ thống MRP vẫn kiên quyết bắt mua thêm để bù đắp.

---

## 4. MrpIoHistory (Dấu vết Audit / Pegging)
**Đường dẫn**: `MrpIoHistory.cs`

### Vai trò
Khi hệ thống nói: *"Bạn có 5,000 hàng sắp về (IncomingPoQuantity)"*, nhân viên kế hoạch sẽ hỏi: *"Ủa, 5,000 hàng này từ những đơn PO nào? Có chắc chắn không?"*
`MrpIoHistory` (Pegging) sinh ra để giải quyết vấn đề đó.

### Phân tích nghiệp vụ
* **Pegging (Truy xuất nguồn gốc)**: Nó lưu lại chi tiết từng chứng từ tạo ra các con số tổng trong `MrpDetail`. 
* **Cấu trúc lưu vết**:
  * `SourceType`: Loại chứng từ (ví dụ: PO, PR, Production Order).
  * `SourceHeaderCodeSnapshot`: Mã chứng từ (ví dụ: `PO-2024-0001`).
  * `Quantity`: Số lượng đóng góp từ chứng từ này.
* **Trải nghiệm người dùng (UX)**: Nhờ có bảng này, trên giao diện màn hình MRP, user có thể **Click vào con số 5,000** -> Hệ thống sẽ pop-up lên danh sách 3 đơn PO (mỗi đơn một ít) để user an tâm duyệt kế hoạch.

---

## Tổng kết Flow Vận hành Planning

1. **Setup**: User vào `safety-stock-mrp` thiết lập tồn kho an toàn cho các vật tư trọng yếu.
2. **Kích hoạt (Trigger)**: Đầu tuần, Kế hoạch trưởng vào màn hình `planning/mrp` ấn nút "Chạy MRP".
3. **Quét dữ liệu (Netting)**: Backend quét toàn bộ tồn kho, PO đang treo, Lệnh sản xuất sắp tới, tính toán ra hàng ngàn dòng `MrpDetail`.
4. **Kiểm tra (Pegging)**: Kế hoạch trưởng rà soát các dòng báo đỏ (cần mua gấp), click vào xem chi tiết `MrpIoHistory` xem có lỗi dữ liệu không.
5. **Thực thi (Action)**: Kế hoạch trưởng "Duyệt" phiếu MRP. Từ phiếu MRP này, hệ thống tự động `Genereate PR` (Yêu cầu mua hàng) đẩy sang cho bộ phận Mua hàng. Chu trình khép kín hoàn hảo.
