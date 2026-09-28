---
name: skill-writeer
description: Comprehensive guide and scaffolding assistant for authoring, structuring, and optimizing Antigravity Agent Skills. Use when creating a new Antigravity skill, writing or updating SKILL.md, designing skill directory layouts (scripts, references, examples, resources), tuning skill discovery descriptions, or converting workflows into skills.
---

# Antigravity Skill Writer

This skill guides the authoring of robust, high-performance **Agent Skills** tailored specifically for the **Antigravity** agentic ecosystem (Antigravity IDE & CLI).

---

## 1. Overview & Core Philosophy

### What is an Antigravity Skill?
An **Antigravity Skill** is a modular package of domain knowledge, procedural runbooks, and workflow instructions that extends the agent's capabilities. It acts as an on-demand "cheatsheet" enabling the agent to execute complex, multi-step engineering tasks consistently and accurately.

### The Progressive Disclosure Model
Antigravity uses **Progressive Disclosure** to maintain an efficient context window:
1. **Initial Context**: The agent only receives the skill's `name` and `description` in its system prompt (`<skills>` block).
2. **On-Demand Activation**: When a user's prompt matches the skill's description, the agent explicitly loads `SKILL.md` into context using `view_file`.
3. **Deep References**: Large reference tables, exhaustive API schemas, or code templates stored in subdirectories (`references/`, `examples/`) are only loaded if the agent explicitly decides it needs them.

### Skills vs. Rules vs. Plugins
Ensure the right customization type is chosen before authoring:

| Customization | Location | Activation Scope | Best For |
| :--- | :--- | :--- | :--- |
| **Skill** | `skills/<name>/SKILL.md` | **On-Demand** (Progressive) | Multi-step runbooks, domain workflows, code scaffolding, migrations. |
| **Rule** | `GEMINI.md`, `AGENTS.md`, `rules/*.md` | **Contextual / Always-On** | Strict coding constraints, architectural guardrails, style conventions. |
| **Plugin** | `plugins/<name>/plugin.json` | **Bundled Package** | Distributable packages bundling multiple skills, rules, hooks, and MCP servers. |

---

## 2. Skill Locations & Loading Priority

Antigravity automatically discovers skills from two primary customization roots:

### 1. Workspace Skills (Project-Specific & Shared)
* **Path**: `.agents/skills/<skill-name>/` (also supports `.agent/`, `_agents/`, `_agent/`)
* **Purpose**: Project-specific workflows, shared team conventions, repo-specific scaffolding.
* **Version Control**: Committed to Git so all team members benefit immediately.

### 2. Global Skills (Machine-Wide & Personal)
* **Path**: `~/.gemini/config/skills/<skill-name>/`
  * Windows: `%USERPROFILE%\.gemini\config\skills\<skill-name>\`
* **Purpose**: Personal developer workflows, cross-project productivity scripts, experimental tools.

### 3. Plugin Skills (Distributed)
* **Path**: `plugins/<plugin-name>/skills/<skill-name>/` inside workspace or global roots.

### Loading Priority (Precedence)
When skills share the same name, Antigravity resolves conflicts in this order:
1. **Workspace Project Skills** (`.agents/skills/`) — *Highest*
2. **Workspace Declared Configs** (`skills.json`)
3. **Global Discovery** (`~/.gemini/config/skills/`)
4. **Built-in Bundled Skills**
5. **Global Declared Configs** — *Lowest*

---

## 3. Skill Directory Architecture

Every skill lives in its own dedicated folder matching its identifier.

```text
skills/<skill-name>/
├── SKILL.md            # [Required] Main instruction runbook with YAML frontmatter
├── scripts/            # [Optional] Executable scripts (PowerShell, Bash, Python, Node)
├── references/         # [Optional] Bulky documentation, API contracts, domain models
├── examples/           # [Optional] Concrete reference implementations, mock inputs/outputs
└── resources/          # [Optional] Code templates, boilerplate files, assets
```

### Purpose of Subdirectories
* **`SKILL.md`**: Keep focused, concise (< 500 lines), and action-oriented. Provide step-by-step procedures, tool usage guidelines, and validation checks.
* **`references/`**: Offload deep documentation, schema definitions, and background manuals here. Link to them via markdown links: `[API Reference](./references/api-reference.md)`.
* **`examples/`**: Provide full, production-quality code snippets so the agent has concrete reference patterns without bloating `SKILL.md`.
* **`scripts/`**: Place complex helper scripts here. The agent can execute them directly via `run_command`.
* **`resources/`**: Store boilerplate templates or static seed data to be copied or read during execution.

---

## 4. SKILL.md Format & Frontmatter Specifications

The `SKILL.md` file **must** begin with valid YAML frontmatter on line 1.

```markdown
---
name: my-feature-scaffold
description: >-
  Step-by-step workflow for scaffolding a new backend aggregate or CRUD feature.
  Activate when the user asks to "create entity", "scaffold aggregate", "add backend CRUD",
  or asks for API boilerplate in the order service.
---

# My Feature Scaffold

## Overview
...
```

### Frontmatter Fields

#### `name` (Required)
* **Format**: Lowercase letters, numbers, and single hyphens (`^[a-z0-9-]+$`).
* **Requirement**: **Must match the parent directory name exactly**.
* **Length**: 1–64 characters.
* *Good*: `cogain-backend-crud`, `docker-compose-helper`, `api-test-runner`
* *Bad*: `My_Skill`, `BackendCRUD!`, `skill_writer`

#### `description` (Required — Most Critical Field)
The agent relies entirely on this description to decide when to activate the skill. If the description is too vague, the skill will never trigger. If it is too broad, it will trigger unnecessarily.

* **Length**: Under 1024 characters.
* **Perspective**: Third-person ("Guides the agent to...", "Use when the user asks to...").
* **Formula**:
  $$\text{Description} = \text{[Core Capability]} + \text{[Target Context/Technologies]} + \text{[Explicit Triggers \& Keywords]}$$

* **Checklist for Descriptions**:
  - [ ] Describes what capability the skill provides.
  - [ ] Specifies exact trigger phrases users are likely to say.
  - [ ] Mentions file extensions, frameworks, or service names if applicable (e.g., `.cs`, `.tsx`, `PostgreSQL`, `FastAPI`).
  - [ ] Uses explicit activation clauses: `"Activate when the user mentions..."`, `"Use when asked to..."`.

#### Example Descriptions:
* **Good**:
  ```yaml
  description: Step-by-step workflow for adding a new backend endpoint to a .NET microservice (Entity -> Repository -> Service -> Controller). Activate when the user asks to "add endpoint", "create API", "scaffold CRUD", or modify microservice controller routes.
  ```
* **Too Vague (Avoid)**:
  ```yaml
  description: Helps write backend code.
  ```

---

## 5. Step-by-Step Guide to Authoring a Skill

Follow this systematic procedure when creating or revising a skill:

### Step 1: Define Scope & Boundaries
* **Single Responsibility**: One skill = one concrete capability or workflow.
* **Determine Mode**: Is this a procedural runbook (scaffolding code, running tests), an analysis workflow (reviewing performance, investigating logs), or an interactive interview?

### Step 2: Select Customization Root
* Create under `.agents/skills/<skill-name>/` for team/repo sharing.
* Create under `~/.gemini/config/skills/<skill-name>/` for user-global workflows.

### Step 3: Scaffold the Directory Layout
```bash
# Example for a workspace skill in PowerShell
New-Item -ItemType Directory -Path ".agents\skills\my-skill\references" -Force
New-Item -ItemType Directory -Path ".agents\skills\my-skill\scripts" -Force
New-Item -ItemType File -Path ".agents\skills\my-skill\SKILL.md" -Force
```

### Step 4: Write `SKILL.md` Content
Structure the runbook with clear, logical sections:

1. **Frontmatter**: `name` and high-signal `description`.
2. **Title & Purpose**: Brief explanation of the outcome.
3. **Prerequisites & Inputs**: What information or files the agent must inspect before starting (e.g., target service, entity name, configuration).
4. **Step-by-Step Workflow**: Actionable, sequential steps using Antigravity tools.
5. **Concrete Patterns & Code Snippets**: Real code templates (not pseudocode).
6. **Edge Cases & Guardrails**: Common pitfalls, rules, things to avoid.
7. **Verification & Validation**: Exact commands or checks to verify success.

### Step 5: Optimize with Progressive Disclosure
* Keep `SKILL.md` under 500 lines.
* Move bulky reference tables, complete code templates, or deep schemas into `references/` or `examples/`.
* Add relative links: `See [Entity Templates](./references/entity-templates.md) for full examples`.

### Step 6: Test & Verify Activation
1. Issue a prompt in Antigravity matching the skill's trigger phrases.
2. Confirm the agent discovers the skill in its `<skills>` block.
3. Verify the agent invokes `view_file` on `SKILL.md` and executes the instructions accurately.

---

## 6. Antigravity Authoring Patterns

### Pattern A: Standard Scaffolding Runbook (e.g., CRUD / API)
```markdown
---
name: service-scaffold
description: Scaffolds a new business service and endpoints in the Order microservice. Activate when asked to "create order service", "add order endpoint", or "scaffold order entity".
---

# Order Service Scaffolding

## Prerequisites
Before writing code, gather:
1. Target aggregate name
2. Database schema requirements
3. Inspect existing patterns in `src/Services/Order/` using `list_dir` and `grep_search`.

## Execution Workflow
### 1. Create Entity
Write entity file to `src/Services/Order/Entities/{Entity}.cs`.

### 2. Configure EF Core
Register entity in `src/Services/Order/Persistence/OrderDbContext.cs`.

### 3. Verify Build
Run build command to ensure no compilation errors:
`dotnet build src/Services/Order/`
```

### Pattern B: Script-Assisted Runbook
```markdown
---
name: db-seed-helper
description: Seeds local database with synthetic test datasets. Use when the user asks to "seed database", "reset test data", or "generate synthetic tenants".
---

# Database Seed Helper

## Workflow
1. Check database connection string in `.env`.
2. Run the seeding script via `run_command`:
   ```powershell
   python .agents/skills/db-seed-helper/scripts/seed.py --tenants 5 --orders 20
   ```
3. Inspect `logs/seed.log` to confirm transaction commit.
```

### Pattern C: Progressive Disclosure Multi-File Skill
```markdown
---
name: payment-gateway-integration
description: Integration runbook for payment gateway providers (Stripe, VNPay). Activate when adding or updating payment handlers or checkout webhooks.
---

# Payment Gateway Integration

## Quick Start
For webhook payload structures, refer to [Webhook Schemas](./references/webhook-schemas.md).
For test card numbers and mock tokens, see [Test Credentials](./references/test-credentials.md).

## Steps
1. Implement the IPaymentHandler interface.
2. Register webhook route.
...
```

---

## 7. Synergy with Antigravity Built-in Capabilities

Antigravity provides unique capabilities that skills should leverage:

### 1. Tool Awareness
Author skill instructions knowing the agent has access to:
* **File Operations**: `view_file`, `replace_file_content`, `multi_replace_file_content`, `write_to_file`.
* **Exploration**: `grep_search`, `list_dir`.
* **Execution**: `run_command` (runs commands in the workspace environment), `manage_task` (manages background processes).
* **Browser & UI**: `browser_subagent` (automated browser interaction & recording), `generate_image` (UI mockup / asset generation).
* **Scheduling**: `schedule` (background timers and crons).

### 2. Planning Mode Integration
When a skill involves major architectural changes or multi-phase tasks, instruct the agent to formulate an `implementation_plan.md` artifact and request user approval before modifying code.

### 3. Project Rules Harmony
Skills complement workspace rules (`AGENTS.md`, `GEMINI.md`).
* **Rule**: "NEVER run EF migrations automatically."
* **Skill**: "Guide the user to generate migrations manually by printing the exact CLI command for them to run."

---

## 8. Authoring Checklist & Validation Criteria

Before finalizing an Antigravity skill, verify against this checklist:

### Directory & Files
- [ ] Directory is located in `.agents/skills/<skill-name>/` (workspace) or `~/.gemini/config/skills/<skill-name>/` (global).
- [ ] Directory name matches frontmatter `name` exactly.
- [ ] File is named `SKILL.md` (or `SKILL.MD`).

### Frontmatter
- [ ] Frontmatter starts on line 1 with `---` and ends with `---`.
- [ ] `name` is kebab-case (lowercase letters, numbers, hyphens).
- [ ] `description` is under 1024 characters.
- [ ] `description` clearly specifies **what** the skill does and **when** to activate it.
- [ ] `description` includes explicit trigger words and user intent phrases.

### Content & Instructions
- [ ] Written in clear, imperative instructions directed at the agent.
- [ ] Prerequisites and required inputs are identified upfront.
- [ ] Step-by-step procedures are logically ordered.
- [ ] Code samples are production-grade, complete, and adhere to project standards.
- [ ] Supporting files in `references/` or `examples/` are properly linked via relative markdown links.
- [ ] Verification steps (build commands, tests, log checks) are included.
- [ ] Does not duplicate standard coding basics that the agent already understands.

---

## 9. Troubleshooting Skill Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Skill does not activate** | Vague description or missing user trigger keywords. | Enrich `description` with explicit triggers: `"Activate when user mentions [X], [Y], or asks to [Z]"`. |
| **Skill conflicts with another skill** | Overlapping descriptions with identical trigger phrases. | Narrow the scope and distinguish use cases in both descriptions. |
| **YAML parsing error** | Tab characters, indentation errors, or missing closing `---`. | Ensure 2-space indentation, no tabs, and closing `---` before Markdown text. |
| **Agent loses context during execution** | `SKILL.md` is too large (> 800 lines). | Split content into `references/` and `examples/` using progressive disclosure. |
| **Broken links to reference files** | Absolute or incorrect paths. | Use relative markdown links: `[Spec](./references/spec.md)`. |
