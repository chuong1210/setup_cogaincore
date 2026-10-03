---
name: cogain-frontend-master-data
description: Comprehensive architecture guide and scaffolding workflow for frontend Master Data modules (Loại / Types, Nhóm / Groups, Danh mục / Catalogs) in cogain-core. Activate when the user asks to "dựng master data front end", "scaffold master data frontend", "tạo master data frontend", "loại nhóm danh mục", "create master data UI", or asks for TreeTable, TreeSelect, or Dialog vs Slideout Sheet patterns in master data forms.
---

# Cogain Frontend Master Data (Loại, Nhóm, Danh mục)

This skill governs the architecture, component selection, and standard scaffolding workflows for Master Data entities across the `cogain-core` frontend ecosystem (React 19 + TypeScript + TanStack Table/Query + Tailwind/shadcn).

---

## 1. The Master Data Triad Architecture

Master data in `cogain-core` follows a standardized 3-tier hierarchy:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MASTER DATA TRIAD                                │
├────────────────────────┬────────────────────────────┬───────────────────────┤
│ Tier 1: Loại (Types)   │ Tier 2: Nhóm (Groups)      │ Tier 3: Danh mục      │
│                        │                            │         (Catalogs)    │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│ • Flat classifications │ • Hierarchical categories  │ • Core business items │
│ • Lean schema          │ • Parent-child recursion   │ • Rich specifications │
│ • Modal <Dialog>       │ • <TreeTable> + <TreeSelect│ • Slideout <Sheet>    │
│ • E.g.: VehicleType,   │ • E.g.: VehicleGroup,      │ • E.g.: TradeDocument,│
│   DocumentType         │   DocumentGroup            │   DeliveryVehicle     │
└────────────────────────┴────────────────────────────┴───────────────────────┘
```

### Standard File Structure per Domain
Master data components are either shared across microservices (`frontend/shared/components/master-data/<feature-kebab>/`) or route-scoped (`frontend/<app>/src/routes/_app/<module>/<feature-kebab>/`):

```text
frontend/shared/components/master-data/<feature-kebab>/
├── <feature>-type-page.tsx       # Tier 1: Flat listing table
├── <feature>-type-form.tsx       # Tier 1: Modal Dialog form
├── <feature>-group-page.tsx      # Tier 2: TreeTable listing with client search
├── <feature>-group-form.tsx      # Tier 2: Form with TreeSelect for parentId
├── <feature>-page.tsx            # Tier 3: ResizableWrapTable/CustomTable listing
└── <feature>-form.tsx            # Tier 3: Slideout Sheet form (or Dialog if compact)
```

---

## 2. Core Architectural Rules

### Rule 1: Form Presentation Matrix (Dialog vs. Slideout Sheet)

The presentation container for entity forms is determined strictly by field density and child complexity:

| Presentation | When to Use | Trigger Threshold | Container Setup |
| :--- | :--- | :--- | :--- |
| **Modal `Dialog`** | Simple entities, basic CRUD, no sub-grids | **< 6–8 fields**, single section | `<DialogContent className="max-w-2xl! w-full p-0 border-0">` with `<DialogHeader className="bg-primary text-primary-foreground px-5 py-3 rounded-t-lg">` |
| **Slideout `Sheet`** | High-density entities, multiple `<fieldset>` groups, sub-tables, multiselect relations | **≥ 6–8 fields**, or has embedded child grids | `<SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">` with scrollable body `<div className="flex-1 overflow-y-auto px-5 py-4">` and pinned footer |

### Rule 2: Hierarchy Rule (`TreeTable` & `TreeSelect`)

Any entity that supports self-referencing hierarchy (`parentId`, `children`):
- **Listing Page MUST use `TreeTable`** from `@shared/components/custom/tree-table`.
  - Transform API response with `buildTreeData(allQuery.data?.data)`.
  - Filter using recursive `deepFilterTree` (preserves parent branches when child matches).
  - Enable virtualization and tree controls: `expandAll`, `enableVirtualization`.
- **Form Input MUST use `TreeSelect`** from `@shared/components/custom/tree-select`.
  - Transform options with `buildTreeSelect(allQuery.data?.data, currentEntityId)`.
  - Passing `currentEntityId` prevents circular references (an item selecting itself or descendants as parent).

### Rule 3: Zero Hardcoded Strings (Strict Localization)
- **STRICTLY FORBIDDEN**: Raw string literals in table headers (e.g. `header: 'Loại hình'`, `header: 'Mã'`), headings (e.g. `<h1 className="...">Quản lý Tờ khai</h1>`), buttons, or placeholders.
- **MANDATORY**: All UI text MUST use `useTranslation` with proper namespaces and explicit `defaultValue`:
```tsx
const { t } = useTranslation(['message', 'featureNamespace', 'action', 'common']);

// Table column header
header: t('featureNamespace:columnTitle.name', { defaultValue: 'Tên danh mục' })

// Page / Modal title
title: t('featureNamespace:title', { defaultValue: 'Quản lý danh mục' })
```

### Rule 4: Resource Version Badge
In headers and info bars, use the centralized badge:
```tsx
<ResourceVersionBadge resourceName="DeliveryVehicle" />
```

### Rule 5: Custom Hook Encapsulation (No Direct Service Calls in UI)
- **NEVER** call API services directly inside UI pages or forms (e.g., `service.getPaged(...)`, `service.exportData()`).
- **NEVER** write inline `useQuery` or `useMutation` with service instances inside route components.
- All TanStack Query operations (`pagingQuery`, `allQuery`, `getByIdQuery`, `dropdownQuery`, `deleteMutation`, `deleteItemsMutation`, `exportDataMutation`, `checkGenerationCodeQuery`, `importMutation`, `getTemplateImport`) MUST be encapsulated inside a custom hook (`use<Entity>`). UI components only consume the hook.
- **Export & Import Standards**:
  - Export data: `await exportDataMutation.mutateAsync(exportParams)` -> `useFile().downloadFile({ filePath, uploadType: EUploadType.Sftp, downloadFileName })` -> `toastSuccess`. NEVER use `window.open(res.data)`.
  - Export template: `await getTemplateImport.mutateAsync()` -> `useFile().downloadFile(...)` -> `toastSuccess`.

---

## 3. Deep Reference Guides (Progressive Disclosure)

Refer to dedicated reference guides for complete code templates and patterns:

- 📄 **[Tier 1: Loại (Types) Reference](./references/type-tier.md)**
  - Full modal `Dialog` implementation (`delivery-vehicle-type-form.tsx`).
  - Standard flat table listing page with column filtering and sorting.
- 🌳 **[Tier 2: Nhóm (Groups) Reference](./references/group-tree-tier.md)**
  - Complete `TreeTable` implementation with `deepFilterTree` and bulk actions.
  - Complete `TreeSelect` form integration with cycle prevention.
- 📑 **[Tier 3: Danh mục (Catalogs) Reference](./references/catalog-tier.md)**
  - Complete slideout `Sheet` implementation (`trade-document-form.tsx`).
  - Fieldset grouping, embedded child `ResizableWrapTable`, and cascading type-to-group filters.

---

## 4. Scaffolding Workflow (Step-by-Step)

Follow this 6-step procedure when generating or refactoring Master Data modules:

### Step 1: Define TypeScript Types & TanStack Query Hook
1. Create or verify types in `frontend/shared/types/master-data/<entity>.type.ts`:
   - For Groups: `export interface IGroup extends BaseType, ITreeItem<IGroup>`.
2. Create or verify the hook in `frontend/shared/hooks/master-data/use-<entity>.ts`:
   - Expose `getByIdQuery`, `allQuery`, `dropdownQuery`, `createMutation`, `updateMutation`, `deleteMutation`, `deleteItemsMutation`, `exportDataMutation`, `checkGenerationCodeQuery`.

### Step 2: Evaluate Tier & Form Presentation
Determine form container based on field count:
- Simple Type (3–5 fields: code, name, status) $\rightarrow$ **Modal `Dialog`**.
- Standard Group (4–6 fields: code, name, typeId, parentId, status) $\rightarrow$ **Modal `Dialog`**.
- Rich Catalog (≥ 6–8 fields, fieldsets, dynamic requirement IDs, sub-grid) $\rightarrow$ **Slideout `Sheet`**.

### Step 3: Scaffold the Form Component
1. Use `react-hook-form` with `zodResolver(createSchema(t))`.
2. Hook up `useFormPermissions(permissionModule, mode)`.
3. If hierarchical, embed `TreeSelect` with `buildTreeSelect(allQuery.data?.data, id)`.
4. If child requirements exist, embed `<ResizableWrapTable maxBodyHeight={300}>`.
5. Pinned action buttons: `<Button type="button" variant="outline" onClick={handleClose}>` and `<Button type="submit">`.

### Step 4: Scaffold the Listing Page Component
1. If hierarchical, use `<TreeTable>` with `buildTreeData` and `deepFilterTree`.
2. If flat, use `<CustomTable>` or `<ResizableWrapTable>` with `useTableChange`.
3. **Clean Table Header & Single-Sort**:
   - Headers strictly contain `[Tên cột] + [Icon Sort]` (`⇅`, `↑`, `↓`).
   - Eliminate all inline filter dropdowns or search funnels from header cells.
4. **Golden Rule of Column Alignment**:
   - Header and Body Cell MUST share the exact same alignment.
   - Text / Names / Long Strings -> `align: 'left'` (Header & Body left-aligned).
   - Numbers & Currency -> `align: 'right'` (Header & Body right-aligned).
   - Short IDs / Dates / Times (`ModifierInfo` 2-line) / Status (`StatusTag`) / Actions -> `align: 'center'` (Header & Body centered).
5. **Top Action Bar Geometry**:
   - Left-to-right order: `[ Quick Search ] ──> [ Filter Button ] ──> [ Import ] ──> [ Export ] ──> [ + Add New ] ──> [ Divider 1px x 20px, margin 8px ] ──> [ ⚙ Settings 36x36 ]`.
   - Height strictly `36px` (`h-9`).
6. **Filter Popover (`FilterPopoverLayout`)**:
   - 1:1 mapping with table columns.
   - Explicit `current={{ status, fromDate, toDate, ... }}` (exclude system pagination/sort params).
   - On Apply / Clear: auto-reset table pagination to `page: 1` (`updateFilters({ ...values, page: 1 })`).
   - All filter keys registered in `useTableChange({ filterKeys: [...] })` and in route `PostSearchSchema`.
7. Integrate `useGenerationCode` for code auto-numbering.

### Step 5: Route Configuration
Register the route using TanStack Router:
```tsx
export const Route = createFileRoute('/_app/master-data/my-feature/')({
  validateSearch: (search) => mySearchSchema.parse(search),
  component: MyFeatureRouteComponent,
});
```

---

## 5. Pre-Flight Verification Checklist

Before finalizing any master data component:
- [ ] **No Hardcoded Strings**: Every label, placeholder, dialog title, and alert uses `t(..., { defaultValue: '...' })`.
- [ ] **Modal vs. Sheet Decision**: `Dialog` used for < 6–8 fields; `Sheet` (`side="right"`) used for complex entities.
- [ ] **Tree Hierarchy**: Any table with parent/children uses `TreeTable`; any parent field in forms uses `TreeSelect`.
- [ ] **Cycle Prevention**: Current entity `id` passed to `buildTreeSelect(data, id)` to prevent selecting itself as parent.
- [ ] **Form Submission**: In `Sheet`, submit button uses `form="form-id"` and sits in pinned footer; form resets properly on close.
- [ ] **Permissions**: `canSave`, `isReadOnly`, and action permissions (`canCreate`, `canUpdate`, `canDelete`) properly enforced.
