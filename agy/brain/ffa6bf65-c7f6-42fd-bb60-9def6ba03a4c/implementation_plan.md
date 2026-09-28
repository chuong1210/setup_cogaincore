# Kế Hoạch Đồng Bộ Hóa Toàn Diện InstallationAcceptanceMinute Theo Chuẩn AcceptanceMinute

## 1. Tổng Quan Mục Tiêu
Yêu cầu của người dùng: **"Xem InstallationAcceptanceMinute nó khác gì AcceptanceMinute thì giờ làm y chang lại cho tui. Từ xử lý logic service, snapshot, workitem... tới giao diện i18n."**

Qua rà soát chuyên sâu toàn bộ codebase (Backend .NET 8 & Frontend React 19 / Vite / Bizdoc):
- **Backend**: Entity `InstallationAcceptanceMinute`, `InstallationAcceptanceMinuteDetail`, `InstallationAcceptanceMinuteVerify` đã có đầy đủ thuộc tính, kế thừa `WorkItemEntityAuditBase<Guid>`, `ISyncsChildren`, `SnapshotPolicy`, và các methods Service realtime (SignalR room, QC confirm, other roles confirm, bulk verify, word print/export, create-remake, create-from-order). Tuy nhiên, cần hoàn thiện cấu hình EF Core Mapping (`InstallationAcceptanceMinuteConfiguration` & `InstallationAcceptanceMinuteDetailConfiguration`).
- **Frontend**: Trang danh sách `index.tsx`, trang chi tiết `$id/detail.tsx`, form trượt `acceptance-minute-form.tsx` (Sheet 85%), và các dialog nghiệm thu realtime đã được tạo. Tuy nhiên, đang tồn tại **nhiều điểm vi phạm quy tắc chung (`AGENTS.md` & `react-typescript-rules.md`)** và **chưa đồng bộ hoàn chỉnh**:
  1. *Vi phạm Zero Hardcoded Text*: Hàng chục chuỗi tiếng Việt bị hardcode trực tiếp trong JSX/Dialogs (`other-role-confirm-dialog.tsx`, `qc-ready-dialog.tsx`, `index.tsx`).
  2. *Vi phạm Data Fetching*: `qc-ready-dialog.tsx` gọi trực tiếp `employeeService.getPaged` qua inline `useQuery` thay vì dùng custom hook (`useEmployee`).
  3. *Vi phạm Raw HTML*: `index.tsx` sử dụng `<input type="radio">` thay vì `Checkbox` từ `@shared/ui`.
  4. *Cột thao tác chưa chuẩn*: `index.tsx` chưa dùng `ActionStack` chuẩn như `AcceptanceMinute`.
  5. *Thiếu mapping dữ liệu*: Khi chọn Lệnh lắp đặt trong `acceptance-minute-form.tsx`, các trường BTP, BOM, đơn giá, hệ số chưa được copy xuống details.
  6. *Thiếu từ khóa i18n*: File `installationAcceptanceMinute.json` chưa có đầy đủ key cho các Dialogs và Filter popover.

---

## 2. User Review Required

> [!IMPORTANT]
> **Quy định Database Migrations (AGENTS.md)**: Tuyệt đối KHÔNG chạy các lệnh `dotnet ef migrations add` hoặc `dotnet ef database update`. Việc migration database sẽ do người dùng tự thực thi thủ công nếu cần.

> [!NOTE]
> **Về module Báo cáo sản lượng / Lương khoán**: `AcceptanceMinute` có 2 trang báo cáo riêng (`production-team-acceptance-report` và `team-cost-summary-report`). Đối với Lắp đặt, hiện tại controller và service tập trung vào toàn bộ vòng đời của WorkItem Phiếu và Phòng nghiệm thu realtime. Kế hoạch này tập trung đồng bộ trọn vẹn toàn bộ module Nghiệm thu lắp đặt (Ticket lifecycle, Realtime verification, In Word, Import/Export, Form Sheet 85%, Master-Detail list và i18n chuẩn).

---

## 3. Các Thay Đổi Cụ Thể Cần Triển Khai

### Component 1: Backend EF Core Configuration & Controller Mapping

#### [MODIFY] [InstallationAcceptanceMinuteConfiguration.cs](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/src/Services/ServiceDesk/ServiceDesk.Data/Persistence/Configurations/NT/InstallationAcceptanceMinuteConfiguration.cs)
- Bổ sung cấu hình độ dài tối đa cho `SapOldCode` (200) và `SapOldName` (500) đồng bộ với `AcceptanceMinuteConfiguration`.

#### [MODIFY] [InstallationAcceptanceMinuteDetailConfiguration.cs](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/src/Services/ServiceDesk/ServiceDesk.Data/Persistence/Configurations/NT/InstallationAcceptanceMinuteDetailConfiguration.cs)
- Cấu hình kiểu cột ngày tháng `HasColumnType("date")` cho `EstStartDate` và `EstEndDate`.
- Đảm bảo quan hệ với bảng cha có `DeleteBehavior.Cascade` rõ ràng.

---

### Component 2: Frontend Localization (i18n)

#### [MODIFY] [installationAcceptanceMinute.json](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/locales/vi/installationAcceptanceMinute.json)
Bổ sung đầy đủ namespace và các từ khóa tiếng Việt cho:
- `dialog.otherRoleConfirm`: Title vai trò, tiêu đề xác nhận QLSX/Tổ trưởng, badge, hướng dẫn, trạng thái đã xác nhận, kết quả đánh giá QC (Đạt, Sửa, Chế tạo lại), thông số lỗi (SL lỗi, Chi phí thiệt hại), thông tin dòng/tổ/công đoạn/chi phí, nút Từ chối / Đồng ý.
- `dialog.qcReady`: Tiêu đề chuẩn bị phiên nghiệm thu, chọn tổ lắp đặt, chọn người QLSX, gửi lời mời, đếm ngược SLA, danh sách thành viên tham gia, nút bắt đầu phiên.
- `dialog.qcConfirm`: Nhập số liệu thực tế, dung sai khối lượng, cảnh báo vượt SL thiết kế.
- `dialog.qcResult`: Form cập nhật kết quả QC, hình thức xử lý, SL thiệt hại, giá trị thiệt hại.
- `filter`: Nhãn bộ lọc chi tiết cho Công đoạn, Chi phí lắp đặt, Tiêu chuẩn lắp đặt, Đơn vị tính, Nguồn nhân công (Nội bộ, Thầu phụ, Gia công ngoài), Tổ lắp đặt.
- `actions`: Xem chi tiết, xóa, in ấn, bắt đầu phiên, tham gia phiên.

---

### Component 3: Frontend UI Components & Khắc Phục Lỗi Vi Phạm Chuẩn

#### [MODIFY] [other-role-confirm-dialog.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-acceptance-minute/-components/other-role-confirm-dialog.tsx)
- Tích hợp `useTranslation(['installationAcceptanceMinute', 'common', 'action'])`.
- Xóa bỏ 100% hardcoded text strings trong JSX, thay bằng `t('installationAcceptanceMinute:...')`.

#### [MODIFY] [qc-ready-dialog.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-acceptance-minute/-components/qc-ready-dialog.tsx)
- **Loại bỏ inline `useQuery` và gọi trực tiếp `employeeService.getPaged`**: Chuyển sang sử dụng `useEmployee` hook (tuân thủ nguyên tắc cấm gọi API trực tiếp trong UI component).
- Tích hợp `useTranslation(['installationAcceptanceMinute', 'common', 'action'])`.
- Bản địa hóa 100% giao diện sang i18n.

#### [MODIFY] [acceptance-minute-form.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-acceptance-minute/-components/acceptance-minute-form.tsx)
- Đồng bộ schema chi tiết `createAcceptanceMinuteDetailSchema`: Bổ sung `rawMatBomId`, `equipmentBomId`, `semiFinishedGoodId`, `semiFinishedGoodModelId`, `projectProductItemId`, `standardFactor`, `methodFactor`, `costCoefficient`, `proposalCode`, `unitPrice`, `estStartDate`, `estEndDate`, `process`.
- Khi chọn `InstallationOrder` (hoặc qua `useRefDocMapping`), map trọn vẹn các thông tin BOM, BTP, hệ số, đơn giá từ `InstallationOrderDetail` vào state `details`.

#### [MODIFY] [index.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/bizdoc/src/routes/_app/installation-management/installation-acceptance-minute/index.tsx)
- **Thay thế `<input type="radio">` bằng `Checkbox` của `@shared/ui`** tại cột `isBaseOnQty` trong bảng con Master-Detail (tuân thủ quy định cấm dùng raw HTML).
- **Chuẩn hóa cột thao tác `actions` bằng `ActionStack`** (`ActionStack actions={actions} size="sm" iconOnly />`).
- Chuẩn hóa toàn bộ text trong bảng và bộ lọc chi tiết `toolbarProps.renderFilterContent` để sử dụng đúng namespace `installationAcceptanceMinute`.

---

## 4. Verification Plan

### Automated Tests / Typecheck
- Chạy kiểm tra biên dịch backend:
  ```powershell
  dotnet build backend/src/Services/ServiceDesk/ServiceDesk.API/ServiceDesk.API.csproj
  ```
- Chạy kiểm tra kiểu TypeScript trên frontend:
  ```powershell
  pnpm --filter bizdoc exec tsc --noEmit
  ```

### Manual Verification
- Kiểm tra trang danh sách `/_app/installation-management/installation-acceptance-minute`:
  - Bảng chính hiển thị đủ các cột, icon ActionStack, badge trạng thái WorkItem.
  - Bảng phụ chi tiết (Master-Detail): không dùng raw HTML input, hiển thị icon Checkbox đẹp mắt, tìm kiếm và lọc qua Popover không có text hardcode.
- Mở form tạo mới (Sheet trượt 85% width):
  - Chọn Lệnh lắp đặt: dữ liệu chi tiết dòng lệnh đổ đầy đủ vào bảng con (kèm BOM, BTP, hệ số, đơn giá).
- Kiểm tra các Dialogs:
  - Mở `QCReadyDialog`, `QcConfirmDialog`, `OtherRoleConfirmDialog`: toàn bộ chữ hiển thị đúng ngôn ngữ qua i18n, không bị vỡ giao diện hay lỗi console.
