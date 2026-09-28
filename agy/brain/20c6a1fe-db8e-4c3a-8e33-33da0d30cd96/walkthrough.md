# Codex CLI Setup Walkthrough for CogainCore

Đã hoàn thành thiết lập môi trường và cấu hình dự án toàn diện cho **Codex CLI** (`@openai/codex` v0.156.0) theo chuẩn tài liệu tham khảo 2026 của Blake Crosley.

---

## Các thành phần đã triển khai

### 1. Hệ thống cấu hình Codex (`.codex/`)
- [config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/config.toml): Cấu hình base cho dự án:
  - **Model:** `gpt-5.6-sol` (phân hạng "Power", reasoning level `medium`) làm fallback ổn định.
  - **Sandbox & Quyền:** `sandbox_mode = "workspace-write"`, `approval_policy = "on-request"`.
  - **Bảo mật môi trường:** Che giấu các biến môi trường nhạy cảm (`*KEY*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*`, `*AUTH*`, `DATABASE_URL`, `CONNECTION_STRING`).
  - **Nhận diện Root:** Nhận diện `.git`, `pnpm-workspace.yaml`, `backend/CogainSolution.sln`.
- **Profiles (`.codex/<name>.config.toml`)**:
  - [fast.config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/fast.config.toml): Sử dụng `gpt-5.6-luna` với `low` reasoning cho tác vụ nhanh, format, sửa lỗi nhỏ.
  - [careful.config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/careful.config.toml): Sử dụng `gpt-5.5` với `xhigh` reasoning, `read-only` sandbox cho audit bảo mật và thiết kế kiến trúc.
  - [ci.config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/ci.config.toml): Dành cho headless CI/CD với `approval_policy = "never"`.
- [hooks.json](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/hooks.json):
  - PreToolUse hook tự động chặn các lệnh tự động chạy migration EF (`dotnet ef migrations add`, `dotnet ef database update`).

---

### 2. Cây chỉ thị phân cấp (Hierarchical `AGENTS.md`)
Codex CLI tự động duyệt và gộp các file `AGENTS.md` theo cấu trúc thư mục từ trên xuống dưới:
- [AGENTS.md (Root)](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/AGENTS.md):
  - Kiến trúc tổng thể Monorepo (.NET microservices + React 19 pnpm workspaces).
  - Lệnh dev, build, lint, test cho cả frontend và backend.
  - 7 quy tắc cốt lõi bắt buộc: nghiêm cấm tự chạy EF migration, custom hook bắt buộc cho API, cấm dùng raw HTML form controls, chuẩn FilterPopover, chuẩn slideout Sheet 85% width cho phiếu, chuẩn bảng chi tiết có search/filter, chuẩn bắt buộc i18n không hardcode text.
  - Quy tắc bảo mật secrets và tiêu chuẩn nghiệm thu (Definition of Done).
- [frontend/AGENTS.md](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/AGENTS.md):
  - Kế thừa tự động khi Codex làm việc trong thư mục `frontend/`.
  - Quy chuẩn React 19 + TypeScript strict mode, Zod inference, Radix/Tailwind components, `ResizableWrapTable`, `SortableWrapTable`, `ResourceVersionBadge`.
- [backend/AGENTS.md](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/AGENTS.md):
  - Kế thừa tự động khi Codex làm việc trong thư mục `backend/`.
  - Quy chuẩn C# 12+ `record` syntax, `EntityAuditBase<Guid>`, GuidV7, `DateTimeOffset`, DTO hợp nhất, `[AutoFilter]`, `BaseService`, BaseController, và định tuyến Ocelot qua `appsettings.json`.

---

### 3. Di chuyển Skills (`skills/`)
- Đã sao chép toàn bộ **70 skills** từ `.agents/skills/` sang thư mục gốc [skills/](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/skills) theo đúng vị trí khám phá mặc định của Codex CLI.
- Bao gồm các skills đặc thù dự án:
  - `cogain-frontend-crud`, `cogain-backend-crud`, `cogain-frontend-master-data`, `cogain-request-ticket`, `cogain-backend-cross-service-table`, `api-backend`.
- Các skills chất lượng cao:
  - Bộ `antislop*`, `code-review*`, `diagnosing-bugs`, `tdd`, `frontend-design`, `improve-ui`, `vercel-react-best-practices`, `brainstorming`,...

---

## Hướng dẫn sử dụng với Codex CLI

1. **Khởi chạy Codex bình thường:**
   ```bash
   codex
   ```
2. **Khởi chạy với Profile cụ thể:**
   ```bash
   codex --profile fast "Sửa style cho bảng chi tiết packing list"
   codex --profile careful "Audit bảo mật cho auth endpoint"
   ```
3. **Kích hoạt Skill trong phiên làm việc:**
   - Dùng lệnh slash `/skills` hoặc gõ trực tiếp tên skill: `$cogain-frontend-crud`, `$cogain-request-ticket`, `$antislop`,...
   - Hoặc Codex sẽ tự động match skill theo mô tả tác vụ trong prompt của bạn.
4. **Kiểm tra cấu hình Codex:**
   ```bash
   codex /status
   codex /debug-config
   ```
