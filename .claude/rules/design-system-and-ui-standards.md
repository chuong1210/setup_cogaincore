---
trigger: model_decision
description: Technical Requirements, Design System Tokens, UI Layouts, Data Tables, Filter Popovers, and Slide-out Form standards for cogain-core.
---

---

## trigger: /frontend/

# CogainCore Technical Requirements & Design System Standards

This document establishes the official technical specifications and design system standards extracted from the project's technical requirement documents (`YÊU CẦU KỸ THUẬT` and `YÊU CẦU KỸ THUẬT - DESIGN SYSTEM`).

All frontend developers and AI agents must comply strictly with these requirements when implementing or refactoring user interfaces across all modules (`bizdoc`, `crm`, `erp`, `helpdesk`, `hrm`, `interactive`, `workflow`, `shared`).

---

## PART 1: DATA TABLE & ACTION BAR STANDARDS

### 1. Mandatory Foundation Columns on Data Tables
Every business document and workflow ticket list ("Phiếu nghiệp vụ") **MUST** render at least these 4 standard foundation columns:

| No. | Display Column | Cell Structure & Presentation | Sort Logic |
| :--- | :--- | :--- | :--- |
| **1** | **Ticket Code (`Mã phiếu`)** | Text link (click opens detail drawer/slideout), `sticky` pinned to left edge on horizontal scroll. | Sort by code string |
| **2** | **Ticket Status (`Trạng thái phiếu`)** | Color Status Tag / Badge according to Design System tokens. | Sort by status code / sequence |
| **3** | **Creation Date (`Ngày tạo`)** | **Multi-line cell (2 lines)**:<br>• Line 1: `[Calendar Icon]` + `DD/MM/YYYY HH:mm`<br>• Line 2: `[User Icon]` + `Username / Staff Code` | Sort by timestamp of `created_at` |
| **4** | **Last Update Date (`Ngày cập nhật`)** | **Multi-line cell (2 lines)**:<br>• Line 1: `[Calendar Icon]` + `DD/MM/YYYY HH:mm`<br>• Line 2: `[User Icon]` + `Username / Staff Code` | Sort by timestamp of `updated_at` |

*Note*: Creation Date and Update Date MUST be combined into a 2-line cell (`ModifierInfo`) with their respective icons. Never split them into separate single-value columns.

---

### 2. Clean Table Header & Single-Sort Mechanism
- **Clean Header Standard**:
  - **100% ELIMINATE** filter funnels, search inputs, or dropdown menus from individual column header cells.
  - Header cells strictly consist of: `[Column Title] + [Sort Icon]`.
- **Sort Icon Specification**:
  - Default state (unsorted): Icon `⇅` (neutral muted gray / `text-muted-foreground`).
  - Ascending state: Icon `↑` (active highlight primary).
  - Descending state: Icon `↓` (active highlight primary).
  - Display sort icons for all sortable columns (never leave a sortable column without an icon).
- **Single-Sort Mechanism**:
  - The system applies sorting strictly to **ONE column at a time**.
  - Click sequence on the same column: `Default (⇅)` ➔ `Ascending (↑)` ➔ `Descending (↓)` ➔ `Unsorted (⇅)`.
  - Clicking sort on Column B immediately cancels sorting on Column A, resetting Column A to `⇅`.

---

### 3. Top Action Bar Standards (Order & Geometry)
The top action toolbar above the Data Table must strictly adhere to the following left-to-right order:

```
[ Quick Search ] ──> [ Filter Button ] ──> [ Import ] ──> [ Export ] ──> [ + Add New ] ──> [ Divider ] ──> [ ⚙ Column Settings ]
```

1. **Quick Search (`Ô Tìm kiếm`)**:
   - First position on the left.
   - Placeholder clearly indicates search scope (e.g., `"Search by code, name..."` / `"Tìm kiếm theo mã, tên..."`).
   - Includes search icon and `[X]` clear button.
2. **Filter Button (`Nút Bộ lọc`)**:
   - Funnel icon + label `"Bộ lọc"` (or `"Lọc"`).
   - Displays active filter badge count when `> 0` (e.g., `Bộ lọc (2)`).
   - Action: Click opens Filter Popover / Drawer.
3. **Import / Export Buttons (`Nút Import / Export`)**:
   - Secondary / Outline button style. Only visible on screens supporting import/export.
4. **Add New Button (`Nút Thêm mới [+]`)**:
   - Primary action button in brand accent color (`bg-primary text-primary-foreground`). Always placed before column settings.
5. **Divider (`Vạch phân cách`)**:
   - Placed between the action text button (`[+ Add New]`) and the icon settings button (`[⚙]`).
   - Vertical thin line: `width: 1px`, `height: 20px`, color `#E5E5E5` (`--Colors-Border-secondary`), vertically centered.
   - Margin: `8px` on both sides.
6. **Column Settings Button (`Nút Cài đặt cột [⚙]`)**:
   - Rightmost position of the Action Bar.
   - Fixed square size: **`36px × 36px`**.
   - Border: `1px solid #E5E5E5`, rounded `8px – 12px`, centered icon.
   - Click opens Popover showing all columns: Show/Hide checkboxes, Drag & Drop column reordering, Reset to default button.
7. **Uniform Geometry & Card Header**:
   - Uniform height: All inputs, action buttons, and icon buttons MUST have a **fixed height of 36px** (`height: 36px` / `h-9`).
   - Action Bar Container: Vertical padding `12px` (`py-3`), horizontal padding `16px` (`px-4`), rounded `12px` (`rounded-xl`), white background `#FFFFFF`, border `1px solid #E5E5E5`, 2-layer shadow `Shadows/shadow-md`:
     ```css
     box-shadow: 0px 2px 4px -2px rgba(16, 24, 40, 0.05), 0px 4px 8px -2px rgba(16, 24, 40, 0.10);
     ```

---

### 4. Golden Rule of Column Content Alignment
> [!IMPORTANT]
> **GOLDEN RULE OF COLUMN ALIGNMENT**: The Column Header and Data Cells in the Table Body **MUST SHARE THE EXACT SAME ALIGNMENT**. Never center the header while left-aligning cell content!

| Data Group | Header Alignment | Body Cell Alignment | Examples | Component Configuration |
| :--- | :--- | :--- | :--- | :--- |
| **Text / Long Strings**<br>(*Văn bản / Chuỗi dài*) | **Left (Trái)** | **Left (Trái)** | Worker name, Process stage, Project, Team, Production order, Customer name, Description, Address | `CustomTable`: `meta: { align: 'left' }`<br>`ResizableWrapTable`: `align: 'left'`<br>`SortableWrapTable`: `align: 'left'` |
| **Quantitative Data & Currency**<br>(*Số liệu định lượng & Tiền tệ*) | **Right (Phải)** | **Right (Phải)** | Unit price, Amount, Quantity, Days, Volume, Discount | `CustomTable`: `meta: { align: 'right' }`<br>`ResizableWrapTable`: `align: 'right'`<br>`SortableWrapTable`: `align: 'right'` |
| **Short Identifiers & Timestamps**<br>(*Mã định danh ngắn & Thời gian*) | **Center (Giữa)** | **Giữa (Center)** | Execution date, End date, Start time, End time, Created date, Updated date (`ModifierInfo` 2 lines), STT, Short Code | `CustomTable`: `meta: { align: 'center' }`<br>`ResizableWrapTable`: `align: 'center'`<br>`SortableWrapTable`: `align: 'center'` |
| **Status Components & Actions**<br>(*Thành phần Trạng thái & Thao tác*) | **Giữa (Center)** | **Giữa (Center)** | Row selection Checkbox, Status Badges (`StatusTag`), Action buttons (Edit, Delete) | `CustomTable`: `meta: { align: 'center' }`<br>`ResizableWrapTable`: `align: 'center'`<br>`SortableWrapTable`: `align: 'center'` |

#### Standard ColumnDef Configuration Example:
```tsx
// 1. Checkbox Row Selection (Center - Center)
{
  id: 'select',
  header: ({ table }) => <Checkbox ... />,
  cell: ({ row }) => <Checkbox ... />,
  meta: { align: 'center' },
}

// 2. Short Identifier / Code (Center - Center)
{
  accessorKey: 'code',
  header: t('deliveryVehicleType:columnTitle.code', { defaultValue: 'Mã loại' }),
  cell: ({ row }) => row.getValue('code'),
  enableSorting: true,
  meta: { width: 150, align: 'center' },
}

// 3. Text / Long String (Left - Left)
{
  accessorKey: 'name',
  header: t('deliveryVehicleType:columnTitle.name', { defaultValue: 'Tên loại' }),
  cell: ({ row }) => row.getValue('name'),
  enableSorting: true,
  meta: { width: 250, align: 'left' },
}

// 4. Status Badge (Center - Center)
{
  accessorKey: 'status',
  header: t('deliveryVehicleType:columnTitle.status', { defaultValue: 'Trạng thái' }),
  cell: ({ row }) => <StatusTag status={row.getValue('status')} />,
  enableSorting: true,
  meta: { width: 150, align: 'center' },
}

// 5. Timestamp / 2-Line ModifierInfo (Center - Center)
{
  id: 'lastModifiedDate',
  accessorKey: 'lastModifiedDate',
  header: t('common:modified', { defaultValue: 'Ngày cập nhật' }),
  cell: ({ row }) => (
    <ModifierInfo
      createdDate={row.original.createdDate}
      lastModifiedDate={row.original.lastModifiedDate}
      createdByUser={row.original.createdByUser}
      modifiedByUser={row.original.modifiedByUser}
    />
  ),
  enableSorting: true,
  meta: { width: 180, align: 'center' },
}

// 6. Action Buttons (Center - Center)
{
  id: 'actions',
  header: t('action:actions', { defaultValue: 'Thao tác' }),
  enableHiding: false,
  meta: { width: 120, align: 'center' },
  cell: ({ row }) => (
    <div className="flex justify-center gap-2">
      <Button variant="outline" size="sm" onClick={() => handleEdit(row.original.id)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleDelete(row.original.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  ),
}
```

---

### 5. Sub-Table & Attached Tabs (Zero-Gap Rule)
Applies to detail tables and child material lists:
- **Zero-Gap Rule**: The Tab container must attach directly flush to the top edge of the Sub-Table: `margin-bottom: 0`, `gap: 0`. Tab height: `32px – 36px`.
- **Sub-Table Border Radius**:
  - Overall border radius: `12px` (`rounded-xl`).
  - **Top-Left corner MUST be 0px** (`border-top-left-radius: 0px` / `rounded-tl-none`) to seamlessly merge with the tab above.
- **Sub-Table Header Row**:
  - Minimum height: `44px` (`min-height: 44px`).
  - Background color: Token `--Colors-Background-selected-primary` (For DocMag: Teal-50 `#E8F7F0`).
  - Title text color: Dark, readable text (`--Colors-Teal-900: #004024` or `--Colors-Foreground-base`), `font-weight: 600` (Semibold).

---

## PART 2: FILTER POPOVER & STATE MANAGEMENT

### 1. Scope & Exceptions
- 100% of ticket and list page filters must collapse into a dedicated **Filter Popover**.
- **Sole Exception**: The `Interactive` (Inter) module displays a filter row below the Header.
- **Positioning & Alignment**: Anchored directly below the `[Lọc]` button, right edge strictly aligned with the right edge of the `[Lọc]` button. Auto-closes when clicking outside or clicking the `[X]` close icon.

### 2. 1:1 Mapping Rule (Bảng có cột nào thì Drawer bộ lọc có trường đó)
- **Core Principle**: Every visible data column on the table **MUST** have a corresponding filter field in the filter popover.
- **Exclusion Rules** (Omit fields that cannot/should not be filtered):
  1. Technical columns: Row selection Checkbox, Row index (STT), Action buttons (View, Edit, Delete, Print...).
  2. Media / Attachments columns: Images, File attachments.
  3. Long free-text columns: Notes, Descriptions, Long task content (fields not indexed for search in DB).

### 3. Input Type Mapping Corresponding to Table Columns

| Table Column Data Type | Corresponding Filter Input Component | Technical Notes |
| :--- | :--- | :--- |
| **Date / Time Column** | `DateRangeInput` (From date – To date) | Use DatePicker from `@shared/components/custom/date-picker` |
| **Entity / Master Data Column** (Creator, Modifier, Customer, Market, Employee...) | `CustomSelect` / `CustomMultiSelect` / `LazyCombobox` | Quick search support, loaded from corresponding Master Data API |
| **Status / Workflow Column** | `CustomSelect` with fixed list | Supports single or multi-select |
| **Identifier / Code Column** (Ticket code, Quotation code, PO number...) | `Input` (Text Input) | Exact match or contains (`contains`) |
| **Quantity / Currency Column** | `NumericInput` Range (From value – To value) | Range inputs or min/max |

### 4. Layout Inside Filter Popover
- **Header**: Title "Bộ lọc" + `[X]` close icon at top-right.
- **Body**:
  1. **Base Filter Fields**:
     - Ticket Status (Dropdown select / multi-select).
     - Creation Date (Date-range picker: From date – To date).
     - Last Updated Date (Date-range picker: From date – To date).
  2. **Business Filter Fields**: Placed directly below, matching the display order of columns on the table.
- **Footer (Sticky at bottom)**:
  - `[Đặt lại]` (Secondary / Outline button): Clears all inputs back to empty/default.
  - `[Áp dụng]` (Primary button):
    - Dispatches query to server.
    - Closes Filter Popover.
    - **Automatically resets table to Page 1 (`page = 1`)**.
    - Updates active filter count badge on the Filter button (e.g., `Bộ lọc (3)`).

### 5. Business & State Logic
- **Maintain Filter on Sort**: Sorting any column must keep all active conditions from Quick Search and Filter Popover intact; only update `sort_by` and `sort_direction`.
- **Automatic Reset to Page 1 (Pagination Reset)**: The table **MUST** automatically reset to Page 1 (`page = 1`) whenever:
  1. A new keyword is submitted in Quick Search.
  2. The `[Áp dụng]` or `[Đặt lại]` button is pressed in the Filter Popover.
  3. A sort column or sort direction is toggled.
- **URL Query Sync**: Sync `page`, `page_size`, `search`, `filter`, `sort_by`, `order` with URL query parameters so browser refreshes preserve user state.

### 6. FilterPopoverLayout Implementation Patterns & Common Pitfalls
When integrating `FilterPopoverLayout` (from `@shared/components`):
1. **Explicit `current` Filter Object**:
   - Pass an explicit object `current={{ status, fromDate, toDate, ... }}` containing only the screen's active filter fields.
   - Do NOT pass raw `queryParams` directly without omitting pagination params (`page`, `pageSize`, `sortBy`, `sortOrder`, `searchCondition`, `q`), otherwise the filter button will erroneously display an active badge (e.g. `Bộ lọc (2)`) on initial page load.
2. **Status Key (`statusKey`)**:
   - Master Data: uses `status` (numeric enum: 0, 1, 2, 3).
   - Work Item / Tickets: uses `statusCode` (string code) or `stepId`.
3. **Date Range Input (`DateRangeInput`)**:
   - Use `DateRangeInput` for range selection and ensure `onChange` updates draft state.
4. **Automatic Reset to Page 1 (`page = 1`)**:
   ```tsx
   <FilterPopoverLayout
     current={{ status, fromDate, toDate }}
     onApply={(values) => updateFilters({ ...values, page: 1 })}
     onClear={(values) => updateFilters({ ...values, page: 1 })}
   >
     {/* Custom business filter inputs */}
   </FilterPopoverLayout>
   ```
5. **Declare Filter Keys in Router & Hook**:
   - Route schema (`PostSearchSchema` in `index.tsx`) must define all filter fields (`fromDate: z.string().optional()`, `toDate: z.string().optional()`, `status: z.coerce.number().optional()`).
   - `filterKeys` in `useTableChange` must list all filter keys:
     ```tsx
     const { updateFilters, handleSortingChange, handlePaginationChange } =
       useTableChange<IDeliveryVehicleTypeParams>({
         fullPath,
         searchData: queryParams,
         filterKeys: ['name', 'code', 'status', 'fromDate', 'toDate'],
       });
     ```

---

## PART 3: SLIDE-OUT DRAWER FORM STANDARDS (85% WIDTH RULE)

Forms for creating, editing, or viewing business tickets/documents must **NEVER USE MODAL DIALOGS**. They must always use a slideout `Sheet` (`side="right"`) standardized strictly to **85% width**:

```tsx
<SheetContent
  side="right"
  className="w-full sm:max-w-[85%] p-0 gap-0 border-l shadow-xl flex flex-col"
  onInteractOutside={(e) => e.preventDefault()}
>
```

### 1. 3-Section Fixed Architecture
1. **Header (Pinned Top)**:
   - Padding: Vertical `12px` (`py-3`), horizontal `20px` (`px-5`).
   - Bottom border: `1px solid #E5E5E5` (`--Colors-Border-secondary`).
   - Title: Font size `18px` or `20px`, `font-weight: 600` (Semibold), line-height `28px`, brand color (`--Colors-Foreground-primary`).
   - Back / Close button `[←]`: Fixed **`36px × 36px`**, rounded `8px` (`rounded-md`), border `1px solid #E5E5E5`, padding `8px`, centered icon `20px × 20px`.
2. **Main Content (Scrollable)**:
   - Dedicated scroll container (`overflow-y: auto`), padding `20px` (`p-5`).
   - Vertical gap between major sections: Fixed `16px` (`gap-4` / `mb-4`).
3. **Footer (Pinned Bottom)**:
   - Fixed at bottom (`position: sticky; bottom: 0; z-index: 50`).
   - Vertical padding `12px`, horizontal padding `20px`; Top border `1px solid #E5E5E5`; White background `#FFFFFF`.
   - Right-aligned action buttons, height **`36px`**, rounded **`8px`**:
     - `[Hủy]` (Secondary): White background, border `1px solid #E5E5E5`, gray text `#424242` (`--Colors-Foreground-secondary`).
     - `[Lưu] / [Áp dụng]` (Primary): Brand background (`--Colors-Background-primary`), white text `#FFFFFF`, font-weight `600`.

### 2. General Information Section ("Thông tin chung" Card Frame)
All general information fields must be encapsulated in a light background Card frame:
- **Section Title**: Placed **outside** the Card frame, `16px` (`text-base`), `font-weight: 600` (Semibold), text `#141414` (`--Colors-Foreground-base`), margin-bottom `8px`.
- **Card Container**: Background `--Colors-Background-secondary` (`#FAFAFA` / `--Colors-Gray-50`), rounded `12px` (`rounded-xl`), padding `16px` (`p-4`), row spacing `12px`.
- **Field Spacing Rules**:
  - **Related Fields Gap**: **`8px`** (`gap-2` / `spacing-md`).
    - *Applies to*: Hierarchical address (Province – District – Ward), Date ranges (From date – To date), Price ranges (From price – To price).
  - **Independent Fields Gap**: **`12px`** (`gap-3` / `spacing-lg`).
    - *Applies to*: Independent inputs/selects on the same line (Type, Content, Quantity, Project...).

### 3. Detail Table Section in Slideout ("Bảng chi tiết")
- **Section Title**: Size `16px`, `font-weight: 600` (Semibold).
- **`[+ Thêm dòng]` / `[+ Thêm chi tiết]` Button**:
  - Position: Right-aligned flush on the same row as the table title or tab bar.
  - Style: Secondary Outlined Primary (border `1px solid` brand color, white background `#FFFFFF`, hover brand-50, brand text color, `font-weight: 600`, height `28px – 32px`, rounded `6px – 8px`).
- **Detail Table Geometry**:
  - Border: `1px solid #E5E5E5`. Rounded `12px` (Top-Left corner MUST be `0px` / `rounded-tl-none` when tabs are present).
  - Header Table: Minimum height `44px`, background `--Colors-Background-selected-primary` (Teal-50 `#E8F7F0`), dark readable text (`#004024` or `--Colors-Foreground-base`), `font-weight: 600`.
  - Attached tabs: Zero-Gap rule (`margin-bottom: 0`, `gap: 0`).

---

## PART 4: NAVIGATION & FIXED HEADER STANDARDS

### 1. 3 Fixed Architectural Areas
1. **Header (Top Bar)**: Top navigation bar, fixed across the entire application.
2. **Parent Nav (Primary Sidebar Level 1)**: Level 1 module icon rail on the leftmost edge.
3. **Sub-Nav (Secondary Sidebar Level 2)**: Level 2 detailed feature menu for each module.

### 2. Parent Navigation Specifications (Level 1 Module Column)
- **Fixed Width**: **`64px`** (non-collapsible, pinned to left screen edge).
- **Background Color**: `--Colors-Background-base-invert` (`#0F0F0F`).
- **Logo / Brand Header**: Size `64px × 72px`, centered (`display: flex; align-items: center; justify-content: center;`).
- **Feature Icon Menu Container**:
  - Container Size: **`40px × 40px`**, rounded `12px` (`radius-xl` / `rounded-xl`), centered within the 64px column.
  - Icon Size: `20px × 20px`.
  - Default state: 80% opacity (`opacity: 0.8`), transparent background.
  - Selected state: 100% opacity (`opacity: 1`), container background switches to module brand color (`--brand-500`).
- **Bottom Footer**: Background `--Colors-Background-base`, top divider border (`border-top: 1px solid #E5E5E5`).

### 3. Sub-Navigation Specifications (Level 2 Feature Menu)
- **Typography & Dimensions**:
  - Font size: `14px` (`text-sm`).
  - Font weight: Semibold (`600` / `font-semibold`).
  - Icon size: `16px × 16px`, vertically centered with text.
- **Item States**:
  - Default: Neutral gray text (`--Colors-Foreground-secondary`), transparent background.
  - Hover: Subtle background change (`--Colors-Background-secondary_hover`).
  - Selected: Background takes module brand color (`--brand-500`), text and icon are **pure white `#FFFFFF`** (`--Colors-Text-white`), rounded `8px` (`rounded-lg`), padding `8px 12px` (`py-2 px-3`).

### 4. Header Specifications (Fixed Top Bar)
- **Fixed Height**: **`60px`** (`height: 60px; min-height: 60px`).
- **Position**: Sticky pinned at top (`position: sticky; top: 0; z-index: 100`).
- **Element Alignment**: All icons (Back, Search, Chat, Bell with badge, Language, Avatar) vertically centered (`align-items: center`).
- ⚠️ **Line-height Mismatch Prevention**: Avoid unequal line-heights between text spans and SVG icons that cause baseline displacement.

---

## PART 5: DESIGN SYSTEM TOKENS (3-LAYER ARCHITECTURE)

The system operates on a 3-layer Design Token architecture supporting automated multi-brand color switching:

```
Layer 0 (Primitives - Value) ➔ Layer 1 (Brands - Semantic Mapping) ➔ Layer 2 (Modes / Semantic CSS Variables)
```

> [!CAUTION]
> **MANDATORY DEVELOPER RULES**:
> 1. NEVER hardcode hex color codes (e.g. `#009955`, `#E5E5E5`, `#FAFAFA`) into UI components.
> 2. Always use Layer 2 Semantic CSS Variables or Tailwind semantic classes (`bg-primary`, `text-primary`, `border-border`, etc.) so the UI automatically adapts when switching brands.

### 1. Layer 1: Brand Token Mapping by Module

| Module | Brand Palette Mapped to `--brand-*` | Dominant Tone |
| :--- | :--- | :--- |
| **DocMag / BizDoc** | `--Colors-Teal-*` (Teal-500 = `#009955`) | Teal Green |
| **DocFlow** | `--Colors-Blue-brand-*` (Blue-brand-500 = `#005993`) | Blue |
| **CRM** | `--Colors-Ochre-Orange-*` (Ochre-Orange-500 = `#E57D06`) | Ochre Orange |
| **Helpdesk** | `--Colors-Purple-brand-*` (Purple-brand-500 = `#6041A5`) | Purple |
| **Interactive** | `--Colors-Midnight-Navy-*` (Midnight-Navy-500 = `#222C44`) | Midnight Navy |
| **Work Flow** | `--Colors-Deep-Teal-*` (Deep-Teal-500 = `#008C7D`) | Deep Teal |
| **HRM** | `--Colors-Indigo-*` (Indigo-500 = `#6172F3`) | Indigo |
| **ERP** | `--Colors-Blue-light-*` / Indigo | Blue-light / Indigo |

### 2. Layer 2: Semantic CSS Variables (Modes)

#### A. Foreground (Text & Icons)
- `Colors-Foreground-base`: `var(--Colors-Gray-900)` (#141414)
- `Colors-Foreground-secondary`: `var(--Colors-Gray-700)` (#424242)
- `Colors-Foreground-tertiary`: `var(--Colors-Gray-600)` (#525252)
- `Colors-Foreground-quaternary`: `var(--Colors-Gray-500)` (#737373)
- `Colors-Foreground-hint`: `var(--Colors-Gray-400)` (#999999)
- `Colors-Foreground-disable`: `var(--Colors-Gray-400)` (#999999)
- `Colors-Foreground-white`: `var(--Colors-Base-white)` (#FFFFFF)
- `Colors-Foreground-primary`: `var(--brand-500)`
- `Colors-Foreground-primary_hover`: `var(--brand-600)`
- `Colors-Foreground-primary-disabled`: `var(--brand-200)`
- `Colors-Foreground-error`: `var(--Colors-Red-600)` (hover: Red-700, disabled: Red-300)
- `Colors-Foreground-warning`: `var(--Colors-Yellow-600)` (hover: Yellow-700)
- `Colors-Foreground-success`: `var(--Colors-Green-600)` (hover: Green-700)

#### B. Border
- `Colors-Border-base`: `var(--Colors-Gray-300)` (#CCCCCC)
- `Colors-Border-secondary`: `var(--Colors-Gray-200)` (#E5E5E5)
- `Colors-Border-tertiary`: `var(--Colors-Gray-100)` (#F5F5F5)
- `Colors-Border-disabled`: `var(--Colors-Gray-300)`
- `Colors-Border-primary`: `var(--brand-500)` (hover: brand-600, disabled: brand-100, tint: brand-200)
- `Colors-Border-error`: `var(--Colors-Red-600)` (tint: Red-300)
- `Colors-Border-warning`: `var(--Colors-Yellow-600)` (tint: Yellow-300)
- `Colors-Border-success`: `var(--Colors-Green-600)` (tint: Green-300)

#### C. Background
- `Colors-Background-base`: `var(--Colors-Base-white)` (#FFFFFF)
- `Colors-Background-base_hover`: `var(--Colors-Gray-50)` (#FAFAFA)
- `Colors-Background-base-invert`: `var(--Colors-Gray-950)` (#0F0F0F)
- `Colors-Background-secondary`: `var(--Colors-Gray-50)` (#FAFAFA)
- `Colors-Background-secondary_hover`: `var(--Colors-Gray-100)` (#F5F5F5)
- `Colors-Background-tertiary`: `var(--Colors-Gray-100)` (#F5F5F5)
- `Colors-Background-selected-primary`: `var(--brand-50)` (light tint for sub-table headers)
- `Colors-Background-selected-primary_hover`: `var(--brand-100)`
- `Colors-Background-primary`: `var(--brand-500)`
- `Colors-Background-primary_hover`: `var(--brand-600)`
- `Colors-Background-error`: `var(--Colors-Red-600)` (tint: Red-50)
- `Colors-Background-warning`: `var(--Colors-Yellow-600)` (tint: Yellow-50)
- `Colors-Background-success`: `var(--Colors-Green-600)` (tint: Green-50)

#### D. Accents (Badges & Status Tags)
Full token sets for palettes: `purple`, `red`, `green`, `gray`, `gray_blue`, `blue_light`, `blue`, `indigo`, `rose`, `orange`:
- `Accent-[color]-bg`: Card background (50 tone)
- `Accent-[color]-bg_hover`: Hover background (100 tone)
- `Accent-[color]-brd`: Border (200 tone)
- `Accent-[color]-fg`: Text and icon (500/600 tone)
- `Accent-[color]-bg-solid`: Solid background (500 tone)

#### E. Shadows & Spacings
- **Card Shadow**: `Shadows/shadow-md`:
  `box-shadow: 0px 2px 4px -2px rgba(16, 24, 40, 0.05), 0px 4px 8px -2px rgba(16, 24, 40, 0.10);`
- **Spacing Token Map**:
  - `Spacing-0`: `0px`
  - `Spacing-0.5`: `2px`
  - `Spacing-1`: `4px`
  - `Spacing-1.5`: `6px`
  - `Spacing-2`: `8px` (`gap-2` / `spacing-md`)
  - `Spacing-3`: `12px` (`gap-3` / `spacing-lg`)
  - `Spacing-4`: `16px` (`p-4` / `gap-4` / `spacing-xl`)
  - `Spacing-5`: `20px` (`p-5` / `spacing-2xl`)
  - `Spacing-6`: `24px`
  - `Spacing-8`: `32px`
  - `Spacing-10`: `40px`
  - `Spacing-12`: `48px`
  - `Spacing-16`: `64px`

---

## PART 6: COMPREHENSIVE ACCEPTANCE CRITERIA (CHECKLIST)

Before delivering any UI screen or business ticket feature, developers and QA must verify against this checklist:

### 1. Navigation & Header
| No. | Check Item | Pass Criteria (TRUE) | Fail Criteria (FALSE) |
| :--- | :--- | :--- | :--- |
| **1.1** | **Header (Top Bar)** | Fixed height 60px; all elements vertically centered; sticky pinned at top. | Header resizes with content; displaced avatar or icons; scrolls out of view. |
| **1.2** | **Parent Nav (Level 1)** | Fixed width 64px; background #0F0F0F; 40x40px icon containers rounded 12px; selected item takes module brand color. | Width != 64px; hardcoded hex background; icons uncentered in container. |
| **1.3** | **Sub-Nav (Level 2)** | Typography 14px Semibold; selected item takes brand background with pure white (#FFFFFF) text/icon, rounded 8px, padding 8px 12px. | Incorrect font size/weight; selected item lacks white text; incorrect padding/border-radius. |

### 2. Data Table & Action Bar
| No. | Check Item | Pass Criteria (TRUE) | Fail Criteria (FALSE) |
| :--- | :--- | :--- | :--- |
| **2.1** | **Action Bar Toolbar** | Correct order: Search ➔ Filter ➔ Import ➔ Export ➔ Add ➔ Divider (1px, 20px, margin 8px) ➔ [⚙]; all elements 36px height; card header py-3 px-4, rounded 12px, shadow-md. | Incorrect button order; missing divider between Add and Settings; button heights != 36px. |
| **2.2** | **Main Table & Alignment** | 4 foundation columns; Created/Updated combined into 2-line cell with Calendar/User icons; Clean Header; Header & Body share identical alignment (Text-Left, Numbers-Right, Date/ID/Status-Center); Single-sort (⇅, ↑, ↓). | Header centered while Body is left-aligned; remaining filter funnels on column headers; separated created/updated columns; missing sort icons. |
| **2.3** | **Sub-Table & Attached Tabs** | Tabs attached directly flush to sub-table top edge (gap: 0, margin-bottom: 0); sub-table top-left border-radius: 0px; sub-table header Teal-50 background with dark Teal text. | Gap between tabs and sub-table; top-left radius != 0px; incorrect header background. |

### 3. Filter Popover & Logic State
| No. | Check Item | Pass Criteria (TRUE) | Fail Criteria (FALSE) |
| :--- | :--- | :--- | :--- |
| **3.1** | **Filter Popover & 1:1 Mapping** | 100% collapsed into Popover below Filter button (right edges strictly aligned); badge count on Filter button; 1:1 mapping with table columns. | Exposed inline filter dropdowns in toolbar; missing badge count; missing filter fields for visible table columns. |
| **3.2** | **Pagination & State Logic** | Automatically resets to Page 1 on Search, Apply/Reset Filter, or Sort toggle; preserves active filter conditions on sort. | Stays on current page on search/filter/sort causing empty data; filters lost on sort. |

### 4. Slide-out Sheet Form
| No. | Check Item | Pass Criteria (TRUE) | Fail Criteria (FALSE) |
| :--- | :--- | :--- | :--- |
| **4.1** | **Slide-out Form UI** | Standardized to 85% width Sheet; 3 fixed sections (Header, Main scrollable, Footer pinned); General Info in #FAFAFA card, padding 16px, rounded 12px; related fields gap 8px, independent gap 12px; [+ Thêm dòng] right-aligned, secondary outlined primary. | Uses modal dialog instead of 85% Sheet; Header/Footer scroll away with content; general info missing gray card; incorrect 8px/12px gap; [+ Thêm dòng] misplaced or misstyled. |

### 5. Design Tokens & Checklist Process
| No. | Check Item | Pass Criteria (TRUE) | Fail Criteria (FALSE) |
| :--- | :--- | :--- | :--- |
| **5.1** | **Design Tokens & Verification** | 100% Layer 2 CSS Variables / Design Tokens (Modes) used; ZERO hardcoded hex color codes (e.g. #009955); developer verifies screen against checklist before QA handoff. | Hardcoded hex colors; unverified delivery. |
