---
name: cogain-frontend-crud
description: Specialized instructions and standard templates to scaffold a new Frontend CRUD module in cogain-core (React 19 + TypeScript + TanStack Router + TanStack Query v5 + Tailwind/shadcn). Activate when the user asks to "create management page", "scaffold frontend CRUD", "create UI for Entity [Name]", or "tạo frontend crud".
---

# Cogain-Core Frontend CRUD Generation Guide

This skill guides AI agents in scaffolding complete, standardized Frontend structures for a new CRUD screen in `cogain-core`, ensuring 100% adherence to project architecture and conventions.

## 1. Critical Rules

- **Never edit `routeTree.gen.ts`**: TanStack Router automatically generates and updates this file.
- **Kebab-case for files and folders**: `index.tsx`, `use-[entity-name].tsx`, `[entity-name]-form.tsx`.
- **Use `createBaseService`**: Do not manually author custom Axios wrappers for standard CRUD endpoints (`getPaged`, `getAll`, `getById`, `create`, `update`, `delete`, `deleteItems`, `import`, `exportData`, `checkExistGenerationCode`).
- **Encapsulate Data Fetching in Custom Hooks (No Direct Service Calls in UI)**: UI components and route pages must **NEVER** call service instances directly or write inline `useQuery`/`useMutation`. All queries (`pagingQuery`, `getByIdQuery`, `checkGenerationCodeQuery`) and mutations (`deleteMutation`, `exportDataMutation`, `importMutation`, `getTemplateImport`) MUST be encapsulated inside `_hooks/use-[entity-name].tsx`, and UI components only consume the hook.
- **Export & Import Standards**: Always execute `exportDataMutation.mutateAsync(exportParams)` -> download via `useFile().downloadFile(...)` -> `toastSuccess`. NEVER use `window.open(res.data)`. For templates, use `getTemplateImport.mutateAsync()` -> `downloadFile(...)`.
- **Data Table Standards**:
  - **NEVER use raw HTML `<table>`**.
  - Use `ResizableWrapTable` for detail lists and dynamic child tables.
  - Use `SortableWrapTable` when drag-and-drop row reordering is needed.
  - Use `CustomTable` with `useTableChange` for server-side paginated list screens.
- **Strict Ban on Raw HTML Controls (Use Shared Components)**: **NEVER** use raw native HTML form controls: `<select>`, `<option>`, `<input type="date">`, `<input type="time">`, `<input type="number">`, or raw `<table>/<tr>/<td>`. Always use `@shared/components` and `@shared/ui` (`CustomSelect`, `LazyCombobox`, `Combobox`, `DatePicker`, `DateRangeInput`, `NumericInput`, `Input`, `DebouncedInput`).
- **List Page Filter Popover**: **NEVER** place raw inline select tags or ad-hoc filter toolbars in the page header. Scaffolding must use a dedicated `<[Entity]FilterPopover>` with active filter count badges and Apply/Reset actions.
- **Mandatory Detail Table Search & Filter Popover**: Every detail table MUST configure `toolbarProps` on `ResizableWrapTable` with `searchValue`, `onSearchChange`, and `renderFilterContent: (close) => <form className="space-y-4 w-200">` using a responsive multi-column layout (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`).
- **Resource Version Badge**: Integrate `<ResourceVersionBadge resourceName={`${WorkItemCategoryCode.Ticket}`} />` in page titles and headers.
- **Strict Zero Hardcoded Strings (MANDATORY i18n)**: **NEVER** hardcode raw text in table column headers (e.g. `header: 'Loại hình'`), page headings (e.g. `<h1>Quản lý Tờ khai</h1>`), buttons, or placeholders. All text MUST use namespaced translations with fallback `defaultValue`: `t('namespace:key', { defaultValue: '...' })`.
- **Permissions**: Mandatory integration of `useHasPermission` (for Page/Table actions) and `useFormPermissions` (for Form inputs).

## 2. Standard Directory Structure

When creating a new module (e.g., `my-entity` inside `interactive` or `hrm`):

```text
src/routes/_app/[module-group]/[my-entity]/
  ├─ index.tsx                        # Route entry, table & search validation
  ├─ _components/[my-entity]-form.tsx # Create/Edit Form Dialog/Sheet
  └─ _hooks/use-[my-entity].tsx       # TanStack Query logic (Query + Mutation)
```

---

## 3. Implementation Workflow

1. **Analyze Requirements:** Determine the Entity name (e.g., `Customer`, `Product`), parent app/module (e.g., `interactive`, `hrm`, `bizdoc`), and required fields.
2. **Read Scaffolding Templates:** Use `view_file` to read the templates in `resources/` (type, hook, form, index) to load the required structures.
3. **Generate Code & Naming Transformations:** Convert Entity names accurately to PascalCase (`MyEntity`), camelCase (`myEntity`), and kebab-case (`my-entity`) across variables, functions, and interfaces.
4. **Create Files:** Use `write_to_file` to place `.ts`/`.tsx` files into `src/routes/_app/[module-group]/[my-entity]/`.

---

## 4. Scaffolding Templates

- **A. Types Layer**: [resources/type.template.md](resources/type.template.md)
- **B. Hook & Query Layer**: [resources/use-entity.template.md](resources/use-entity.template.md)
- **C. Form Dialog / Sheet Layer**: [resources/form.template.md](resources/form.template.md)
- **D. Route Entry & Page Table Layer**: [resources/index.template.md](resources/index.template.md)

---

## 5. Post-Generation Verification Checklist

1. Ensure TanStack Router compiles route tree automatically without modifying `routeTree.gen.ts`.
2. Verify `controller` in `createBaseService` targets the correct microservice route prefix and controller name (kebab-case).
3. Ensure all translation keys used in forms and tables are registered in the corresponding `locales/` or `i18n/` JSON files.
4. Ensure filters in table columns have `size="sm"`.
5. Ensure `npm run build` or typecheck passes with 0 errors.
