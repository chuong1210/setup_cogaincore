# CogainCore Project Operating Contract (AGENTS.md)

This is the primary operating contract for AI agents (Codex CLI, Cursor, Copilot, etc.) working on the `cogain-core` codebase. All instructions and constraints defined herein are non-negotiable and strictly enforced.

---

## 1. Project Architecture & Monorepo Overview

`cogain-core` is an enterprise ERP / HRM / CRM platform composed of two core tiers:
- **Backend (`/backend`)**: ASP.NET Core (.NET 9) microservices architecture (`HR`, `MasterData`, `ServiceDesk`, `WorkFlow`, `BusinessDocument`, `ERP`, `Reporting`) using Entity Framework Core, PostgreSQL, GuidV7, AutoFilter, and Ocelot API Gateway.
- **Frontend (`/frontend`)**: Modern React 19 + TypeScript monorepo managed via `pnpm` workspaces (`bizdoc`, `crm`, `erp`, `helpdesk`, `hrm`, `interactive`, `workflow`, `shared`), built with Vite, `@tanstack/react-router`, `@tanstack/react-query` v5, TailwindCSS v4, and Radix UI / shadcn.

For detailed domain-specific instructions, Codex automatically loads:
- [frontend/AGENTS.md](frontend/AGENTS.md): Full React 19, TypeScript, TanStack, and UI styling specifications.
- [backend/AGENTS.md](backend/AGENTS.md): Full .NET 9 microservice, EF Core, entity, and controller specifications.

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
- Data export **MUST** use `exportDataMutation.mutateAsync` followed by `useFile().downloadFile(...)` and `toastSuccess`. **NEVER** use raw `window.open(res.data)`.

### 3.3. Strict Ban on Raw HTML Form Controls (Use Shared Components)
- **NEVER** use raw native HTML form tags: `<select>`, `<option>`, `<input type="date">`, `<input type="time">`, `<input type="number">`, or raw `<table>/<tr>/<td>`.
- **MANDATORY**: Always utilize pre-built project components from `@shared/components` and `@shared/ui`:
  - **Dropdowns / Selects**: `CustomSelect`, `LazyCombobox`, `Combobox`, `CustomMultiSelect`, `TreeSelect`.
  - **Date & Time**: `DatePicker` (from `@shared/components/custom/date-picker`), `DateRangeInput`.
  - **Numeric & Text Inputs**: `NumericInput`, `Input`, `DebouncedInput`.
  - **Tables**: `ResizableWrapTable`, `SortableWrapTable`, `CustomTable`.

### 3.4. Ticket & List Page Filter Standards
- **NEVER** place raw inline filter controls or ad-hoc select toolbars directly in the page header.
- **MANDATORY**: Build a dedicated `<[Ticket]FilterPopover>` component using `FilterPopoverLayout` (from `@shared/components`) or `Popover` (from `@shared/ui`) with active filter count badge, clearable options, and Reset/Apply actions (modeled after `AcceptanceMinuteFilterPopover`).

### 3.5. Ticket Slideout Form Standards (85% Width Rule)
- **MANDATORY**: Form components for business tickets and request documents ("Phiếu") must **NEVER** be modal dialogs. They must always use a slideout `Sheet` (`side="right"`) standardized to **85% width**:
  ```tsx
  <SheetContent
    side="right"
    className="w-full sm:max-w-[85%] p-0 gap-0 border-l shadow-xl flex flex-col"
    onInteractOutside={(e) => e.preventDefault()}
  >
  ```

### 3.6. Mandatory Detail Table Search & Filter Popover
- **EVERY** child and detail table **MUST** have both search and filter configured on `ResizableWrapTable` via `toolbarProps`.
- The detail filter **MUST** render as a wide multi-column form popover: `renderFilterContent: (close) => <form className="space-y-4 w-200">` with responsive grid (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`) and Reset / Apply buttons.

### 3.7. Strict Zero Hardcoded Text Rule (MANDATORY i18n)
- **NEVER** hardcode text strings anywhere in UI components, JSX, or table column configurations (e.g., `header: 'Loại hình'`, `<h1 className="...">Quản lý Tờ khai Hải quan</h1>`, `<Button>Xuất Excel</Button>`, `<Button>+ Tạo Tờ khai</Button>`, placeholders, toasts).
- **EVERY** single string visible to users **MUST** be localized using `useTranslation` with proper namespaces and fallback `defaultValue`:
  ```tsx
  t('namespace:key', { defaultValue: 'Default Text' })
  ```

---

## 4. Secret Handling & Agent Session Hygiene

- **NEVER** print, log, or commit passwords, API keys, tokens, or connection strings in code, PRs, transcripts, or terminal outputs.
- Database credentials and secrets are managed exclusively through `.env` files or secure environment variables.
- All sensitive environment variable patterns (`*KEY*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*`, `*AUTH*`) are excluded from Codex shell snapshots.

---

## 5. Definition of Done & Task Closure

A task is considered complete when:
1. All changes adhere strictly to the project rules defined in this file and child `AGENTS.md` files.
2. Code compiles cleanly without TypeScript, linter, or C# errors (`pnpm lint`, `dotnet build`).
3. For Frontend:
   - UI forms use 85% width slideout sheet for tickets.
   - All text uses `useTranslation` with fallback `defaultValue`.
   - Data mutations use encapsulated custom hooks.
   - Tables use `ResizableWrapTable` / `SortableWrapTable` with `toolbarProps`.
4. For Backend:
   - Entities and DTOs use `record` syntax and inherit `EntityAuditBase<Guid>`.
   - Migration scripts are NOT executed; user is informed if a migration is required.
   - Routes and DI are cleanly configured.

---

## 6. Escalation Protocol

If you encounter:
- Ambiguous requirements or conflicting domain logic: Stop, explain the trade-offs, and ask the user for clarification.
- An unexpected database schema mismatch: Point out the issue and suggest the entity/configuration changes without running migrations.
- Missing shared components: Inspect `@shared/components` or `@shared/ui` before creating any new abstractions.
