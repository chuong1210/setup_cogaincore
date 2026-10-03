# CogainCore Operating Guidelines (CLAUDE.md)

This repository enforces strict development standards across all modules.

Please refer to the authoritative operating contracts:
- [AGENTS.md](./AGENTS.md): Master Project Operating Contract
- [.claude/AGENTS.md](./.claude/AGENTS.md): Claude Code Operating Rules
- [.claude/rules/react-typescript-rules.md](./.claude/rules/react-typescript-rules.md): React 19, TypeScript, TanStack Query & UI Guidelines
- [.claude/rules/design-system-and-ui-standards.md](./.claude/rules/design-system-and-ui-standards.md): Comprehensive Technical Requirements & Design System Tokens

## Core Non-Negotiable Rules Summary
1. **Database Migrations**: NEVER run EF Core migrations automatically (`dotnet ef migrations add`, `dotnet ef database update`).
2. **Frontend Data Fetching**: NEVER call services directly or write inline `useQuery`/`useMutation` in UI. Encapsulate inside custom hooks (`use<Entity>`).
3. **No Raw HTML Form Controls**: STRICTLY BAN `<select>`, `<option>`, `<input type="date">`, `<input type="time">`, `<input type="number">`, and raw `<table>`. Use `@shared/components` and `@shared/ui`.
4. **Data Tables**:
   - Minimum 4 foundation columns: Mã phiếu (sticky link), Trạng thái (badge), Ngày tạo (2-line with calendar/user icons), Ngày cập nhật (2-line with calendar/user icons).
   - Clean Header: 100% remove inline search/filter from headers. Single-sort only (⇅, ↑, ↓).
   - Golden Rule of Alignment: Header and Body cell MUST share the exact same alignment (Text Left, Number Right, Date/ID/Status Center).
5. **Top Action Bar**: Strict order: `[Search] -> [Filter] -> [Import] -> [Export] -> [+ Create] -> [Divider 1px x 20px, margin 8px] -> [⚙ 36x36]`. Uniform 36px height.
6. **Filter Popover**: 100% filter controls collapsed into Filter Popover anchored below `[Lọc]`. 1:1 mapping with table columns. Auto-reset pagination to Page 1 on Apply/Reset.
7. **Ticket Slideout Forms**: Banned modal dialogs. Use Slideout `Sheet` (`side="right"`) standardized to **85% width** (`sm:max-w-[85%]`). 3 fixed sections (Header, Main scrollable, Footer pinned). General info card `#FAFAFA`, related fields gap 8px, independent fields gap 12px. `[+ Thêm dòng]` right-aligned secondary outlined primary.
8. **Design Tokens & Colors**: Multi-brand 3-layer architecture. STRICT ZERO HARDCODED HEX MÃ MÀU RULE. Use Layer 2 semantic CSS variables / Tailwind semantic classes.
9. **Zero Hardcoded Text (i18n)**: All strings MUST use `useTranslation` with default fallback.
10. **Resource Version Badge**: Integrate `ResourceVersionBadge` across detail headers, slideout headers, and list headers.
