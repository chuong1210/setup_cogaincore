# General Project Rules

## Database Migrations
- **NEVER** run Entity Framework migration commands automatically (e.g., `dotnet ef migrations add`, `dotnet ef database update`).
- The generation and application of migrations must strictly be left to the user to execute manually. 
- Even when scaffolding or modifying entities, do not attempt to run or update database migrations on behalf of the user.

## Frontend Data Fetching & Service Encapsulation
- **NEVER** call API services directly or write raw inline `useQuery`/`useMutation` inside UI components, `.tsx` files, or route pages (e.g. `service.getPaged(...)`, `service.exportData()`, `service.create(...)`).
- All data queries and mutations MUST be encapsulated inside dedicated custom hooks (`use<Entity>`). UI components only consume the hook.
- Data export MUST use `exportDataMutation.mutateAsync` followed by `useFile().downloadFile(...)` and `toastSuccess`. NEVER use raw `window.open(res.data)`.

## Strict Ban on Raw HTML Form Controls (Use Shared Components)
- **NEVER** use raw native HTML form tags: `<select>`, `<option>`, `<input type="date">`, `<input type="time">`, `<input type="number">`, or raw `<table>/<tr>/<td>`.
- **MANDATORY**: Always utilize pre-built project components from `@shared/components` and `@shared/ui`:
  - Dropdowns / Selects: `CustomSelect`, `LazyCombobox`, `Combobox`, `CustomMultiSelect`, `TreeSelect`.
  - Date & Time: `DatePicker` (from `@shared/components/custom/date-picker`), `DateRangeInput`.
  - Numeric & Text Inputs: `NumericInput`, `Input`, `DebouncedInput`.
  - Tables: `ResizableWrapTable`, `SortableWrapTable`, `CustomTable`.

## Ticket & List Page Filter Standards
- **NEVER** place raw inline filter controls or ad-hoc select toolbars directly in the page header.
- **MANDATORY**: Build a dedicated `<[Ticket]FilterPopover>` component using `FilterPopoverLayout` (from `@shared/components`) or `Popover` (from `@shared/ui`) with active filter count badge, clearable options, and Reset/Apply actions (modeled after `AcceptanceMinuteFilterPopover`).

## Mandatory Detail Table Search & Filter Popover
- **EVERY** child and detail table MUST have both search and filter configured on `ResizableWrapTable` via `toolbarProps`.
- The detail filter MUST render as a wide multi-column form popover: `renderFilterContent: (close) => <form className="space-y-4 w-200">` with responsive grid (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`) and Reset / Apply buttons.

## Strict Zero Hardcoded Text Rule (MANDATORY i18n)
- **NEVER** hardcode text strings anywhere in UI components, JSX, or table column configurations (e.g., `header: 'Loại hình'`, `<h1 className="...">Quản lý Tờ khai Hải quan</h1>`, `<Button>Xuất Excel</Button>`, `<Button>+ Tạo Tờ khai</Button>`, placeholders, toasts).
- **EVERY** single string visible to users MUST be localized using `useTranslation` with proper namespaces and fallback `defaultValue`:
  `t('namespace:key', { defaultValue: 'Default Text' })`

