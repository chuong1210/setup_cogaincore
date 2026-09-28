# Phân Tích Chuyên Sâu Khối Kiến Trúc Kho - Kế Toán (Accounting Inventory)

Trong hệ thống ERP này, phân hệ Kho không hoạt động độc lập mà được đan xen cực kỳ chặt chẽ với phân hệ Kế Toán (Accounting). Toàn bộ khối kiến trúc này được thiết kế để giải quyết những bài toán phức tạp bậc nhất của ERP: Tính đúng giá vốn hàng bán (COGS), điều chỉnh giá hồi tố, xử lý đồng thời, hạch toán động và khóa sổ cuối kỳ.

Dưới đây là bản phân tích bóc tách cực kỳ chi tiết từng thành phần lõi khó hiểu nhất trong khối "Kho Kế Toán" của dự án:

---

## 1. Động Cơ Định Giá Hàng Tồn Kho (Valuation Engine)

Thành phần chịu trách nhiệm: `InventoryTransactionPostingService.cs`

Đây là trái tim của hệ thống tính giá vốn, nơi xử lý toàn bộ các giao dịch nhập/xuất kho (`InventoryTransaction`) và tính ra đơn giá trung bình cũng như giá trị tồn kho.

### 1.1. Giải pháp Replay lịch sử theo trình tự thời gian (Chronological Replay)
Các hệ thống kho thông thường chỉ lưu số lượng và giá vốn hiện tại. Khi có một phiếu nhập bị sửa giá trong quá khứ, chúng thường không thể tính lại hoặc phải dùng bút toán bù trừ rất rườm rà.

Hệ thống này chọn cách **Replay (Phát lại) toàn bộ lịch sử**:
- Khi có một phiếu nhập/xuất bất kỳ được sửa hoặc thêm mới, hệ thống sẽ xác định ngay các mặt hàng (`ModelId`) bị ảnh hưởng.
- Tải toàn bộ sổ kho (`ledger`) của các mặt hàng đó từ cơ sở dữ liệu.
- Sắp xếp tất cả các dòng giao dịch theo trình tự thời gian tuyệt đối (`TransactionDate` $\rightarrow$ `CreatedDate` $\rightarrow$ Chiều Xuất xếp trước chiều Nhập).
- Cho chạy lại thuật toán tính số dư và đơn giá trung bình từ dòng giao dịch đầu tiên trong lịch sử cho tới hiện tại.
- **Kết quả:** Bất kỳ sự thay đổi nào ở quá khứ cũng sẽ ngay lập tức được "lan truyền" (cascade) một cách tự động xuống toàn bộ các phiếu xuất kho phía sau, đảm bảo giá vốn luôn đúng theo toán học tuyệt đối mà không cần dùng job đêm.

### 1.2. Khóa chống đồng thời bằng PostgreSQL Advisory Locks
Khi tính giá vốn bằng Replay, nguy cơ lớn nhất là **Race Condition** (Hai giao dịch cùng lúc sửa cùng một mặt hàng).

- Tác giả sử dụng `unitOfWork.AcquireAdvisoryLockAsync(ToAdvisoryLockKey(modelId))` để khóa luồng tính toán.
- Mỗi mặt hàng (`ModelId`) sẽ băm ra một mã khóa (Int64).
- Các lệnh chốt kho, dù đến từ nhiều user khác nhau, nếu đụng chạm đến cùng một mặt hàng sẽ bị ép phải xếp hàng chờ (Serialize) ở tầng Database. Người này xử lý xong, lưu xuống DB xong thì người kia mới được tiếp tục. 
- Cơ chế này giúp tồn kho **không bao giờ bị âm** do hai người dùng cùng xuất kho một món đồ khi nó chỉ còn lại 1 cái.

### 1.3. Luân chuyển giá vốn liên kho (Inbound Cost Resolution)
Khi chuyển kho (`InventoryTransfer`), điều kiện tiên quyết là giá trị xuất kho của Kho A phải bê nguyên xi sang làm giá trị nhập kho của Kho B.
- Engine thông minh xử lý việc này bằng cách sắp xếp Chiều Xuất (`QuantityOut > 0`) chạy trước Chiều Nhập (`QuantityIn > 0`) ở cùng một thời điểm thời gian.
- Chiều Xuất ở Kho A sẽ lấy giá trung bình của Kho A (ví dụ 50.000đ).
- Engine lưu lại giá này vào một bộ nhớ tạm (Dictionary), sau đó khi duyệt tới dòng nhập của Kho B, nó sẽ tra cứu và gán cứng giá trị 50.000đ này làm `UnitPrice` cho Kho B, bất kể Kho B đang có giá trung bình là bao nhiêu.

---

## 2. Quản Lý Kỳ Kế Toán & Tính Giá Bình Quân Cuối Kỳ

Thành phần chịu trách nhiệm: `AccountingPeriodLockService.cs` và `InventoryPeriodClosingCostService.cs`

Giá vốn có thể cấu hình tính theo **Bình quân di động (Moving Average)** hoặc **Bình quân cuối kỳ (Periodic Weighted Average)** thông qua `InventoryCostingSetting`.

### Sự phức tạp của Bình quân cuối kỳ
- **Trong kỳ (Chưa khóa sổ)**: Kế toán vẫn phải xuất kho, nhưng lúc này hệ thống không biết tổng nhập trong kỳ là bao nhiêu để tính giá chia đều. Do đó, Valuation Engine sẽ dùng **Giá Tạm Tính (Provisional Price)** (lấy từ số dư cuối kỳ trước đó).
- **Cuối kỳ (Hành động Khóa Sổ - `LockAsync`)**: Kế toán trưởng thực hiện khóa sổ kỳ. Hệ thống sẽ kích hoạt `ClosePeriodCostingAsync`.
- Quá trình này sẽ lấy Tổng giá trị tồn đầu kỳ + Tổng giá trị nhập trong kỳ $\rightarrow$ Chia cho (Tổng số lượng tồn đầu + Tổng lượng nhập) $\rightarrow$ Ra một đơn giá bình quân duy nhất cho cả tháng.
- Số liệu này được chốt cứng (freeze) vào bảng `InventoryPeriodClosingCost`.

### Lan truyền giá vốn sau chốt (True-Up Cascade)
Sự vi diệu xảy ra ngay sau khi dòng `InventoryPeriodClosingCost` được ghi xuống DB:
Hệ thống sẽ chạy lại Valuation Engine (Replay). Lúc này, thay vì lấy giá trị thay đổi liên tục, Engine nhìn thấy kỳ đã khóa nên nó sẽ bốc đúng cái giá Bình quân cuối kỳ vừa tính xong gán đè lên toàn bộ các phiếu xuất trong kỳ đó. Các phiếu xuất từ trạng thái "tạm tính" sẽ chuyển thành "chính thức" một cách hoàn hảo.

---

## 3. Bộ Máy Bóc Tách Ngữ Cảnh Kế Toán (Journal Context Providers)

Thành phần chịu trách nhiệm: Các class implement `IJournalContextProvider` (VD: `GoodsReceiptPoContextProvider.cs`)

Đây là điểm nghẽn khó khăn nhất khi làm các phần mềm ERP: **Làm sao để người dùng (Kế toán) tự do cấu hình hạch toán mà không cần lập trình viên sửa code?**

### 3.1 Cầu nối giữa Nghiệp Vụ Kho và Mẫu Kế Toán
Một phiếu nhập kho (GRPO) có rất nhiều thông tin (số lượng, giá mua, thuế VAT, chiết khấu). Kế toán muốn tự cấu hình "Dòng thuế VAT thì đưa vào TK 1331".
Để làm được điều này, hệ thống dùng mô hình Provider:
- `GoodsReceiptPoContextProvider` làm nhiệm vụ đọc chứng từ nhập kho thật, bóc tách nó thành một danh sách các "Biến số" (Variables).
- Các biến này được khai báo minh bạch bằng `Describe()`: `[Amount]`, `[VatRate]`, `[IsAsset]`, `[DiscountAmount]`, `[DiscountVatAmount]`...
- Từ đây, `JournalTemplate` (cấu hình bởi kế toán) có thể sử dụng các biến này trong biểu thức. Ví dụ: Dòng thuế sẽ có `AmountExpression` là `[Amount] * [VatRate] / 100`.

### 3.2. Kỹ thuật xử lý Chiết Khấu / VAT (Header vs Line Level)
Một vấn đề hóc búa của nhập kho là: Tiền chiết khấu (`DiscountAmount`) thường nằm trên Header của phiếu (giảm 1 triệu cho toàn đơn), nhưng Engine lại quét sinh bút toán dựa trên từng dòng chi tiết (Line) của đơn hàng.

Nếu không xử lý cẩn thận, dòng chiết khấu sẽ bị nhân lên N lần (ví dụ đơn có 5 dòng hàng, hệ thống sẽ sinh ra 5 dòng hạch toán chiết khấu $\rightarrow$ Sai bét).

**Cách giải quyết của hệ thống:**
Trong `GoodsReceiptPoContextProvider`, biến `[DiscountAmount]` chỉ được gán giá trị ở **dòng chi tiết số 0** (`index == 0`).
```csharp
var discountAmount = index == 0 ? grpo.DiscountAmount : 0;
values["DiscountAmount"] = discountAmount;
```
Nhờ mẹo nhỏ nhưng cực kỳ sắc sảo này, khi Journal Posting Engine chạy vòng lặp qua 5 dòng hàng, dòng đầu tiên sẽ sinh ra bút toán chiết khấu, 4 dòng sau biến `[DiscountAmount] = 0` nên bút toán chiết khấu tự động biến mất, đảm bảo tiền chiết khấu toàn đơn chỉ được hạch toán đúng 1 lần duy nhất trên sổ cái!

---

## Tổng Kết
Có thể thấy, phân hệ Kho - Kế toán trong kiến trúc này không phải là một module CRUD (Tạo/Đọc/Sửa/Xóa) đơn thuần. Nó là một **Cỗ máy trạng thái (State Machine)** mạnh mẽ, dựa trên các nguyên lý cao cấp:
1. **Event Sourcing / Replay** để xử lý định giá tồn kho.
2. **PostgreSQL Advisory Locks** để khử bất đồng bộ đa luồng.
3. **Expression Rule Engine** để giải phóng sự phụ thuộc vào Hard-code cho nghiệp vụ hạch toán Nợ/Có.
4. **Snapshot Pattern** để đảm bảo Sổ kho không bị méo mó khi dữ liệu danh mục gốc (Master Data) bị thay đổi.

Đây là một thiết kế mang tầm vóc của các giải pháp ERP Enterprise lớn trên thế giới.
