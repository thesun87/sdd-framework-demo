# Agentic SDD Protocol v2
## BMAD → Spec Kit → Superpowers

**Status:** Draft v2
**Supersedes:** Spec Kit → Superpowers Handoff Protocol v1
**Change from v1:** adds the product-baseline layer (BMAD), and splits the protocol into three explicit delivery tracks instead of a single feature-level flow.

---

# PART I — FOUNDATIONS

## 1. Purpose

This document defines the architecture and implementation contract for an agentic software delivery system built from three frameworks:

- **BMAD Method** — product discovery, PRD, and architecture baseline.
- **GitHub Spec Kit** — constitution, feature specification, implementation plan, task definition, convergence.
- **Superpowers** — worktree isolation, TDD, implementation, task-level review, code-quality review, verification.

The goal is a clean separation of responsibility with **no duplicated planning artifacts**, and an explicit rule for *how much process a given piece of work deserves*.

---

## 2. Core Principle

> **BMAD owns WHY and WHAT-at-product-level.**
> **Spec Kit owns WHAT-at-feature-level and governance.**
> **Superpowers owns HOW TO EXECUTE.**
> **Code owns implementation. Git owns delivery evidence.**

The integration MUST NOT create competing versions of:

- product requirements
- architecture baseline
- feature specification
- implementation plan
- task list

---

## 3. The Three Tracks

Not every change deserves a PRD. Not every change deserves a spec. The protocol defines three tracks, and **choosing the track is an explicit, recorded decision**.

| | Track A — Greenfield | Track B — Brownfield Feature | Track C — Direct Change |
|---|---|---|---|
| Pipeline | BMAD → Spec Kit → Superpowers | Spec Kit → Superpowers | Superpowers only |
| Use for | New system, new product, new service with no existing architecture | New feature / enhancement on an existing codebase with an existing baseline | Bug fix, defect, trivial change with no requirement impact |
| Product baseline | Created by this track | Already exists (reused, not recreated) | Not touched |
| Feature spec | Yes | Yes | No |
| Implementation plan | Yes (feature-level, derived from baseline) | Yes | No |
| Task list | Yes | Yes | No (single change unit) |
| Handoff artifact | `baseline-freeze.yaml` + `handoff.yaml` | `handoff.yaml` | `change-record.yaml` |
| Convergence | Required | Required | Not required (regression proof instead) |
| Typical duration | Weeks–months | 3–10 days per feature | Hours–1 day |

### 3.1 Track Selection Decision Tree

```text
START
  │
  ├─ Does an approved product baseline exist?
  │  (prd.md + architecture-baseline.md, frozen)
  │
  ├── NO ──────────────────────────────────────────→ TRACK A
  │
  └── YES
       │
       ├─ Does the change alter ANY of:
       │     • business rules
       │     • public API / integration contract
       │     • database schema or data model
       │     • authN/authZ or tenancy
       │     • an acceptance criterion
       │     • an NFR (perf, availability, security)
       │     • adds a new user-visible capability
       │     • introduces a new dependency or module
       │
       ├── YES ─────────────────────────────────────→ TRACK B
       │
       └── NO
            │
            ├─ Is it a defect against an EXISTING documented behaviour,
            │  reproducible, and fixable with a regression test?
            │
            ├── YES ────────────────────────────────→ TRACK C
            │
            └── NO ─────────────────────────────────→ TRACK B
```

### 3.2 Track Escalation

Tracks escalate upward, never downward.

```text
TRACK C ──(requirement/contract impact discovered)──→ TRACK B
TRACK B ──(architecture baseline conflict)──────────→ TRACK A (baseline revision)
```

Escalation MUST stop execution, discard the in-flight change unit, and restart at the higher track. An agent MUST NOT "finish the fix anyway" after discovering escalation is required.

---

## 4. Responsibility Boundaries

### 4.1 BMAD owns (Track A only)

- product brief / discovery output
- PRD: product-level functional requirements, NFRs, epics
- architecture baseline and technology selection
- UX specification (where applicable)

BMAD MUST NOT own feature-level `spec.md`, `plan.md`, or `tasks.md`.
**BMAD Phase 4 (Scrum Master, story files, Dev agent, QA agent) is NOT used in this protocol.**

### 4.2 Spec Kit owns

- `constitution.md`
- `spec.md`, `plan.md`, `tasks.md` per feature
- feature-level clarification
- feature-level convergence analysis

Spec Kit MUST NOT modify the product baseline (`prd.md`, `architecture-baseline.md`). It consumes them.

### 4.3 Superpowers owns

- development worktree
- task briefs, implementation, TDD
- subagent delegation
- task-level specification-compliance review
- code-quality review and verification
- execution reports, progress, implementation-level rulings

Superpowers MUST NOT create a competing `prd.md`, `spec.md`, `plan.md`, or authoritative `tasks.md`.

### 4.4 Git owns delivery evidence

Commits, branches, merge requests, diffs, review history, merge status.
Every implementation MUST be traceable back to an owning artifact in its track.

---

## 5. Source-of-Truth Hierarchy

```text
TRACK A                    TRACK B                 TRACK C
───────                    ───────                 ───────
1. product-brief.md
2. prd.md                  (inherited baseline)
3. architecture-baseline   (inherited baseline)
4. constitution.md         1. constitution.md      1. constitution.md
5. spec.md                 2. spec.md              2. existing behaviour +
6. plan.md                 3. plan.md                 regression test
7. tasks.md                4. tasks.md             3. change-record.yaml
8. implementation          5. implementation       4. implementation
9. execution evidence      6. execution evidence   5. execution evidence
```

A lower layer NEVER overrides a higher layer. If:

```text
implementation ≠ specification
```

the implementation is wrong, unless the specification is explicitly changed through the owning framework's workflow.

---

## 6. Artifact Ownership Matrix

| Artifact | Track | Owner | Source of Truth | Spec Kit may modify | Superpowers may modify |
|---|---|---|---|---|---|
| `docs/discovery/**` | A | Human | NO (raw input) | NO | NO |
| `product-brief.md` | A | BMAD + human | YES | NO | NO |
| `prd.md` | A | BMAD + human | YES | NO | NO |
| `architecture-baseline.md` | A (+B reads) | BMAD + human | YES | NO | NO |
| `ux-spec.md` | A | BMAD + human | YES | NO | NO |
| `glossary.md` | A, B | Human | YES | NO | NO |
| `feature-map.md` | A, B | Human | YES | append only | NO |
| `verification.md` | all | Human / platform | YES | NO | NO |
| `baseline-freeze.yaml` | A | Integration layer | NO | NO | NO |
| `constitution.md` | all | Spec Kit | YES | YES | NO |
| `spec.md` | A, B | Spec Kit | YES | YES | NO |
| `plan.md` | A, B | Spec Kit | YES | YES | NO |
| `tasks.md` | A, B | Spec Kit | YES | YES | NO, except convergence append |
| `handoff.yaml` | A, B | Integration layer | NO | NO | NO |
| `change-record.yaml` | C | Integration layer | YES (for the change) | n/a | NO, except status fields |
| `task-N-brief.md` | A, B | Superpowers | NO | NO | YES |
| `progress.md` | A, B | Superpowers | NO | NO | YES |
| `task-N-report.md` | A, B | Superpowers | NO | NO | YES |
| `task-N-review.md` | A, B | Superpowers | NO | NO | YES |
| `rulings.md` | all | Superpowers | NO | NO | YES |
| source code | all | Coding agent | YES for implementation | — | YES |
| tests | all | Coding agent | YES as evidence | — | YES |
| Git commits / MR | all | Git / GitLab | YES | — | YES |

---

## 7. What the Three Frameworks MUST NOT Duplicate

| Concept | Owned once by | Never recreated by |
|---|---|---|
| Product requirement | BMAD `prd.md` | Spec Kit, Superpowers |
| Architecture baseline | BMAD `architecture-baseline.md` | Spec Kit `plan.md` (it *refines*, it does not *redefine*) |
| Feature specification | Spec Kit `spec.md` | BMAD epics, Superpowers |
| Feature architecture refinement | Spec Kit `plan.md` | Superpowers |
| Task list | Spec Kit `tasks.md` | BMAD stories, Superpowers |
| Execution context per task | Superpowers `task-N-brief.md` | BMAD story files, Spec Kit |

**Hard rule for Track A:** BMAD epics are an *index* that becomes `feature-map.md`. BMAD stories are **not generated at all**.

---

# PART II — TRACK A: GREENFIELD
### BMAD → Spec Kit → Superpowers

## A.1 When to use

- No existing codebase, or a codebase with no approved architecture baseline.
- Requirements are not yet well understood and need discovery.
- The output must serve many features over months.

**Do not use Track A for a single feature on an existing system.** That is Track B.

---

## A.2 Pipeline Overview

```text
  PHASE 0 — HUMAN INPUT COLLECTION
        │
        ▼
  PHASE 1 — BMAD DISCOVERY & PLANNING  (Layer 0 + 1.5)
        │   A1 workflow-init
        │   A2 product brief
        │   A3 PRD
        │   A4 architecture
        │   A5 solutioning gate
        ▼
  PHASE 2 — BASELINE FREEZE  ◄── HUMAN SIGN-OFF, MANDATORY
        │   A6 glossary / feature-map / verification contract
        │   A7 baseline-freeze.yaml
        ▼
  PHASE 3 — SPEC KIT GOVERNANCE
        │   A8 constitution.md
        ▼
  PHASE 4 — FEATURE 000 WALKING SKELETON
        │   A9 skeleton spec → plan → tasks → execution
        ▼
  PHASE 5 — PER-FEATURE LOOP  (repeat for 001..00N)
        │   A10 specify
        │   A11 clarify
        │   A12 plan
        │   A13 tasks
        │   A14 analyze
        │   A15 handoff generation
        │   A16 handoff validation
        │   A17 Superpowers execution
        │   A18 convergence
        │   A19 MR
        ▼
  DELIVERY
```

---

## A.3 Directory Structure (Track A)

```text
repository/
│
├── docs/
│   └── discovery/                      # raw human input — NOT authoritative
│       ├── interviews/
│       ├── as-is-process/
│       ├── sample-data/                # anonymised
│       ├── external-contracts/         # OpenAPI/WSDL/sample payloads
│       └── compliance/
│
├── .bmad/                              # BMAD working area, Phase 1–3 ONLY
│   ├── config.yaml                     # pinned BMAD version + track
│   └── output/                         # raw BMAD generations before curation
│
├── .specify/
│   ├── memory/                         # ◄── PRODUCT BASELINE (Layer 0 + 1.5)
│   │   ├── constitution.md
│   │   ├── product-brief.md
│   │   ├── prd.md
│   │   ├── prd/                        # sharded PRD sections
│   │   │   ├── fr-catalog.md
│   │   │   ├── nfr-catalog.md
│   │   │   └── epics.md
│   │   ├── architecture-baseline.md
│   │   ├── architecture/               # sharded architecture sections
│   │   │   ├── tech-stack.md
│   │   │   ├── source-tree.md
│   │   │   ├── coding-standards.md
│   │   │   ├── data-model.md
│   │   │   └── integration-contracts.md
│   │   ├── ux-spec.md
│   │   ├── glossary.md                 # bilingual VI–EN, MANDATORY
│   │   ├── feature-map.md
│   │   ├── verification.md
│   │   ├── adr/
│   │   │   └── ADR-001-*.md
│   │   └── baseline-freeze.yaml        # ◄── baseline version record
│   │
│   └── specs/
│       ├── 000-walking-skeleton/
│       │   ├── spec.md
│       │   ├── plan.md
│       │   └── tasks.md
│       └── 001-<feature-slug>/
│           ├── spec.md
│           ├── plan.md
│           └── tasks.md
│
├── .superpowers/
│   └── sdd/
│       └── 001-<feature-slug>/
│           ├── handoff.yaml
│           ├── progress.md
│           ├── rulings.md
│           ├── task-001-brief.md
│           ├── task-001-report.md
│           ├── task-001-review.md
│           └── runs/
│               └── 2026-09-17-001/
│                   ├── manifest.yaml
│                   ├── spec.snapshot.md
│                   ├── plan.snapshot.md
│                   └── tasks.snapshot.md
│
├── src/
├── tests/
└── docs/
```

### Rules

- `.bmad/output/` is a scratch area. Nothing there is authoritative. Curated content is promoted into `.specify/memory/`.
- Do NOT duplicate `prd.md` or `architecture-baseline.md` under `.superpowers/`.
- Do NOT duplicate `spec.md` / `plan.md` / `tasks.md` under `.superpowers/`.
- Superpowers references baseline and Spec Kit artifacts **by path + version**.

---

## A.4 Step-by-Step Contract

Each step declares **Actor**, **Input**, **Output**, **Exit gate**, and **On failure**.

---

### A0 — Human Input Collection

**Actor:** Business owner, domain expert, tech lead. No agent.

**Input:** business reality.

**Output:** files under `docs/discovery/`
- problem statement + measurable business objective
- personas and their permissions
- MVP scope-in and **scope-out** lists
- as-is process description, real forms/documents
- anonymised sample data
- external system contracts
- compliance and legal constraints
- non-functional targets with numbers (TPS, p95 latency, data volume Y1/Y3, RPO/RTO, uptime)
- mandated technology constraints and existing company CI/CD standards
- named decision-maker who can answer clarification questions within an agreed SLA

**Exit gate:** scope-out list exists; NFRs carry numbers; a decision-maker is named.

**On failure:** do not start BMAD. An agent interviewing a person who has no authority to decide produces a confident and wrong PRD.

---

### A1 — BMAD Workflow Initialisation

**Actor:** BMAD orchestrator + human.

**Command:** `*workflow-init` (exact invocation depends on the installed BMAD version).

**Input:** project goal statement, `docs/discovery/` summary.

**Output:**
- selected track (**use BMad Method track**; Enterprise track only if there are real compliance obligations)
- `.bmad/config.yaml` with the **pinned BMAD version**

**Exit gate:** track recorded; version pinned in git.

**On failure / notes:** do NOT use the Quick Flow track — it produces a tech-spec only and no architecture baseline, which defeats the purpose of Track A. Never run BMAD from a floating `@alpha` tag; output format changes will break the downstream pipeline.

---

### A2 — Product Brief

**Actor:** BMAD Analyst agent + human.

**Input:** problem statement, personas, scope-in/out, discovery notes, market/competitor research if needed.

**Output:** `.specify/memory/product-brief.md`
- problem, objective, success metrics
- target users
- MVP boundary
- key assumptions and risks

**Exit gate:** human reviewed; success metrics measurable.

**On failure:** if the brief cannot state what "done and successful" means numerically, return to A0.

---

### A3 — Product Requirements Document

**Actor:** BMAD PM agent + human.

**Input:** `product-brief.md`, domain input, NFR targets, compliance constraints.

**Output:**
- `.specify/memory/prd.md` and sharded `.specify/memory/prd/`
  - `FR-xxx` catalog — **stable IDs, one requirement per ID**
  - `NFR-xxx` catalog with numeric targets
  - epic list (an index only — see A6)
- open questions list

**Exit gate:**
- every FR has a unique stable ID
- every NFR has a number
- no epic contains generated user stories (delete them if BMAD produced them)

**On failure:** unresolved open questions go back to the named decision-maker, not to the agent's imagination.

**Critical rule:** the PRD is the **product-level** source of truth. `spec.md` will be derived from it later and MUST trace back to these FR IDs.

---

### A4 — Architecture Baseline

**Actor:** BMAD Architect agent + human tech lead.

**Input:** `prd.md`, NFR catalog, mandated tech constraints, external contracts, team skill profile.

**Output:**
- `.specify/memory/architecture-baseline.md` and sharded `.specify/memory/architecture/`
  - tech stack (decided, not suggested)
  - module/service boundaries and source tree layout
  - data model overview
  - integration contracts
  - coding standards
  - cross-cutting concerns: authN/Z, tenancy, transactions, error handling, logging, observability
- `.specify/memory/adr/ADR-*.md` for each significant decision
- `.specify/memory/ux-spec.md` if the product has a UI

**Exit gate:** the source tree layout is concrete enough that a task brief can express an *allowed scope* as real directory paths.

**On failure:** if the architecture cannot express directory-level boundaries, Superpowers scope control (Part V §4) cannot function.

---

### A5 — Solutioning Gate Check

**Actor:** BMAD Architect agent, then human.

**Input:** `product-brief.md`, `prd.md`, `architecture-baseline.md`, `ux-spec.md`.

**Output:** gate report — consistency between PRD and architecture, coverage of every FR and NFR by an architectural decision, list of unresolved items.

**Exit gate:** no unresolved blocking item.

**On failure:** loop back to A3 or A4. **BMAD stops here. Phase 4 is never run.**

---

### A6 — Human Baseline Curation

**Actor:** Human. This step is not delegated to an agent.

**Input:** BMAD outputs from A2–A5.

**Output:**

1. `.specify/memory/glossary.md` — **bilingual VI–EN**, one canonical term per concept, ≥ 20 core terms, each with exactly one definition. This is the single highest-value artifact for a Vietnamese team: without it, agents will emit `merchant`, `dai_ly`, `agent`, and `distributor` for the same concept in four modules, and no task-scoped review will ever catch it.
2. `.specify/memory/feature-map.md` — the BMAD epic list converted into **vertical slices**, each:
   - feature ID (`001`, `002`, …)
   - one-line outcome demonstrable to a user
   - FR references from the PRD
   - dependency order
   - estimated task count (**target ≤ 15 tasks / ≤ 1 week of execution**)
3. `.specify/memory/verification.md` — the executable verification contract: test command, lint command, build command, coverage threshold, integration test command, and any environment prerequisites.

**Exit gate:** every PRD FR appears in at least one feature in `feature-map.md`; every verification command actually runs.

**On failure:** an FR with no owning feature will surface later as a convergence gap after all tasks are "done" — the most expensive place to find it.

---

### A7 — Baseline Freeze

**Actor:** Integration layer + human sign-off.

**Input:** all of `.specify/memory/`.

**Output:** `.specify/memory/baseline-freeze.yaml`

```yaml
baseline_id: 2026-09-17-001
status: frozen
approved_by: <human name/role>
approved_at: 2026-09-17T10:00:00+07:00

bmad:
  version: <pinned version>
  track: bmad-method

artifacts:
  product_brief:
    path: .specify/memory/product-brief.md
    git_sha: <sha>
  prd:
    path: .specify/memory/prd.md
    version: 1
    git_sha: <sha>
  architecture:
    path: .specify/memory/architecture-baseline.md
    version: 1
    git_sha: <sha>
  glossary:
    path: .specify/memory/glossary.md
    git_sha: <sha>
  feature_map:
    path: .specify/memory/feature-map.md
    git_sha: <sha>
  verification:
    path: .specify/memory/verification.md
    git_sha: <sha>
  ux_spec:
    path: .specify/memory/ux-spec.md
    git_sha: <sha>

policy:
  baseline_mutable_by: [human, bmad]
  baseline_mutable_by_speckit: false
  baseline_mutable_by_superpowers: false
  change_requires: baseline_revision_workflow
```

**Exit gate:** committed to git; a human name is on it.

**On failure:** without a freeze, one agent reads a draft PRD while another edits it. Every downstream artifact becomes unverifiable.

---

### A8 — Constitution

**Actor:** Spec Kit.

**Command:** `/speckit.constitution`

**Input:** **derived from the frozen baseline** — `architecture/coding-standards.md`, `architecture/tech-stack.md`, `verification.md`, plus engineering governance (Definition of Done, review policy, branch/MR convention, TDD policy).

**Output:** `.specify/memory/constitution.md`

**Exit gate:** the constitution contradicts nothing in `architecture-baseline.md`.

**On failure:** do not hand-write a constitution in parallel with the BMAD architecture output. Two sets of technical rules will drift apart within two features.

**Known limitation:** the constitution is currently read by `plan` and `analyze`, **not by `specify`**. Therefore domain terminology must live in `glossary.md` and be referenced explicitly from `AGENTS.md` / `CLAUDE.md`, not hidden inside the constitution.

---

### A9 — Feature 000: Walking Skeleton

**Actor:** Human-led, optionally executed by Superpowers with a relaxed policy.

**Why it exists:** a greenfield repository cannot satisfy the normal handoff contract. Task briefs require an *allowed scope* of real directories; TDD requires a test runner; validator rule HV009 requires verification commands that execute; HV014 requires a valid working tree. None of these exist in an empty repo.

**Input:** `architecture/source-tree.md`, `verification.md`, `tech-stack.md`.

**Output:**
- repository skeleton matching the architecture's module boundaries
- test harness (unit + integration), runnable
- lint/format configuration
- CI pipeline
- migration tooling
- health endpoint
- **one thin vertical slice** from API → service → persistence → test

**Handoff:** `.superpowers/sdd/000-walking-skeleton/handoff.yaml` with:

```yaml
policy:
  allow_replan: false
  allow_spec_change: false
  allow_architecture_change: false
  require_tdd: false            # bootstrap exemption — the harness is being built
  tdd_exemption_reason: "Bootstrap: test harness does not yet exist."
  require_task_review: true
  require_code_quality_review: true
  require_final_verification: true
  require_convergence: false
```

**Exit gate:** every command in `verification.md` executes successfully on a clean clone.

**On failure:** do not start feature 001. Every subsequent task brief depends on this skeleton being real.

**Note:** the walking skeleton is the *living* architecture document. Agents imitate the slice far more reliably than they follow prose in `plan.md`.

---

### A10 — Feature Specification

**Actor:** Spec Kit.

**Command:** `/speckit.specify`

**Input:**
- the feature's entry in `feature-map.md`
- the referenced `FR-xxx` sections from the sharded PRD (**not the whole PRD**)
- relevant `NFR-xxx`
- `glossary.md`
- relevant UX spec sections

Describe **WHAT and WHY only**. No tech stack.

**Output:** `.specify/specs/<feature-id>/spec.md` with user stories, functional requirements, acceptance criteria, success criteria.

**Exit gate:** every FR in `spec.md` traces to a PRD `FR-xxx`.

**On failure — the most important rule in Track A:**
If specification work reveals a requirement that is **not in the PRD**, STOP. Do not add it to `spec.md`. Escalate to a baseline revision (A3), re-freeze, then resume. `spec.md` is a *derived* artifact; it may refine and decompose, it may never invent.

---

### A11 — Clarification

**Actor:** Spec Kit + the named decision-maker.

**Command:** `/speckit.clarify`

**Input:** `spec.md` with `[NEEDS CLARIFICATION]` markers.

**Output:** resolved `spec.md`; any product-level answers back-ported into the PRD.

**Exit gate:** zero blocking `[NEEDS CLARIFICATION]` remaining.

**On failure:** validator rule HV005 will block the handoff anyway. Resolving it here is cheaper.

---

### A12 — Implementation Plan

**Actor:** Spec Kit.

**Command:** `/speckit.plan`

**Input:** `spec.md`, `constitution.md`, `architecture-baseline.md` + relevant sharded architecture sections, existing source tree.

**Output:** `.specify/specs/<feature-id>/plan.md` — how this feature is realised **within** the baseline architecture.

**Exit gate:** `plan.md` introduces no architectural decision that contradicts `architecture-baseline.md`.

**On failure:** a genuine architectural need not covered by the baseline is an **ARCHITECTURE_CONFLICT** → baseline revision (A4) + new ADR + re-freeze. It is never resolved inside `plan.md`.

---

### A13 — Task Decomposition

**Actor:** Spec Kit.

**Command:** `/speckit.tasks`

**Input:** `spec.md`, `plan.md`.

**Output:** `.specify/specs/<feature-id>/tasks.md` — dependency-ordered, actionable tasks with IDs `T001…`, each referencing the requirement it satisfies.

**Exit gate:** every acceptance criterion in `spec.md` is covered by at least one task; each task has an allowed scope expressible as directory paths.

**On failure:** if the feature yields more than ~15 tasks, split the feature in `feature-map.md` instead of proceeding.

---

### A14 — Cross-Artifact Analysis

**Actor:** Spec Kit.

**Command:** `/speckit.analyze`

**Input:** `constitution.md`, `spec.md`, `plan.md`, `tasks.md`.

**Output:** consistency and coverage report.

**Exit gate:** no blocking inconsistency.

---

### A15 — Handoff Generation

**Actor:** Integration layer.

**Input:** frozen baseline + feature artifacts.

**Output:** `.superpowers/sdd/<feature-id>/handoff.yaml`

```yaml
feature_id: 001-<feature-slug>
track: A

baseline:
  baseline_id: 2026-09-17-001
  prd:
    path: .specify/memory/prd.md
    version: 1
    git_sha: <sha>
  architecture:
    path: .specify/memory/architecture-baseline.md
    version: 1
    git_sha: <sha>
  glossary:
    path: .specify/memory/glossary.md
    git_sha: <sha>

constitution:
  path: .specify/memory/constitution.md
  git_sha: <sha>

spec:
  path: .specify/specs/001-<feature-slug>/spec.md
  version: 3
  git_sha: <sha>

plan:
  path: .specify/specs/001-<feature-slug>/plan.md
  version: 2
  git_sha: <sha>

tasks:
  path: .specify/specs/001-<feature-slug>/tasks.md
  version: 4
  git_sha: <sha>

execution:
  engine: superpowers
  mode: subagent-driven-development

policy:
  allow_replan: false
  allow_spec_change: false
  allow_architecture_change: false
  allow_baseline_change: false
  require_tdd: true
  require_task_review: true
  require_code_quality_review: true
  require_final_verification: true
  require_convergence: true

verification:
  source: .specify/memory/verification.md
  commands:
    test: <cmd>
    integration: <cmd>
    lint: <cmd>
    build: <cmd>

context:
  include:
    - constitution
    - glossary
    - feature_spec
    - implementation_plan
    - referenced_prd_sections      # sharded sections ONLY
    - referenced_architecture_sections
    - current_task
    - relevant_dependencies
  exclude:
    - full_prd
    - full_architecture_document
    - unrelated_tasks
    - unrelated_features
    - full_chat_history
    - unrelated_repository_context
```

**Exit gate:** file exists and is committed.

**Critical:** `context.include` references **sharded sections**, never the whole PRD. A BMAD PRD is large; injecting it into every subagent is Anti-pattern 4 (Part V §12).

---

### A16 — Handoff Validation

**Actor:** Handoff Validator (see Part V §7 for the full rule list).

**Input:** `handoff.yaml` + all referenced artifacts.

**Output:** PASS, or a fail report naming the violated rules.

**Exit gate:** PASS. Track A additionally requires `BV001–BV005` (baseline rules).

**On failure:** `DO NOT START SUPERPOWERS`. Return the feature to the owning phase.

---

### A17 — Superpowers Execution

**Actor:** Superpowers execution controller + subagents.

**Input:** validated `handoff.yaml`.

**Per task:** brief → TDD → implement → spec-compliance review → code-quality review → verify → report → commit → version drift check.

**Output:** code, tests, `task-N-brief.md`, `task-N-report.md`, `task-N-review.md`, `progress.md`, `rulings.md`, commits.

**Exit gate:** all tasks PASS both reviews and verification.

---

### A18 — Convergence

**Actor:** Spec Kit convergence.

**Input:** `spec.md`, `plan.md`, `tasks.md`, implementation, test/review evidence. Track A adds a PRD-coverage check for the FRs this feature owns.

**Output:** classification per requirement — `missing` / `partial` / `contradiction` / `unrequested` / `converged`; plus appended convergence tasks if gaps exist.

**Exit gate:** converged, no blocking gap.

**On failure:** a gap becomes a **task**, not a direct code patch.

---

### A19 — Final Verification & MR

**Input:** converged feature.

**Output:** final verification run, merge request with traceability summary:

```text
PRD FR-012 → spec FR-003 → plan §transaction-boundary → T005
  → task-005-brief.md → commit abc123 → cancel-order.spec.ts
  → review-005.md → MR !123
```

**Exit gate:** the Part V §10 completion checklist is fully satisfied.

---

## A.5 Baseline Revision Workflow

The baseline is frozen, not immutable. When a genuine product or architecture change is required:

```text
CHANGE REQUEST
     ↓
PAUSE all in-flight feature execution
     ↓
BMAD updates prd.md and/or architecture-baseline.md (+ ADR)
     ↓
Human re-approves → baseline_id increments
     ↓
Impact analysis: which features' spec/plan/tasks are now stale?
     ↓
Re-run /speckit.plan (and /speckit.specify if FRs changed) for affected features
     ↓
Regenerate handoff.yaml → re-validate
     ↓
RESUME
```

Any handoff whose `baseline.baseline_id` no longer matches the current freeze is **stale** and MUST NOT execute.

---

## A.6 Track A Anti-Patterns

| # | Anti-pattern | Why it breaks |
|---|---|---|
| A1 | Running BMAD Phase 4 (SM / story / Dev agent) | Creates a third task list and a second task-brief mechanism. Violates the single-task-list rule. |
| A2 | One giant `spec.md` for the whole system | 80–120 tasks; convergence always finds gaps; any spec change invalidates every in-flight handoff. |
| A3 | Letting `spec.md` introduce FRs not in the PRD | Two product sources of truth; the PRD silently becomes fiction. |
| A4 | Skipping feature 000 | Task briefs cannot express scope; TDD impossible; validator fails or, worse, is disabled. |
| A5 | Writing `constitution.md` independently of the BMAD architecture output | Two conflicting sets of technical rules. |
| A6 | Skipping the bilingual glossary | Naming chaos across modules that task-scoped review structurally cannot detect. |
| A7 | Injecting the full PRD into subagent context | Token burn and context pollution; degrades implementation quality. |
| A8 | Starting Spec Kit before the baseline is frozen | Agents read a moving target; downstream artifacts become unverifiable. |
| A9 | Using BMAD Quick Flow track for a greenfield system | No architecture baseline is produced. |
| A10 | Floating BMAD `@alpha` version | Output format changes silently break the pipeline. |

---

# PART III — TRACK B: BROWNFIELD FEATURE
### Spec Kit → Superpowers

## B.1 When to use

- An approved product baseline already exists (created by Track A, or reconstructed for a legacy system — see B.6).
- The work adds or changes a user-visible capability, a contract, a data model, a business rule, or an NFR.
- The work is bigger than a defect fix.

**Do not run BMAD in Track B.** The baseline already exists. Re-running discovery produces a second PRD.

---

## B.2 Pipeline Overview

```text
  B0  Feature request intake            ◄── human
        │
  B1  Baseline reference check          ◄── which FRs/ADRs does this touch?
        │
  B2  Impact analysis on existing code  ◄── read-only
        │
  B3  /speckit.specify
        │
  B4  /speckit.clarify
        │
  B5  /speckit.plan
        │
  B6  /speckit.tasks
        │
  B7  /speckit.analyze
        │
  B8  Handoff generation
        │
  B9  Handoff validation                ◄── GATE
        │
  B10 Superpowers execution
        │
  B11 Spec Kit convergence
        │
  B12 Final verification → MR
```

---

## B.3 Directory Structure (Track B)

```text
repository/
│
├── .specify/
│   ├── memory/
│   │   ├── constitution.md             # required
│   │   ├── glossary.md                 # required
│   │   ├── verification.md             # required
│   │   ├── architecture-baseline.md    # required (inherited or reconstructed)
│   │   ├── architecture/
│   │   ├── prd.md                      # optional for legacy systems
│   │   ├── feature-map.md              # append-only backlog index
│   │   ├── adr/
│   │   └── baseline-freeze.yaml        # optional but recommended
│   │
│   └── specs/
│       └── 014-<feature-slug>/
│           ├── spec.md
│           ├── plan.md
│           ├── tasks.md
│           └── impact-analysis.md      # ◄── Track B specific
│
├── .superpowers/
│   └── sdd/
│       └── 014-<feature-slug>/
│           ├── handoff.yaml
│           ├── codebase-context.md     # ◄── Track B specific
│           ├── progress.md
│           ├── rulings.md
│           ├── task-001-brief.md
│           ├── task-001-report.md
│           ├── task-001-review.md
│           └── runs/
│
├── src/
└── tests/
```

Two artifacts distinguish Track B from Track A:

- **`impact-analysis.md`** (Spec Kit side) — what already exists, what will change, what must not break.
- **`codebase-context.md`** (Superpowers side) — the read-only map of existing code that subagents need in order not to reinvent what is already there.

---

## B.4 Step-by-Step Contract

### B0 — Feature Request Intake

**Actor:** Human (product owner / business).

**Input:** the request, in business language.

**Output:** an entry appended to `feature-map.md`:
- feature ID, outcome statement, requester, priority
- referenced PRD `FR-xxx` if the baseline has a PRD, otherwise a short requirement statement
- explicit scope-out list

**Exit gate:** the request states an outcome, not a solution ("operations staff can cancel an order within 24h", not "add a cancel button").

**On failure:** a request phrased as a solution smuggles in an architecture decision that no one reviewed.

---

### B1 — Baseline Reference Check

**Actor:** Human tech lead or a read-only agent.

**Input:** feature request, `architecture-baseline.md`, `adr/`, `glossary.md`, `prd.md` (if present).

**Output:** a short reference list recorded at the top of `impact-analysis.md`:
- PRD FRs touched (or "no PRD coverage — new requirement")
- ADRs that constrain this work
- glossary terms involved, plus any **new** term that must be added to the glossary *before* specification starts
- whether the feature can be built within the current architecture: **YES / NO**

**Exit gate:** answer is YES.

**On failure:** answer NO → **escalate to a Track A baseline revision**. Do not let `plan.md` quietly invent a new architecture.

---

### B2 — Impact Analysis

**Actor:** Read-only analysis agent + human review. **No code is modified in this step.**

**Input:** codebase, existing tests, `spec`-level request, baseline references.

**Output:** `.specify/specs/<feature-id>/impact-analysis.md`

```markdown
# Impact Analysis — 014-<feature-slug>

## Existing behaviour
- What the system does today in this area, with file references.

## Affected modules
- src/order/**            (modify)
- src/notification/**     (read-only dependency)

## Affected contracts
- API: POST /orders/{id}/cancel  — new
- DB: orders.status              — new enum value
- Events: OrderCancelled         — new

## Existing tests that must keep passing
- tests/order/*.spec.ts

## Regression risk
- Fulfilment flow reads orders.status with an exhaustive switch.

## Reusable assets
- OrderRepository.withTransaction() already exists — reuse, do not duplicate.

## Migration / backward-compatibility needs
- Enum value requires a data migration and a rollout ordering constraint.

## Out of scope
- Pricing module, refunds.
```

**Exit gate:** affected contracts and regression risks are enumerated.

**On failure:** without this, the agent rediscovers the codebase inside every task, or duplicates an abstraction that already exists — the single most common brownfield failure.

---

### B3 — Feature Specification

**Actor:** Spec Kit. **Command:** `/speckit.specify`

**Input:** feature request, `impact-analysis.md`, `glossary.md`, relevant PRD sections, NFR constraints. WHAT/WHY only.

**Output:** `.specify/specs/<feature-id>/spec.md`, including an explicit **"Existing behaviour that must not change"** section derived from the impact analysis.

**Exit gate:** acceptance criteria cover both new behaviour **and** preserved behaviour.

---

### B4 — Clarification

**Actor:** Spec Kit + decision-maker. **Command:** `/speckit.clarify`

**Input:** `spec.md` with open markers.

**Output:** resolved `spec.md`. If the baseline has a PRD and a product-level answer emerges, back-port it to the PRD (that is a baseline revision).

**Exit gate:** zero blocking clarifications.

---

### B5 — Implementation Plan

**Actor:** Spec Kit. **Command:** `/speckit.plan`

**Input:** `spec.md`, `impact-analysis.md`, `constitution.md`, `architecture-baseline.md`, existing source tree.

**Output:** `plan.md` — including migration strategy, backward-compatibility strategy, and rollout ordering when contracts change.

**Exit gate:** no contradiction with the baseline; migration path stated for every contract change.

**On failure:** ARCHITECTURE_CONFLICT → escalate (Part V §6).

---

### B6 — Task Decomposition

**Actor:** Spec Kit. **Command:** `/speckit.tasks`

**Input:** `spec.md`, `plan.md`, `impact-analysis.md`.

**Output:** `tasks.md`. Brownfield task lists should additionally contain:
- a characterisation-test task when the area is under-tested
- a migration task, sequenced before the tasks that depend on it
- a regression-verification task at the end

**Exit gate:** every affected contract has an owning task; ordering respects migration dependencies.

---

### B7 — Cross-Artifact Analysis

**Actor:** Spec Kit. **Command:** `/speckit.analyze`

**Output:** consistency report. **Exit gate:** no blocking inconsistency.

---

### B8 — Handoff Generation

**Actor:** Integration layer.

**Output A:** `.superpowers/sdd/<feature-id>/codebase-context.md` — a compact, task-independent map of what exists: relevant modules and their responsibilities, reusable helpers, established patterns to imitate, known landmines. **Target: one page.** This is not a repository dump.

**Output B:** `.superpowers/sdd/<feature-id>/handoff.yaml`

```yaml
feature_id: 014-<feature-slug>
track: B

baseline:
  architecture:
    path: .specify/memory/architecture-baseline.md
    git_sha: <sha>
  glossary:
    path: .specify/memory/glossary.md
    git_sha: <sha>
  prd:                                  # omit for legacy systems without a PRD
    path: .specify/memory/prd.md
    version: 7
    git_sha: <sha>

constitution:
  path: .specify/memory/constitution.md
  git_sha: <sha>

spec:
  path: .specify/specs/014-<feature-slug>/spec.md
  version: 2
  git_sha: <sha>

plan:
  path: .specify/specs/014-<feature-slug>/plan.md
  version: 1
  git_sha: <sha>

tasks:
  path: .specify/specs/014-<feature-slug>/tasks.md
  version: 3
  git_sha: <sha>

impact_analysis:
  path: .specify/specs/014-<feature-slug>/impact-analysis.md
  git_sha: <sha>

codebase_context:
  path: .superpowers/sdd/014-<feature-slug>/codebase-context.md

execution:
  engine: superpowers
  mode: subagent-driven-development
  base_branch: main

policy:
  allow_replan: false
  allow_spec_change: false
  allow_architecture_change: false
  require_tdd: true
  require_characterization_tests: true   # brownfield-specific
  require_task_review: true
  require_code_quality_review: true
  require_regression_suite: true         # brownfield-specific
  require_final_verification: true
  require_convergence: true

verification:
  commands:
    test: <cmd>
    integration: <cmd>
    regression: <cmd>
    lint: <cmd>

context:
  include:
    - constitution
    - glossary
    - feature_spec
    - implementation_plan
    - codebase_context
    - impact_analysis_relevant_sections
    - current_task
    - relevant_dependencies
  exclude:
    - full_repository
    - unrelated_modules
    - unrelated_tasks
    - full_chat_history
```

---

### B9 — Handoff Validation

**Input:** `handoff.yaml` + referenced artifacts.

**Output:** PASS or fail report. Track B applies `HV001–HV014` (with `HV015` substituting baseline rules) plus `BF001–BF004`:

```text
BF001 impact-analysis.md exists and is non-trivial
BF002 every affected contract has an owning task
BF003 regression verification command exists and currently passes on base branch
BF004 codebase-context.md exists and is within size budget
```

**On failure:** `DO NOT START SUPERPOWERS`.

---

### B10 — Superpowers Execution

Identical to Track A (Part V §3–§5), with two additions:

1. Each task brief includes a **"Must not break"** section derived from `impact-analysis.md`.
2. The regression suite runs **per task**, not only at the end. In brownfield, the cost of discovering a regression ten tasks later is far higher than the cost of running the suite each time.

---

### B11 — Convergence

Same as Track A, plus an explicit check: **did anything outside the declared scope change?** A diff touching files outside the union of all task allowed-scopes is a convergence finding, even when the tests pass.

---

### B12 — Final Verification & MR

Full verification suite plus the regression suite on a clean environment. MR description contains the traceability chain and the impact-analysis summary so a human reviewer knows what to look at.

---

## B.5 Track B Anti-Patterns

| # | Anti-pattern | Why it breaks |
|---|---|---|
| B1 | Running BMAD for a single feature | Produces a second PRD and a competing architecture view. |
| B2 | Skipping impact analysis | Agent duplicates existing abstractions or silently breaks adjacent behaviour. |
| B3 | Passing the whole repository as context | Token burn; the agent still misses the one file that matters. |
| B4 | Treating a baseline conflict as a plan detail | An unreviewed architecture change enters production via `plan.md`. |
| B5 | Running the regression suite only at the end | Regression bisection across ten tasks. |
| B6 | Adding a new domain term without updating the glossary | Naming drift that review cannot catch. |

---

## B.6 Brownfield Without a Baseline (Legacy Systems)

If the existing system has no `architecture-baseline.md`, do **not** run full Track A. Run a one-time, bounded reconstruction:

```text
1. Reconstruct architecture-baseline.md from the code (module map, tech stack,
   data model, integration contracts, cross-cutting patterns).
2. Reconstruct glossary.md from the code and from domain experts.
3. Define verification.md against the existing build.
4. Write constitution.md.
5. Record known deviations and debt as ADRs with status: accepted-as-is.
6. Freeze as baseline_id: reconstructed-<date>.
```

`prd.md` is optional here — for a legacy system, reconstructing a full PRD is usually waste. The architecture baseline and the glossary are not optional; they are what make every subsequent Track B feature cheap.


---

# PART IV — TRACK C: DIRECT CHANGE
### Superpowers only

## C.1 When to use

Track C exists so that a one-line fix does not cost a specification cycle. It is deliberately narrow.

### Entry criteria — ALL must be true

```text
CV001  The change fixes a defect against documented/intended behaviour,
       or is a purely internal change with no behavioural effect.
CV002  No business rule changes.
CV003  No public API, event, or external integration contract changes.
CV004  No database schema or data model changes (no migration).
CV005  No authN/authZ, tenancy, or permission changes.
CV006  No acceptance criterion is added, removed, or altered.
CV007  No measurable NFR impact (performance, availability, security posture).
CV008  No new runtime dependency is introduced.
CV009  The defect is reproducible and can be pinned by a regression test.
CV010  The change fits within a single module's allowed scope.
```

### Explicitly allowed in Track C

- bug fix with a regression test
- log message / error message correction
- dependency patch-version bump with no API change
- configuration value correction
- documentation and comment fixes
- typo, formatting, lint fix
- internal refactor that is behaviour-preserving, test-covered, and scoped to one module

### Explicitly NOT allowed in Track C

- "small feature"
- "quick API field addition"
- "just one more column"
- performance optimisation with an architectural effect
- anything the agent describes as "while I was in there"

**If any entry criterion fails → Track B.** This gate is the whole value of Track C; a Track C that accepts feature work is just an undocumented Track B.

---

## C.2 Pipeline Overview

```text
  C0  Defect intake                      ◄── human / ticket
        │
  C1  Entry criteria check               ◄── GATE (CV001–CV010)
        │
  C2  Reproduce + write failing test     ◄── RED
        │
  C3  Root cause analysis
        │
  C4  Scope declaration                  ◄── change-record.yaml
        │
  C5  Minimal fix                        ◄── GREEN
        │
  C6  Regression + full verification
        │
  C7  Code-quality review
        │
  C8  Change report → MR
```

There is no spec, no plan, no task list, and no convergence — the **failing-then-passing test is the specification**, and the regression suite is the convergence.

---

## C.3 Directory Structure (Track C)

```text
repository/
│
├── .specify/
│   └── memory/
│       ├── constitution.md         # still binding
│       ├── glossary.md             # still binding
│       └── verification.md         # still binding
│
├── .superpowers/
│   └── direct/
│       └── 2026-09-17-BUG-4821/
│           ├── change-record.yaml
│           ├── analysis.md          # root cause, optional but recommended
│           ├── report.md
│           └── review.md
│
├── src/
└── tests/
```

Track C writes **nothing** under `.specify/specs/`. Change IDs are `<date>-<ticket-id>` so they sort chronologically and map to the tracker.

---

## C.4 Step-by-Step Contract

### C0 — Defect Intake

**Actor:** Human / issue tracker.

**Input:** bug report.

**Output:** a change request containing: observed behaviour, expected behaviour, reproduction steps, environment, severity, ticket ID.

**Exit gate:** expected behaviour is stated and is traceable to something already documented or obviously intended.

**On failure:** if "expected behaviour" is actually a new requirement, this is not a bug → Track B.

---

### C1 — Entry Criteria Check

**Actor:** Controller agent + human confirmation for anything borderline.

**Input:** the change request, a quick read of the affected area.

**Output:** the `entry_criteria` block of `change-record.yaml`, each criterion explicitly `true`.

**Exit gate:** all ten criteria pass.

**On failure:** **STOP and escalate to Track B.** Record the escalation reason in the ticket. Do not start coding.

---

### C2 — Reproduce and Write the Failing Test

**Actor:** Superpowers implementer.

**Input:** reproduction steps, existing test suite.

**Output:** a failing test that captures the defect, with the failure output recorded.

**Exit gate:** the test fails **for the stated reason** (not a setup error).

**On failure:** if the defect cannot be reproduced by a test, stop and report. Fixing an unreproducible defect produces an unverifiable change and a permanent regression risk.

---

### C3 — Root Cause Analysis

**Actor:** Superpowers implementer.

**Input:** failing test, relevant source.

**Output:** `analysis.md` — root cause, why it was not caught, blast radius, whether the same bug pattern exists elsewhere.

**Exit gate:** root cause identified. A symptom patch without a root cause is a Track C abort, not a Track C success.

**On failure:** if the root cause sits in a contract, schema, or business rule → escalate to Track B.

---

### C4 — Scope Declaration

**Actor:** Controller.

**Output:** `.superpowers/direct/<change-id>/change-record.yaml`

```yaml
change_id: 2026-09-17-BUG-4821
track: C
type: bugfix            # bugfix | config | docs | dependency-patch | internal-refactor
ticket: BUG-4821
severity: high
created_at: 2026-09-17T09:10:00+07:00

constitution:
  path: .specify/memory/constitution.md
  git_sha: <sha>

defect:
  observed: "Cancelling an order leaves the audit record uncommitted."
  expected: "Audit record is committed atomically with the status change."
  documented_behaviour_ref: "spec 001-order-cancellation AC-003"   # or: intended-behaviour
  reproduction: tests/order/cancel-order-audit.regression.spec.ts

entry_criteria:
  CV001_defect_against_documented_behaviour: true
  CV002_no_business_rule_change: true
  CV003_no_contract_change: true
  CV004_no_schema_change: true
  CV005_no_authz_change: true
  CV006_no_acceptance_criteria_change: true
  CV007_no_nfr_impact: true
  CV008_no_new_dependency: true
  CV009_reproducible_by_test: true
  CV010_single_module_scope: true

root_cause: "Audit write executed outside the transaction boundary."

scope:
  allowed:
    - src/order/application/**
    - tests/order/**
  forbidden:
    - src/**/!(order)/**
    - migrations/**
    - "**/openapi.yaml"

policy:
  require_regression_test: true
  require_tdd: true
  require_code_quality_review: true
  require_full_verification: true
  require_spec_review: false        # no feature spec in this track
  require_convergence: false
  max_files_changed: 8              # advisory; exceeding it triggers a re-check of CV010

verification:
  commands:
    test: <cmd>
    regression: <cmd>
    lint: <cmd>

escalation:
  triggers:
    - contract_change_required
    - schema_change_required
    - business_rule_ambiguity
    - fix_requires_forbidden_scope
    - root_cause_not_found
  action: STOP_AND_ESCALATE_TO_TRACK_B

status: in_progress
```

**Exit gate:** committed before the fix is written. A scope declared *after* the fix is not a scope, it is a description.

---

### C5 — Minimal Fix

**Actor:** Superpowers implementer.

**Input:** `change-record.yaml`, failing test, `analysis.md`.

**Output:** the minimal change that turns the test green.

**Exit gate:** the target test passes; no file outside `scope.allowed` is touched.

**On failure:** if the fix requires forbidden scope → STOP, report, escalate. Do not widen the scope because the agent judges it "cleaner".

**Standing rule:** no opportunistic refactoring. "While I was in there" changes are rejected at review regardless of quality.

---

### C6 — Regression and Verification

**Input:** modified working tree.

**Output:** full test suite, regression suite, lint, build — all with recorded results.

**Exit gate:** everything green; no previously passing test now fails.

---

### C7 — Code-Quality Review

**Actor:** Superpowers reviewer subagent.

**Input:** `change-record.yaml`, diff, tests.

**Output:** `review.md`.

**Checks:** is this the root-cause fix or a symptom patch; is the regression test meaningful; is the diff within declared scope; error handling, security, readability; does the same bug pattern exist elsewhere (report it, do **not** fix it here — that is a separate change).

**Exit gate:** PASS.

---

### C8 — Change Report and MR

**Output:** `.superpowers/direct/<change-id>/report.md`

```markdown
# BUG-4821 — Change Report

## Status
PASS

## Track
C — direct change (entry criteria CV001–CV010 verified)

## Root cause
Audit write executed outside the transaction boundary.

## Fix
Moved the audit write inside OrderApplicationService.withTransaction().

## Files changed
- src/order/application/cancel-order.ts
- tests/order/cancel-order-audit.regression.spec.ts

## Tests
- Regression test: RED → GREEN (output recorded)
- Unit: PASS  · Integration: PASS  · Lint: PASS

## Scope compliance
No file outside declared scope was modified.

## Related findings (NOT fixed here)
- Same pattern suspected in src/refund/application/* — raised as BUG-4830.

## Review
Code quality: PASS
```

**MR requirement:** the MR links the ticket and the change record, and states explicitly that this was delivered on Track C with entry criteria verified. This is what makes it auditable that the specification layer was skipped legitimately.

---

## C.5 Track C Guardrails

| Risk | Guardrail |
|---|---|
| Feature work smuggled in as a "fix" | CV001–CV010 verified and recorded *before* coding |
| Scope creep | `scope.forbidden` declared before the fix; diff checked against it at review |
| Symptom patching | Root cause required in `analysis.md`; reviewer explicitly checks for it |
| Unverifiable fixes | Failing-test-first is mandatory; no test, no fix |
| Accumulating undocumented behaviour | Periodic audit: if a module accumulates many Track C changes, its behaviour is drifting from `spec.md` — schedule a Track B reconciliation |
| Silent contract drift | `scope.forbidden` always includes API schema files and `migrations/**` |

### Periodic Track C Audit

Monthly, review all `.superpowers/direct/*` records:

```text
Which modules received the most Track C changes?
Were any entry criteria marked true that should have been false?
How many escalations to Track B occurred, and were they caught at C1 or later?
```

Escalations caught late (at C5 rather than C1) are the signal that the entry gate is being applied carelessly.


---

# PART V — SHARED RULES
### Apply to all tracks unless stated otherwise

## 1. Context Propagation

Different agents get different context. This is a rule, not an optimisation.

| Agent | May read |
|---|---|
| Controller | constitution, glossary, spec, plan, tasks, handoff, repository structure, git state |
| Task-brief generator | current task, referenced requirements, relevant plan sections, dependencies, codebase context, repository metadata |
| Implementer | `task-N-brief.md`, relevant source, relevant tests, verification commands |
| Reviewer | `task-N-brief.md`, diff, tests, referenced requirements |
| Convergence | spec, plan, tasks, implementation evidence, test/review evidence, owned PRD FRs (Track A) |

Never send to a subagent:

```text
entire repository + entire PRD + entire spec + entire plan
+ entire task list + full conversation history
```

**Track A specific:** the PRD is sharded for exactly this reason. Reference sections, never the whole document.

---

## 2. Task Brief Contract (Tracks A and B)

`tasks.md` is authoritative but usually lacks execution context. Each task therefore gets a `task-N-brief.md` containing:

```text
TASK_ID
FEATURE_ID
SOURCE_REFS            (PRD FR → spec FR → plan section)
OBJECTIVE
REQUIREMENTS
ACCEPTANCE_CRITERIA
ARCHITECTURE_DECISIONS (from plan.md and the baseline)
GLOSSARY_TERMS         (canonical naming for this task)
DEPENDENCIES
ALLOWED_SCOPE
FORBIDDEN_SCOPE
MUST_NOT_BREAK         (Track B — from impact-analysis.md)
TEST_REQUIREMENTS
VERIFICATION_COMMANDS
PREVIOUS_TASK_OUTPUTS
```

Example:

```markdown
# Task T005

## Source
- Feature: 001-order-cancellation
- Task: T005
- PRD: FR-012
- Spec: FR-003
- Plan: transaction boundary

## Objective
Implement atomic order cancellation.

## Requirements
- Update order status to CANCELLED.
- Create an audit record.
- Both operations must be atomic.

## Architecture
OrderApplicationService owns the transaction boundary (ADR-004).

## Glossary
- "order" = đơn hàng (entity Order) — not "transaction"
- "cancellation" = huỷ đơn — not "void"

## Scope
Allowed:   src/order/application/**, src/order/domain/**, tests/order/**
Forbidden: product module, pricing module, public API redesign, migrations/**

## Must not break
- Fulfilment flow reads orders.status with an exhaustive switch.

## Acceptance Criteria
- AC-001 Cancellation updates order status.
- AC-002 Audit record is created.
- AC-003 Transaction rolls back if audit creation fails.
- AC-004 Existing order flows remain unaffected.

## Verification
npm test · npm run test:integration · npm run lint

## Dependencies
T004 completed.
```

---

## 3. Prompt Contract for the Implementer

```text
You are implementing task <TASK_ID>.

Read this first:
.superpowers/sdd/<FEATURE_ID>/task-<TASK_ID>-brief.md

The task brief is the authoritative execution context for this task.

Rules:
 1. Do not modify prd.md, architecture-baseline.md, or any file in .specify/memory/.
 2. Do not modify constitution.md, spec.md, or plan.md.
 3. Do not rewrite or remove existing tasks in tasks.md.
 4. Do not expand the task scope.
 5. Follow the architecture decisions in the plan and the baseline.
 6. Use the canonical terms from the glossary section.
 7. Follow TDD.
 8. Verify every acceptance criterion.
 9. Run the required verification commands.
10. Keep changes limited to this task.
11. If a requirement conflicts with spec.md, plan.md, or the baseline, STOP and report.
12. Do not silently change business requirements.
13. Do not silently introduce an alternative architecture.
14. Record significant implementation-level rulings.
15. Produce an execution report.
16. Commit only changes belonging to this task.
```

---

## 4. Decision Authority

| Category | Examples | Agent authority |
|---|---|---|
| **A — Implementation detail** | variable names, private helpers, test fixtures, internal decomposition, small refactors required by the approved design | Decide freely, no record |
| **B — Local technical decision** | reusing an existing helper, choosing a library already in the stack, error-handling shape | Decide, but **record a ruling** |
| **C — Requirement or architecture** | API contract, DB model, tenancy, transaction boundaries, business rules, acceptance criteria, external contracts, new dependency | **Never decide.** STOP → report → update the owning artifact → revalidate → resume |

Ruling format:

```markdown
## Ruling R-003
Decision: Reuse the existing OrderRepository transaction helper.
Reason:   Already provides the required behaviour; avoids a duplicate abstraction.
Impact:   Local implementation only.
Risk:     Low.
```

### Scope Control

Every task and every Track C change declares allowed and forbidden scope. If implementation requires forbidden scope:

```text
STOP → report why the additional scope is required → human decision
```

Scope is never widened because the agent considers the wider change "better".

---

## 5. TDD, Reviews, Reports

### TDD

```text
RED → write failing test → confirm failure
GREEN → minimal implementation → confirm pass
REFACTOR → verify
```

Exemptions must be explicit in policy (documentation-only tasks; the Track A walking skeleton bootstrap). Reports must contain evidence that tests actually ran.

### Two reviews per task (Tracks A and B)

1. **Specification compliance** — did the implementation satisfy the task and its referenced requirements? Checks acceptance criteria, requirement refs, scope, edge cases, tests.
2. **Code quality** — is it technically sound? Checks architecture conformance, maintainability, readability, error handling, security, performance, test quality, duplication, unnecessary complexity.

A task is complete only when both pass. Track C runs code-quality review only (there is no feature spec to comply with), plus the root-cause check.

### Execution report (per task)

```markdown
# T005 Execution Report
## Status: PASS
## Implemented: atomic cancellation, audit record, rollback behaviour
## Files changed: src/order/application/cancel-order.ts, src/order/domain/order.ts, tests/order/cancel-order.spec.ts
## Tests: Unit PASS · Integration PASS · Lint PASS
## Acceptance criteria: AC-001 PASS · AC-002 PASS · AC-003 PASS
## Rulings: R-003
## Review: spec compliance PASS · code quality PASS
```

### Progress

`progress.md` is a convenience view. `tasks.md` remains authoritative for task state.

---

## 6. Versioning, Staleness, and Conflicts

### Handoff captures versions

Every handoff records path + version + `git_sha` for each artifact it depends on, including (Track A) the baseline and its `baseline_id`.

### Staleness detection

```text
handoff.<artifact>.git_sha != current.<artifact>.git_sha
        ↓
PAUSE EXECUTION
        ↓
INVALIDATE HANDOFF
        ↓
REVALIDATE (re-plan if required)
        ↓
NEW HANDOFF
        ↓
RESUME
```

Never execute against stale artifacts. Track A adds: a changed `baseline_id` invalidates **every** in-flight handoff, not only the feature that triggered the change.

### Conflict handling

```text
Requirement conflict (spec says A, plan says B, code suggests C)
     → do NOT silently choose C
     → detect, cite sources, explain, stop the affected task
     → resolve in the owning artifact → revalidate → resume

SPEC_CONFLICT          → STOP → Spec Kit update        → new handoff
ARCHITECTURE_CONFLICT  → STOP → plan.md or baseline    → new handoff (Track A: re-freeze)
PRODUCT_CONFLICT       → STOP → PRD revision           → re-freeze → new handoff
CONVERGENCE_GAP        → new task                      → Superpowers
FAILED_TEST            → same task → debug → re-run
FAILED_REVIEW          → same task → fix → review again
TRACK_C_ESCALATION     → abandon change unit → Track B
```

### Immutable execution snapshot

```text
.superpowers/sdd/<feature-id>/runs/<run-id>/
├── manifest.yaml          # feature, run, artifact versions, executor, status, started_at
├── spec.snapshot.md
├── plan.snapshot.md
└── tasks.snapshot.md
```

---

## 7. Handoff Validator Rules

### Common (Tracks A and B)

```text
HV001  constitution exists
HV002  spec exists
HV003  plan exists
HV004  tasks exists
HV005  spec has no blocking unresolved clarification
HV006  plan is compatible with spec
HV007  tasks reference valid requirements
HV008  no duplicate/competing execution plan
HV009  required verification commands exist and execute
HV010  TDD policy is defined
HV011  review policy is defined
HV012  convergence is enabled
HV013  artifact versions and git SHAs are captured
HV014  working tree / branch state is valid
HV015  glossary exists and covers the feature's domain terms
```

### Track A additional — baseline rules

```text
BV001  baseline-freeze.yaml exists and status = frozen
BV002  handoff.baseline.baseline_id matches the current freeze
BV003  every spec FR traces to a PRD FR-xxx
BV004  plan.md introduces no decision contradicting architecture-baseline.md
BV005  context.include references sharded PRD/architecture sections, not whole documents
```

### Track B additional — brownfield rules

```text
BF001  impact-analysis.md exists and is non-trivial
BF002  every affected contract has an owning task
BF003  regression suite exists and passes on the base branch
BF004  codebase-context.md exists and is within size budget
```

### Track C — entry criteria

```text
CV001–CV010 (Part IV §C.1) must all be true and recorded in change-record.yaml
```

The validator **fails fast** and never auto-repairs an artifact to make itself pass.

---

## 8. Execution Controller

```text
load_handoff()
      ↓
validate_handoff()              # HV + track-specific rules
      ↓
snapshot_artifacts()
      ↓
create_worktree()
      ↓
load_tasks()
      ↓
for each executable task:
        generate_task_brief()
        execute_with_superpowers()      # TDD
        run_spec_compliance_review()
        run_code_quality_review()
        verify()                        # + regression suite in Track B
        update_progress()
        commit()
        check_artifact_versions()       # staleness gate
      ↓
run_convergence()               # Tracks A and B
      ↓
if gaps: append_tasks() → back to execution
      ↓
final_verification()
      ↓
prepare_mr()
```

Track C uses the reduced controller: `validate_entry_criteria → reproduce → analyse → declare_scope → fix → verify → review → report → mr`.

---

## 9. State Machines

### Tracks A and B

```text
DRAFT → SPEC_READY → PLAN_READY → TASKS_READY → HANDOFF_VALIDATED
   → EXECUTING → TASK_REVIEW → NEXT_TASK → ALL_TASKS_DONE
   → CONVERGING ──GAP──→ TASKS_READY
                └─CLEAN─→ VERIFIED → MR_READY
```

Track A prefixes: `BASELINE_DRAFT → BASELINE_REVIEW → BASELINE_FROZEN → CONSTITUTION_READY → SKELETON_DONE → DRAFT …`

Error states:

```text
BLOCKED_PRODUCT_CONFLICT        (Track A)
BLOCKED_BASELINE_STALE          (Track A)
BLOCKED_SPEC_CONFLICT
BLOCKED_ARCHITECTURE_CONFLICT
BLOCKED_VALIDATION
FAILED_TEST
FAILED_REVIEW
FAILED_CONVERGENCE
```

### Track C

```text
INTAKE → ENTRY_CHECK ──FAIL──→ ESCALATED_TO_B  (terminal)
            │PASS
         REPRODUCED → ROOT_CAUSE_FOUND → SCOPE_DECLARED
            → FIXED → VERIFIED → REVIEWED → MR_READY
```

Error states: `NOT_REPRODUCIBLE`, `ROOT_CAUSE_NOT_FOUND`, `SCOPE_VIOLATION`, `ESCALATED_TO_B`.

---

## 10. Completion Criteria

### Tracks A and B

```text
[ ] constitution constraints satisfied
[ ] baseline constraints satisfied            (Track A)
[ ] specification satisfied
[ ] implementation plan satisfied
[ ] all tasks completed
[ ] tests pass where applicable (TDD evidence recorded)
[ ] task-level spec-compliance review passed
[ ] task-level code-quality review passed
[ ] regression suite passed                   (Track B)
[ ] final verification passed
[ ] convergence passed
[ ] no unresolved requirement/architecture conflict
[ ] no change outside declared scope
[ ] git diff reviewed
[ ] traceability chain complete
[ ] MR ready
```

### Track C

```text
[ ] entry criteria CV001–CV010 verified and recorded
[ ] defect reproduced by a test that failed first
[ ] root cause identified
[ ] fix is minimal and within declared scope
[ ] full suite + regression suite pass
[ ] code-quality review passed
[ ] change report written
[ ] MR states Track C and links the change record
```

---

## 11. Traceability

```text
TRACK A:  PRD FR-012 → spec FR-003 → plan §transaction-boundary → T005
          → task-005-brief.md → commit abc123 → cancel-order.spec.ts
          → review-005.md → MR !123

TRACK B:  request #482 → impact-analysis → spec FR-002 → plan → T003
          → task-003-brief.md → commit def456 → test → review → MR !145

TRACK C:  BUG-4821 → change-record.yaml → regression test
          → commit ghi789 → review.md → MR !151
```

Every line of production code must be reachable from one of these three chains. Code that is reachable from none of them is unrequested work and is a convergence or review finding.

---

## 12. Global Anti-Patterns

| # | Anti-pattern |
|---|---|
| 1 | Duplicate planning (BMAD stories + Spec Kit tasks, or Superpowers re-planning an approved feature) |
| 2 | An agent editing a specification because it thinks the requirement is wrong |
| 3 | Silent scope expansion ("I also refactored pricing because it was cleaner") |
| 4 | Sending the whole repository / whole PRD to every subagent |
| 5 | Treating `progress.md` as the source of truth |
| 6 | Convergence directly patching code instead of appending tasks |
| 7 | Executing against stale artifact versions |
| 8 | Choosing Track C to avoid writing a specification |
| 9 | Choosing Track A for a single feature because "the process says so" |
| 10 | A validator that auto-fixes artifacts so it can pass |
| 11 | Baseline edited by Spec Kit or Superpowers |
| 12 | Tasks whose allowed scope cannot be expressed as real directory paths |

---

## 13. Security Rules

- Secrets are never written into any persisted artifact: `handoff.yaml`, `change-record.yaml`, task briefs, reports, snapshots.
- Subagents receive the **minimum** credentials and access required.
- Task briefs describe required *capabilities*, not secret values.

```text
Bad:   OPENAI_API_KEY=sk-...
Good:  Required capability: OpenAI API access is available via the configured environment.
```

- Logs and reports must not echo credentials, tokens, or personal data.
- Anonymise everything under `docs/discovery/sample-data/`.

---

## 14. Non-Negotiable Rules

1. There is exactly **one** product requirements document (Track A).
2. There is exactly **one** architecture baseline.
3. There is exactly **one** feature specification per feature.
4. There is exactly **one** implementation plan per feature.
5. There is exactly **one** authoritative task list per feature.
6. **BMAD Phase 4 is never used.**
7. Spec Kit never modifies the product baseline.
8. Superpowers never modifies baseline, spec, plan, or existing tasks.
9. Subagents receive task-scoped context only.
10. TDD is required for applicable implementation tasks; exemptions must be explicit.
11. Every task requires specification-compliance review (Tracks A and B).
12. Every change requires code-quality review (all tracks).
13. Specification, architecture, and product conflicts STOP execution.
14. Artifact changes invalidate stale handoffs.
15. Convergence gaps become tasks, not direct code patches.
16. The chosen track is recorded, and track entry criteria are verified before work starts.
17. Tracks escalate upward only, and escalation abandons the in-flight change unit.
18. Every implementation is traceable to an owning artifact in its track.

---

# PART VI — ADOPTION

## 1. Minimal Viable Implementation

Do not automate everything at once. Build in this order:

```text
STAGE 1 — Track C (1 week)
  Lowest risk, highest frequency. Establishes: worktree isolation,
  TDD discipline, scope declaration, review, reporting.

STAGE 2 — Track B (2–3 weeks)
  Add: Spec Kit artifacts, handoff.yaml, handoff validator,
  task briefs, convergence. Run on 2–3 real features before trusting it.

STAGE 3 — Track A (when a real greenfield project starts)
  Add: BMAD phases 1–3, baseline freeze, walking skeleton,
  baseline validation rules.
```

Rationale: Track A is the most expensive to learn on and the least frequent. Teams that start there build an elaborate pipeline they have never validated on real execution.

### Build first

```text
1. Read the owning artifacts.
2. Validate them (fail fast).
3. Produce the handoff / change record.
4. Extract the change units.
5. Generate briefs.
6. Invoke Superpowers execution.
7. Capture reports.
8. Run verification.
9. Run convergence (A/B).
10. Loop on gaps.
```

### Do not build first

```text
dashboards · analytics · automatic architecture rewriting
a large orchestration engine · a custom task planner
```

The first goal is a **reliable handoff contract**, not a platform.

---

## 2. Naming Conventions

```text
Features (A/B):   .specify/specs/<NNN>-<slug>/        e.g. 001-order-cancellation
Execution (A/B):  .superpowers/sdd/<NNN>-<slug>/
Direct (C):       .superpowers/direct/<YYYY-MM-DD>-<TICKET>/
Tasks:            T001, T002, …                       zero-padded
Task artifacts:   task-001-brief.md / -report.md / -review.md
Requirements:     FR-001 (product, Track A) · FR-001 (feature, per spec) · NFR-001
Decisions:        ADR-001 (architecture) · R-001 (implementation ruling)
Runs:             runs/<YYYY-MM-DD>-<NNN>/
Baselines:        baseline_id: <YYYY-MM-DD>-<NNN>
```

---

## 3. Quick Reference

### Which track?

| Situation | Track |
|---|---|
| New product / new service, no architecture baseline | A |
| New feature on an existing system | B |
| New capability but the baseline cannot support it | A (baseline revision) then B |
| Bug fix, reproducible, no contract impact | C |
| "Small" API field addition | B |
| Config value correction | C |
| Behaviour-preserving refactor inside one module | C |
| Cross-module refactor | B |
| Dependency patch bump | C |
| Dependency major upgrade | B |
| Performance work with architectural impact | A or B depending on baseline impact |

### Per-track summary

| | Track A | Track B | Track C |
|---|---|---|---|
| Entry artifact | `docs/discovery/**` | feature request + baseline | defect ticket |
| Planning frameworks | BMAD + Spec Kit | Spec Kit | none |
| Governance artifact | `baseline-freeze.yaml` | `constitution.md` | `constitution.md` |
| Handoff artifact | `handoff.yaml` (+ baseline block) | `handoff.yaml` (+ impact + codebase context) | `change-record.yaml` |
| Unit of work | task (`T001…`) | task (`T001…`) | single change |
| Spec review | required | required | n/a |
| Code-quality review | required | required | required |
| Convergence | required | required | not required |
| Exit artifact | MR + traceability chain | MR + traceability chain | MR + change report |

### Command cheat sheet

```text
TRACK A
  *workflow-init                  → track + pinned version
  *product-brief                  → product-brief.md
  *prd                            → prd.md (+ sharded)
  *architecture                   → architecture-baseline.md (+ sharded, ADRs)
  *solutioning-gate-check         → gate report      ◄── BMAD STOPS HERE
  (human)                         → glossary, feature-map, verification, freeze
  /speckit.constitution           → constitution.md
  (feature 000)                   → walking skeleton
  /speckit.specify                → spec.md
  /speckit.clarify                → resolved spec.md
  /speckit.plan                   → plan.md
  /speckit.tasks                  → tasks.md
  /speckit.analyze                → consistency report
  (integration)                   → handoff.yaml → validate → Superpowers

TRACK B
  (human)                         → feature request in feature-map.md
  (read-only agent)               → impact-analysis.md
  /speckit.specify → clarify → plan → tasks → analyze
  (integration)                   → codebase-context.md + handoff.yaml → validate
  Superpowers                     → execute → converge → MR

TRACK C
  (controller)                    → entry criteria check
  Superpowers                     → failing test → root cause → change-record.yaml
                                  → minimal fix → verify → review → report → MR
```

BMAD command names vary by installed version and installer configuration. Pin the version in `.bmad/config.yaml` and confirm the invocation syntax for that version before automating it.

---

## 4. Implementation Goal

```text
BMAD              "Here is why we are building this, and what the system is."
        ↓
Baseline Freeze   "This is the approved product and architecture, versioned."
        ↓
Spec Kit          "Here is exactly what this feature must do."
        ↓
Handoff           "Here is the immutable contract for this execution."
        ↓
Superpowers       "Here is how the coding agent builds it safely."
        ↓
Code + Tests      "Here is the implementation evidence."
        ↓
Convergence       "Does the implementation actually satisfy the intent?"
        ↓
MR                "Ready for human review."
```

The integration succeeds when **no framework has to pretend to be another**, and when the amount of process applied to a change is proportional to the risk of that change.

```text
BMAD        = Product & Architecture Discovery layer
Spec Kit    = Specification & Governance layer
Superpowers = Engineering Execution layer
Git         = Delivery Evidence layer
```
