# Kế hoạch tạo script Alias & Sinh câu lệnh EF Core Migration nhanh

Tạo script tiện ích (`scripts/ef.sh` và shortcut `ef.sh` ở root, kèm `scripts/ef.ps1` cho PowerShell) giúp lập trình viên tạo, sinh nhanh câu lệnh `dotnet ef migrations` (add, remove, update, list, script) mà không cần phải nhớ đường dẫn dài dòng của các dự án Data và API trong `backend/src/Services/`.

## 1. Mục tiêu & Yêu cầu

- Hỗ trợ nhanh cho 7 microservices trong dự án:
  - `sd` / `servicedesk`: ServiceDesk
  - `doc` / `bizdoc` / `bd`: BusinessDocument
  - `crm`: CRM
  - `erp`: ERP
  - `hr`: HR
  - `md` / `masterdata`: MasterData
  - `wf` / `workflow`: WorkFlow
- Cung cấp 3 chế độ sử dụng linh hoạt:
  1. **Chế độ Alias (sourcing `source ./ef.sh`)**: Xuất các hàm alias (`ef`, `ef-add`, `ef-rm`, `ef-up`, `ef-ls`, `ef-sql`) vào shell hiện tại hoặc thêm vào `~/.bashrc`.
  2. **Chế độ CLI nhanh**:
     - `ef add sd Add_Some_Table`
     - `./ef.sh add erp Add_Order_Fields`
     - Tự động sinh câu lệnh chuẩn, copy vào clipboard (`clip.exe` / `pbcopy`), hiển thị câu lệnh và hỏi có muốn chạy ngay không (`y/N`).
     - Hỗ trợ cờ `--print` / `-p` (chỉ in câu lệnh, không chạy), `--run` / `-y` (chạy luôn).
  3. **Chế độ Tương tác (Interactive Wizard)**:
     - Chạy `./ef.sh` không kèm tham số -> hiển thị menu chọn chức năng (Add/Remove/Update/List/Script), chọn Service từ danh sách (1-7), nhập tên Migration.
- Tự động định vị root của repo Git (`git rev-parse --show-toplevel`) để chạy được từ bất kỳ thư mục con nào.

---

## 2. Chi tiết các file sẽ tạo

### [NEW] [scripts/ef.sh](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/scripts/ef.sh)
Script bash chính thực hiện:
- Phân tích tham số CLI và định tuyến lệnh (`add`, `remove`, `update`, `list`, `script`).
- Ánh xạ alias dịch vụ (sd, doc, crm, erp, hr, md, wf).
- Tự động copy câu lệnh sinh ra vào Clipboard Windows (`clip.exe`) / macOS (`pbcopy`) / Linux (`xclip`, `wl-copy`).
- Chế độ interactive trực quan với màu sắc terminal ANSI.
- Khả năng `source ./scripts/ef.sh` để tải các alias:
  - `ef`: Mở wizard hoặc điều hướng CLI
  - `ef-add <svc> <name>`: Sinh câu lệnh add migration
  - `ef-rm <svc>`: Sinh câu lệnh remove migration cuối
  - `ef-up <svc> [target]`: Sinh câu lệnh database update
  - `ef-ls <svc>`: Liệt kê các migration
  - `ef-sql <svc> [from] [to]`: Sinh file SQL script

### [NEW] [ef.sh](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/ef.sh)
Shortcut script ở thư mục root chuyển tiếp tới `scripts/ef.sh` để dev chỉ cần gõ `./ef.sh` ngay tại root.

### [NEW] [scripts/ef.ps1](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/scripts/ef.ps1) & [ef.ps1](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/ef.ps1)
Script PowerShell tương ứng cho lập trình viên chạy trên Windows PowerShell / Windows Terminal (`. .\ef.ps1`, `ef-add sd Add_MyEntity`).

### [NEW] [docs/EF_MIGRATION_CLI.md](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/docs/EF_MIGRATION_CLI.md)
Tài liệu hướng dẫn sử dụng nhanh, cách cấu hình vĩnh viễn vào `~/.bashrc` (Git Bash) hoặc `$PROFILE` (PowerShell).

---

## 3. Kế hoạch kiểm thử (Verification Plan)

- Chạy test script bash với các case:
  - `./scripts/ef.sh --help`
  - `./scripts/ef.sh add sd Test_Migration_Name -p` (kiểm tra chuỗi câu lệnh sinh ra đúng project và startup-project)
  - `./scripts/ef.sh rm erp -p`
  - `./scripts/ef.sh up doc -p`
  - `./scripts/ef.sh ls hr -p`
  - Kiểm tra tính năng copy vào clipboard bằng `clip.exe`.
  - Test script PowerShell `scripts/ef.ps1` với các tham số tương tự.
