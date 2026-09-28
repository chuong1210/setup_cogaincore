# Implementation Plan: Codex CLI Setup for CogainCore

Setup and standardize Codex CLI (`@openai/codex`) configuration for the `cogain-core` repository based on the comprehensive 2026 Codex reference guide (v0.156.0). We will migrate and optimize the existing `.agents/` instructions, rules, and skills into Codex's canonical discovery paths.

## Proposed Architecture & Directory Structure

Codex CLI relies on 5 core pillars:
1. **`AGENTS.md` (Project Operating Contract)**: Discovered hierarchically by walking from root downward.
   - Root: `/AGENTS.md` (Global project rules, tech stack, CLI commands, secret handling, closure definition).
   - Frontend: `/frontend/AGENTS.md` (React 19 + TypeScript + TanStack Router/Query + Radix/Tailwind rules migrated from `react-typescript-rules.md`).
   - Backend: `/backend/AGENTS.md` (.NET 9 + Microservices + EF Core + BaseService/Controller + Snapshot Policy patterns).
2. **Configuration (`.codex/config.toml` & Profiles)**:
   - `.codex/config.toml`: Base project config (model fallback `gpt-5.6-sol`, reasoning `medium`, `sandbox_mode = "workspace-write"`, `approval_policy = "on-request"`, shell env secret exclusion, feature flags).
   - `.codex/fast.config.toml`: Fast profile (`gpt-5.6-luna`, reasoning `low`).
   - `.codex/careful.config.toml`: Deep analysis & security profile (`gpt-5.5`, reasoning `xhigh`, `read-only`).
   - `.codex/ci.config.toml`: Automated headless profile (`gpt-5.6-luna`, `approval_policy = "never"`).
3. **Skills (`skills/` directory at root)**:
   - Codex discovers skills at `./skills/<skill-name>/SKILL.md`.
   - Copy all relevant and active skills from `.agents/skills/` into `./skills/` so they are immediately accessible in Codex via `$skill-name`, `/skills`, or automatic prompt description matching.
4. **Hooks (`.codex/hooks.json`)**:
   - Provide lifecycle hooks including protection against running `dotnet ef` migrations, session startup info, and post-tool linting options.

---

## Proposed Changes

### 1. Codex Configuration (`.codex/`)

#### [NEW] [config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/config.toml)
- Define `model = "gpt-5.6-sol"`, `model_reasoning_effort = "medium"`.
- Set `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"`.
- Configure `[shell_environment_policy]` to exclude sensitive credentials (`*KEY*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*`, `*AUTH*`).
- Configure `project_root_markers = [".git", "pnpm-workspace.yaml", "backend/CogainSolution.sln"]`.
- Configure `project_doc_fallback_filenames = [".agents/AGENTS.md"]`.
- Enable standard features (`shell_tool`, `unified_exec`, `goals`, `hooks`, `plugins`, `prevent_idle_sleep`).

#### [NEW] Profiles:
- [fast.config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/fast.config.toml): Routine edits and fast tests.
- [careful.config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/careful.config.toml): Security audits & architectural review.
- [ci.config.toml](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/ci.config.toml): CI/CD automation without prompts.

#### [NEW] [hooks.json](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/.codex/hooks.json)
- PreToolUse hook configuration and safety guardrails.

---

### 2. Hierarchical AGENTS.md Operating Contracts

#### [NEW] [AGENTS.md](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/AGENTS.md) (Project Root)
Consolidates the global project contract:
- **Build / Test / Lint Commands**: Full list of pnpm commands for frontend packages and dotnet commands for backend.
- **Strict Project Invariants**:
  - NEVER execute automatic EF migrations (`dotnet ef migrations add`, `dotnet ef database update`).
  - Strict Ban on Raw HTML form tags (`<select>`, `<input type="date">`, `<table>`, etc.) -> Use shared components.
  - Mandatory custom hooks for API calls (NO inline `useQuery`/`useMutation` in components).
  - Ticket Slideout Sheet 85% width rule.
  - Ticket filter popovers and detail table search/filter popovers.
  - Strict Zero Hardcoded Text Rule (`useTranslation` with `defaultValue`).
- **Security & Secret Handling**: Prevent leaking secrets into session history or shell snapshots.
- **Closure Criteria (Definition of Done)**: Exact conditions for completing tasks.

#### [NEW] [frontend/AGENTS.md](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/AGENTS.md)
Inherited automatically by Codex whenever operating in `frontend/`:
- Complete React 19 + TypeScript + Vite + TanStack guidelines adapted from `react-typescript-rules.md`.
- Detail table standards (`ResizableWrapTable`, `SortableWrapTable`, `CustomTable`).
- Filter popover patterns, Sheet 85% width implementation, Zod schema validation, i18n conventions.

#### [NEW] [backend/AGENTS.md](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/backend/AGENTS.md)
Inherited automatically by Codex whenever operating in `backend/`:
- Complete .NET 9 microservice guidelines adapted from `cogain-backend-crud` and `api-backend`.
- `record` declarations for entities and DTOs, `EntityAuditBase<Guid>`, GuidV7, `DateTimeOffset`.
- Consolidated DTO structure, `[AutoFilter]`, BaseService / BaseController patterns, Ocelot Gateway routes in `appsettings.json`.
- Strict manual migration rule.

---

### 3. Skills Migration (`skills/`)

#### [NEW] [skills/](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/skills)
- Copy all 70 skills from `.agents/skills/` into the project root `skills/` directory.
- This ensures Codex CLI natively detects every skill via `/skills`, `$skill-name`, and semantic task matching, while keeping existing `.agents/skills` untouched for backward compatibility with other tools.

---

## Verification Plan

### Automated Verification
1. Verify directory structure and files:
   - Check `.codex/config.toml` exists and is valid TOML syntax.
   - Check `AGENTS.md`, `frontend/AGENTS.md`, `backend/AGENTS.md` exist.
   - Verify `skills/` contains the migrated skills with `SKILL.md` files intact.
2. Run validation checks:
   - `pnpm lint` or package check to confirm workspace integrity is preserved.
   - Run a test script to verify `config.toml` parsing and skill count.

### Manual Verification
- Review generated TOML and Markdown files against Blake Crosley's guide standards.
