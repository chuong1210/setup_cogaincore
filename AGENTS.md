# CogainCore Project Operating Contract (AGENTS.md)

This is the primary operating contract for AI agents (Codex CLI, Claude Code, Cursor, Antigravity, Copilot, etc.) working on the `cogain-core` codebase. All instructions and constraints defined herein are non-negotiable and strictly enforced.

---

## 1. Project Architecture & Monorepo Overview

`cogain-core` is an enterprise ERP / HRM / CRM platform composed of two core tiers:
- **Backend (`/backend`)**: ASP.NET Core (.NET 9) microservices architecture (`HR`, `MasterData`, `ServiceDesk`, `WorkFlow`, `BusinessDocument`, `ERP`, `Reporting`) using Entity Framework Core, PostgreSQL, GuidV7, AutoFilter, and Ocelot API Gateway.
- **Frontend (`/frontend`)**: Modern React 19 + TypeScript monorepo managed via `pnpm` workspaces (`bizdoc`, `crm`, `erp`, `helpdesk`, `hrm`, `interactive`, `workflow`, `shared`), built with Vite, `@tanstack/react-router`, `@tanstack/react-query` v5, TailwindCSS v4, and Radix UI / shadcn.

---

## 2. Common Build, Dev, Test & Lint Commands

### Frontend (`/frontend` via root `pnpm`)
- **Start Dev Server for a package**:
  - BizDoc: `pnpm bizdoc dev`
  - CRM: `pnpm crm dev`
  - ERP: `pnpm erp dev`
  - HR: `pnpm --filter @cogain/hrm dev`
  - Interactive: `pnpm inter dev`
  - Workflow: `pnpm workflow dev`
  - HelpDesk: `pnpm helpdesk dev`
- **Lint all frontend apps**: `pnpm lint`
- **Auto-fix lint errors**: `pnpm lint:fix`
- **Typecheck**: `pnpm --filter [package-name] typecheck`

### Backend (`/backend` via `dotnet CLI`)
- **Build Entire Solution**: `dotnet build backend/CogainSolution.sln`
- **Build Specific Service**: `dotnet build backend/src/Services/[ServiceName]/[ServiceName].API`
- **Run Tests**: `dotnet test backend/CogainSolution.sln`
- **Merge Ocelot Gateway Config**: `node backend/merge-ocelot.js`

---

## 3. Mandatory Non-Negotiable Project Rules

### 3.1. Database Migrations (CRITICAL)
- **NEVER** run Entity Framework migration commands automatically (e.g., `dotnet ef migrations add`, `dotnet ef database update`).
- The generation and execution of migrations must strictly be left to the developer to execute manually.
- When scaffolding or modifying entities, do not attempt to run or update database migrations on behalf of the user.

### 3.2. Frontend Data Fetching & Service Encapsulation
- **NEVER** call API services directly or write raw inline `useQuery`/`useMutation` inside UI components, `.tsx` files, or route pages (e.g. `service.getPaged(...)`, `service.exportData()`, `service.create(...)`).
- All data queries and mutations **MUST** be encapsulated inside dedicated custom hooks (`use<Entity>`). UI components only consume the hook.
- Data export **MUST** use `exportDataMutation.mutateAsync` followed by `useFile().downloadFile(...)` with `EUploadType.Sftp` and `toastSuccess`. **NEVER** use raw `window.open(res.data)`.
- Import template **MUST** use `getTemplateImport.mutateAsync()` followed by `useFile().downloadFile(...)`.

### 3.3. Strict Ban on Raw HTML Form Controls (Use Shared Components)
- **NEVER** use raw native HTML form tags: `<select>`, `<option>`, `<input type="date">`, `<input type="time">`, `<input type="number">`, or raw `<table>/<tr>/<td>`.
- **MANDATORY**: Always utilize pre-built project components from `@shared/components` and `@shared/ui`:
  - **Dropdowns / Selects**: `CustomSelect` (single), `CustomMultiSelect` (multi), `LazyCombobox` / `Combobox` (async/large), `TreeSelect` (hierarchical).
  - **Date & Time**: `DatePicker` (from `@shared/components/custom/date-picker` - supports `showTime={true}`), `DateRangeInput`.
  - **Numeric & Text Inputs**: `NumericInput`, `Input`, `DebouncedInput`.
  - **Tables**: `ResizableWrapTable`, `SortableWrapTable`, `CustomTable`.

### 3.4. Required Base Columns on Business Data Tables
All business ticket and document data tables ("Phiếu nghiệp vụ") **MUST** display a minimum of 4 foundation columns:
1. **Mã phiếu**: Text link (click opens detail/drawer), sticky pinned to left edge on horizontal scroll, sorts by code string.
2. **Trạng thái phiếu**: Status Tag/Badge styled according to Design System tokens, sorts by status code/order.
3. **Ngày tạo**: Combined 2-line cell (Multi-line cell):
   - Line 1: `[Calendar Icon]` + `DD/MM/YYYY HH:mm`
   - Line 2: `[User Icon]` + `Username / Mã nhân viên tạo`
   - Sort: timestamp of `created_at`.
4. **Ngày cập nhật**: Combined 2-line cell (Multi-line cell):
   - Line 1: `[Calendar Icon]` + `DD/MM/YYYY HH:mm`
   - Line 2: `[User Icon]` + `Username / Mã nhân viên cập nhật`
   - Sort: timestamp of `updated_at`.

### 3.5. Ticket & List Page Filter Standards (1:1 Mapping & FilterPopover)
- **NEVER** place raw inline `<select>` elements, search inputs, or ad-hoc filter toolbars directly in the page header or action bar.
- **MANDATORY**: 100% of ticket filters must collapse into a dedicated `<[Ticket]FilterPopover>` component using `FilterPopoverLayout` (from `@shared/components`) or `Popover` (from `@shared/ui`). *(Sole exception: Interactive/Inter module displays a filter row below Header).*
- **Anchor & Positioning**: Anchored directly below the `[Lọc]` button, right edge strictly aligned with the right edge of the `[Lọc]` button. Auto-closes when clicking outside or clicking the `[X]` close icon.
- **1:1 Mapping Rule (Bảng có cột nào thì Drawer bộ lọc có trường đó)**:
  - Every visible data column on the table **MUST** have a corresponding filter field in the filter popover.
  - **Exclusions**: Technical columns (Checkbox, STT, Actions), Media columns (Images, Attachments), and Long free-text columns (Notes/Descriptions not indexed in DB).
- **Input Types Corresponding to Table Columns**:
  - *Date / Time*: `DateRangeInput` / Date-range picker (Từ ngày – Đến ngày).
  - *Entity / Master Data (Created by, Updated by, Customer, Market, Employee...)*: `CustomSelect` / `CustomMultiSelect` / `LazyCombobox` with quick search, loaded from Master Data API.
  - *Status / Workflow*: `CustomSelect` with fixed list, supporting single or multi-select.
  - *Identifiers (Mã phiếu, Báo giá, PO...)*: `Input` (exact or contains).
  - *Quantity / Amount*: Number Range (Từ giá trị – Đến giá trị).
- **Popover Internal Layout**:
  - **Header**: Title "Bộ lọc" + `[X]` close icon at top-right.
  - **Base Filter Fields (First)**: Trạng thái phiếu, Ngày tạo (Range), Thao tác lần cuối (Range).
  - **Business Filter Fields**: Placed directly below, matching the display order of columns on the table.
  - **Footer (Sticky at bottom)**:
    - `[Đặt lại]` (Button variant="outline"): Clears all inputs back to empty/default.
    - `[Áp dụng]` (Button variant="primary"): Dispatches query, closes popover, **automatically resets table to Page 1**, and updates the badge count on the Filter button (e.g., `Bộ lọc (3)`).
- **FilterPopoverLayout Implementation Guidelines**:
  - Always pass an explicit object to `current={{ status, fromDate, toDate, ... }}`.
  - Exclude pagination/sort params (`page`, `pageSize`, `sortBy`, `sortOrder`, `searchCondition`, `q`) to avoid false positive active filter counts on page load.
  - Master Data schemas use `status` (number: 0/1/2/3); WorkItem schemas use `statusCode` (string) or `stepId`.
  - Date ranges must use `DateRangeInput` with `onChange` propagating values into draft filter state.
  - Applying or clearing filters must reset `page: 1`: `updateFilters({ ...values, page: 1 })`.
  - Sync all filter keys in `useTableChange({ filterKeys: [...] })` and in the TanStack Router route schema (`PostSearchSchema`).

### 3.6. Clean Table Header & Single-Sort Mechanism
- **Clean Header Standard**: 100% eliminate filter funnel icons, search inputs, or dropdown menus from individual column header cells. Header cells strictly consist of: `[Tên cột] + [Icon Sort]`.
- **Sort Icons**:
  - Default (unsorted): `⇅` (neutral muted gray).
  - Ascending: `↑` (active highlight primary).
  - Descending: `↓` (active highlight primary).
  - All sortable columns MUST display the sort icon (never leave a sortable column without an icon).
- **Single-Sort Mechanism**:
  - System applies sorting on strictly **ONE** column at a time.
  - Click progression on the same column: Default (`⇅`) ➔ Ascending (`↑`) ➔ Descending (`↓`) ➔ Unsorted (`⇅`).
  - Clicking sort on Column B immediately cancels sorting on Column A, resetting Column A to `⇅`.

### 3.7. Top Action Bar Standards (Order & Geometry)
The top toolbar above the Data Table must strictly adhere to the following left-to-right order:
`[ Ô Tìm kiếm ] ──> [ Nút Bộ lọc ] ──> [ Import ] ──> [ Export ] ──> [ + Thêm mới ] ──> [ Vạch phân cách ] ──> [ ⚙ Cài đặt cột ]`

- **Ô Tìm kiếm (Quick Search)**: Leftmost position, clear placeholder (e.g., "Tìm kiếm theo mã, tên..."), search icon, and `[X]` clear button.
- **Nút Bộ lọc (Filter Button)**: Funnel icon + label "Bộ lọc" + badge showing count of active filters if `> 0` (e.g., `Bộ lọc (2)`). Opens Filter Popover.
- **Nút Import / Export**: Secondary / Outline button. Displayed only when import/export is enabled.
- **Nút Thêm mới (+)**: Primary button in brand accent color. Always placed before column settings.
- **Vạch phân cách (Divider)**: Vertical line: `width: 1px`, `height: 20px`, color `#E5E5E5` (`--Colors-Border-secondary`), margin `8px` on both sides, vertically centered.
- **Nút Cài đặt cột [⚙]**: Rightmost position, square `36px × 36px`, border `1px solid #E5E5E5`, rounded `8px-12px`, centered icon. Opens Popover with show/hide checkboxes, drag-and-drop column reordering, and reset to default button.
- **Height Uniformity**: All inputs and buttons in the Action Bar MUST have a uniform height of **36px** (`h-9` / `height: 36px`).

### 3.8. Data Table Golden Rule: Column Content Alignment
> [!IMPORTANT]
> **GOLDEN RULE OF COLUMN ALIGNMENT**: The Column Header and Data Cells in the Table Body **MUST SHARE THE EXACT SAME ALIGNMENT**. Never center the header while left-aligning cell content!

| Data Group | Header Alignment | Body Cell Alignment | Examples | Component Configuration |
| :--- | :--- | :--- | :--- | :--- |
| **Text / Long Strings**<br>(*Văn bản / Chuỗi dài*) | **Left (Trái)** | **Left (Trái)** | Worker name, Process stage, Project, Team, Production order, Customer name, Description, Address | `CustomTable`: `meta: { align: 'left' }`<br>`ResizableWrapTable`: `align: 'left'`<br>`SortableWrapTable`: `align: 'left'` |
| **Quantitative Data & Currency**<br>(*Số liệu định lượng & Tiền tệ*) | **Right (Phải)** | **Right (Phải)** | Unit price, Amount, Quantity, Days, Volume, Discount | `CustomTable`: `meta: { align: 'right' }`<br>`ResizableWrapTable`: `align: 'right'`<br>`SortableWrapTable`: `align: 'right'` |
| **Short Identifiers & Timestamps**<br>(*Mã định danh ngắn & Thời gian*) | **Center (Giữa)** | **Giữa (Center)** | Execution date, End date, Start time, End time, Created date, Updated date (`ModifierInfo` 2 lines), STT, Short Code | `CustomTable`: `meta: { align: 'center' }`<br>`ResizableWrapTable`: `align: 'center'`<br>`SortableWrapTable`: `align: 'center'` |
| **Status Components & Actions**<br>(*Thành phần Trạng thái & Thao tác*) | **Giữa (Center)** | **Giữa (Center)** | Row selection Checkbox, Status Badges (`StatusTag`), Action buttons (Edit, Delete) | `CustomTable`: `meta: { align: 'center' }`<br>`ResizableWrapTable`: `align: 'center'`<br>`SortableWrapTable`: `align: 'center'` |

```tsx
// Column definition example for CustomTable:
const columns: ColumnDef<IDeliveryVehicleType>[] = [
  { id: 'select', meta: { align: 'center' }, ... },
  { accessorKey: 'code', meta: { width: 150, align: 'center' }, ... },
  { accessorKey: 'name', meta: { width: 250, align: 'left' }, ... },
  { accessorKey: 'status', meta: { width: 150, align: 'center' }, cell: ({ row }) => <StatusTag status={row.getValue('status')} /> },
  { id: 'lastModifiedDate', meta: { width: 180, align: 'center' }, cell: ({ row }) => <ModifierInfo ... /> },
  { id: 'actions', meta: { width: 120, align: 'center' }, cell: ({ row }) => <div className="flex justify-center gap-2">...</div> },
];
```

### 3.9. Sub-Table & Attached Tabs (Zero-Gap Rule)
For detail tables and child material lists:
- **Zero-Gap Rule**: The Tab bar must attach directly flush to the top edge of the Sub-Table: `margin-bottom: 0`, `gap: 0`. Tab height: 32px – 36px.
- **Special Top-Left Border Radius**: The overall table wrapper has `border-radius: 12px`, but the **Top-Left corner MUST be 0px** (`border-top-left-radius: 0px` / `rounded-tl-none`) to seamlessly merge with the tab above.
- **Sub-Table Header**: Min-height `44px`, background `--Colors-Background-selected-primary` (DocMag: Teal-50 `#E8F7F0`), title text dark and readable (`--Colors-Teal-900: #004024` or `--Colors-Foreground-base`), `font-weight: 600` (Semibold).

### 3.10. Ticket Slideout Form Standards (85% Width Sheet & 3-Section Architecture)
Form components for business tickets and request documents ("Phiếu") must **NEVER** be modal dialogs. They must always use a slideout `Sheet` (`side="right"`) standardized strictly to **85% width**:
```tsx
<SheetContent
  side="right"
  className="w-full sm:max-w-[85%] p-0 gap-0 border-l shadow-xl flex flex-col"
  onInteractOutside={(e) => e.preventDefault()}
>
```

- **3-Section Fixed Structure**:
  1. **Header (Pinned Top)**: Padding `py-3 px-5` (dọc 12px, ngang 20px), border-bottom `1px solid #E5E5E5`. Title `text-lg` or `text-xl`, font-semibold, brand color (`--Colors-Foreground-primary`). Back/Close button `[←]`: `36px × 36px`, rounded `8px`, border `1px solid #E5E5E5`, icon `20px × 20px` centered.
  2. **Main Content (Scrollable)**: Dedicated scroll container (`overflow-y: auto`), padding `20px` (`p-5`), vertical gap between major sections: `16px` (`gap-4`).
  3. **Footer (Pinned Bottom)**: Sticky at bottom (`position: sticky; bottom: 0; z-index: 50`), padding `py-3 px-5`, border-top `1px solid #E5E5E5`, background `#FFFFFF`. Right-aligned buttons with height `36px`, rounded `8px`:
     - `[Hủy]` (Secondary): Border `1px solid #E5E5E5`, text gray `#424242`.
     - `[Lưu] / [Áp dụng]` (Primary): Brand background (`--Colors-Background-primary`), text white `#FFFFFF`, font-semibold.
- **General Information Section ("Thông tin chung" Card Frame)**:
  - Section Title: Placed **outside** the Card, `16px` (`text-base`), font-semibold, color `#141414`, margin-bottom `8px`.
  - Form Container Card: Background `--Colors-Background-secondary` (`#FAFAFA` / `--Colors-Gray-50`), rounded `12px` (`rounded-xl`), padding `16px` (`p-4`), row spacing `12px` (`gap-3`).
- **Field Spacing Rules**:
  - **Related Fields (Cụm liên kết mật thiết)**: Gap **8px** (`gap-2` / `spacing-md`). Applied to Address hierarchy (Province/District/Ward), Date ranges (From date – To date), Price ranges (From price – To price).
  - **Independent Fields (Trường độc lập)**: Gap **12px** (`gap-3` / `spacing-lg`).
- **Detail Table Section in Slideout ("Bảng chi tiết")**:
  - Section Title: `16px`, font-semibold.
  - `[+ Thêm dòng]` Button: Aligned flush to right edge on the same line as the title/tabs. Style: Secondary Outlined Primary (border `1px solid` brand color, background `#FFFFFF`, hover brand-50, text brand color, font-semibold, height `28px – 32px`, rounded `6px – 8px`).
  - Detail table adheres to Sub-Table rules (Zero-gap tabs, `rounded-tl-none`, header min-height 44px, Teal-50 background).

### 3.11. Mandatory Detail Table Search & Filter Popover
- **EVERY** child and detail table **MUST** have both search and filter configured on `ResizableWrapTable` via `toolbarProps`.
- The detail filter **MUST** render as a wide multi-column form popover: `renderFilterContent: (close) => <form className="space-y-4 w-200">` with responsive grid (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`) and Reset / Apply buttons.

### 3.12. Business & State Logic (Filter, Sort & Pagination Auto-Reset)
- **Maintain Filter on Sort**: Sorting any column must keep all active conditions from Quick Search and Filter Popover intact; only update `sort_by` and `sort_direction`.
- **Automatic Reset to Page 1**: The table **MUST** automatically reset to Page 1 (`page = 1`) whenever:
  1. A new keyword is submitted in Quick Search.
  2. The `[Áp dụng]` or `[Đặt lại]` button is pressed in the Filter Popover.
  3. A sort column or sort direction is toggled.
- **URL Query Sync**: Sync `page`, `page_size`, `search`, `filter`, `sort_by`, `order` with URL query parameters so browser refreshes preserve user state.

### 3.13. Navigation & Top Header Geometry
- **Header (Top Bar)**: Fixed height `60px` (`height: 60px; min-height: 60px`), sticky top (`position: sticky; top: 0; z-index: 100`). All child elements (Back, Search, Chat, Bell, Avatar) vertically centered (`align-items: center`). Avoid line-height mismatches that displace text.
- **Parent Nav (Primary Sidebar Cấp 1)**: Fixed width `64px`, background `#0F0F0F` (`--Colors-Background-base-invert`). Logo container `64px × 72px` centered. Menu icon containers `40px × 40px` with `border-radius: 12px` centered horizontally. Icons `20px × 20px` (default opacity 80%; selected opacity 100% with container background in brand accent `--brand-500`). Bottom toggle/footer with border-top `1px solid #E5E5E5`.
- **Sub-Nav (Secondary Sidebar Cấp 2)**: Typography `14px` Semibold (`text-sm font-semibold`), icon `16px × 16px` vertically centered. Default text `--Colors-Foreground-secondary`. Selected item: background `--brand-500`, text & icon pure white `#FFFFFF` (`--Colors-Text-white`), `border-radius: 8px` (`rounded-lg`), padding `8px 12px` (`py-2 px-3`).

### 3.14. Design Tokens & Multi-Brand 3-Layer Architecture
The system operates on a 3-layer design token architecture supporting automated multi-brand color switching:
- **Layer 0 (Primitives - Value)**: Base palettes (Base, Gray, Gray-blue, Gray-cool, Blue, Blue-light, Blue-dark, Blue-brand, Picton-Blue, Blue-ocean, Indigo, Cyan, Green, Green-light, Moss, Midnight-Navy, Orange, Ochre-Orange, Orange-dark, Fuchsia, Purple, Purple-brand, Purple-dark, Violet, Emerald, Teal, Deep-Teal, Red, Rose, Pink, Yellow, Yellow-light) and Spacing (0px to 1920px).
- **Layer 1 (Brands)**: Maps `--brand-*` tokens per module:
  - **DocMag / BizDoc**: Teal (`--Colors-Teal-*`, `--brand-500: #009955`)
  - **DocFlow**: Blue (`--Colors-Blue-brand-*`)
  - **CRM**: Ochre-Orange (`--Colors-Ochre-Orange-*`)
  - **Helpdesk**: Purple (`--Colors-Purple-brand-*`)
  - **Interactive**: Midnight-Navy (`--Colors-Midnight-Navy-*`)
  - **WorkFlow**: Deep-Teal (`--Colors-Deep-Teal-*`)
  - **HRM**: Indigo (`--Colors-Indigo-*`)
  - **ERP**: Blue-light / Indigo
- **Layer 2 (Modes / Semantics)**: Semantic tokens consumed directly on UI components:
  - *Foreground*: `Colors-Foreground-base` (#141414), `Colors-Foreground-secondary` (#424242), `Colors-Foreground-primary` (`var(--brand-500)`), `Colors-Foreground-error`, `warning`, `success`.
  - *Border*: `Colors-Border-secondary` (#E5E5E5), `Colors-Border-primary` (`var(--brand-500)`), `Colors-Border-base` (#CCCCCC).
  - *Background*: `Colors-Background-base` (#FFFFFF), `Colors-Background-secondary` (#FAFAFA), `Colors-Background-base-invert` (#0F0F0F), `Colors-Background-selected-primary` (`var(--brand-50)`), `Colors-Background-primary` (`var(--brand-500)`).
  - *Accents*: `Accent-{purple, red, green, gray, gray_blue, blue_light, blue, indigo, rose, orange}-{bg, bg_hover, brd, fg, bg-solid}`.
  - *Shadows*: `Shadows/shadow-md` (`box-shadow: 0px 2px 4px -2px rgba(16, 24, 40, 0.05), 0px 4px 8px -2px rgba(16, 24, 40, 0.10);`).
> [!CAUTION]
> **STRICT BAN ON HARDCODED HEX COLORS**: NEVER hardcode hex codes (e.g., `#009955`, `#E5E5E5`, `#FAFAFA`) directly in UI components. Always use Layer 2 Semantic CSS Variables or Tailwind semantic utility classes (`bg-primary`, `text-primary`, `bg-sub-primary`, `border-border`, `text-foreground`, etc.).

### 3.15. Strict Zero Hardcoded Text Rule (MANDATORY i18n)
- **NEVER** hardcode text strings anywhere in UI components, JSX, or table column configurations (e.g., `header: 'Loại hình'`, `<h1 className="...">Quản lý Tờ khai Hải quan</h1>`, `<Button>Xuất Excel</Button>`, `<Button>+ Tạo Tờ khai</Button>`, placeholders, toasts, dialog titles).
- **EVERY** single string visible to users **MUST** be localized using `useTranslation` with proper namespaces and fallback `defaultValue`:
  ```tsx
  t('namespace:key', { defaultValue: 'Default Text' })
  ```

### 3.16. Resource Version Badge (`ResourceVersionBadge`)
All business documents and request ticket views must display `ResourceVersionBadge` in:
1. Detail view header (`WorkItemDetailLayout`).
2. Slideout Sheet header (`SheetTitle`).
3. List page header (`index.tsx`).

---

## 4. Secret Handling & Agent Session Hygiene

- **NEVER** print, log, or commit passwords, API keys, tokens, or connection strings in code, PRs, transcripts, or terminal outputs.
- Database credentials and secrets are managed exclusively through `.env` files or secure environment variables.
- All sensitive environment variable patterns (`*KEY*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*`, `*AUTH*`, `DATABASE_URL`, `CONNECTION_STRING`) are excluded from Codex/Claude shell snapshots.

---

## 5. Definition of Done & Task Closure

A task is considered complete when:
1. All changes adhere strictly to the project rules defined in this file and child rule files.
2. Code compiles cleanly without TypeScript, linter, or C# errors (`pnpm lint`, `dotnet build`).
3. **Frontend Verification**:
   - UI forms use 85% width slideout sheet (`SheetContent side="right" className="w-full sm:max-w-[85%]..."`).
   - All text uses `useTranslation` with fallback `defaultValue`.
   - Data mutations use encapsulated custom hooks.
   - Tables use `ResizableWrapTable` / `SortableWrapTable` with `toolbarProps`.
   - Table headers are clean (no inline filters) and use single-sort.
   - Column alignment strictly matches between Header and Body cells.
   - Filter Popover implements 1:1 column mapping and auto-resets pagination to Page 1.
   - Design tokens use Layer 2 CSS variables with zero hardcoded Hex values.
4. **Backend Verification**:
   - Entities and DTOs use `record` syntax and inherit `EntityAuditBase<Guid>`.
   - Migration scripts are NOT executed; user is informed if a migration is required.
   - Routes and DI are cleanly configured.

---

## 6. Escalation Protocol

If you encounter:
- Ambiguous requirements or conflicting domain logic: Stop, explain the trade-offs, and ask the user for clarification.
- An unexpected database schema mismatch: Point out the issue and suggest the entity/configuration changes without running migrations.
- Missing shared components: Inspect `@shared/components` or `@shared/ui` before creating any new abstractions.
