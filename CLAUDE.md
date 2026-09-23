# Agentic SDD — Operating Rules

This repository runs the three-track Agentic SDD protocol.
Read `docs/agentic-sdd-protocol-v2.md` before any non-trivial work.
Setup rationale lives in `docs/agentic-sdd-setup-guide.md`.
Pinned tool versions: `docs/tooling-versions.md`.

## 0. Always start by choosing a track

Before doing anything, state which track applies and why.

- **Track A (greenfield)**: no frozen baseline exists → BMAD → Spec Kit → Superpowers
- **Track B (feature)**: baseline exists AND the change touches business rules,
  contracts, schema, authz, acceptance criteria, NFRs, or adds a capability
  → Spec Kit → Superpowers
- **Track C (direct)**: reproducible defect or trivial change with none of the above
  → Superpowers only

If you cannot justify Track C against all ten CV criteria in the protocol, it is Track B.
Never downgrade a track. Escalation abandons the current change unit and restarts higher.

Use `/sdd-track <description>` when unsure. It decides only; it never starts work.

## 1. Commands that are FORBIDDEN in this repository

Verified against the versions actually installed here (BMAD v6.12.0 exposes
*skills*, not `/bmad:...:workflows:*` paths):

- `bmad-create-epics-and-stories` — Spec Kit owns the task list.
- Any BMAD implementation-phase skill: `bmad-build`, `bmad-build-auto`,
  `bmad-spec`, `bmad-sprint-planning`, `bmad-agent-dev`, `bmad-code-review`,
  `bmad-review`, `bmad-qa-generate-e2e-tests`, `bmad-retrospective`
  — Superpowers owns execution and review.
- `/speckit-implement` — Superpowers owns execution. Spec Kit stops at `tasks.md`.
- `superpowers:writing-plans` and `superpowers:brainstorming` when a validated
  `handoff.yaml` exists — `tasks.md` IS the plan. Do not create a second one.
- `superpowers:executing-plans` — it drives a *Superpowers* plan document.
  Our plan is `specs/<feature>/tasks.md`, executed by
  `superpowers:subagent-driven-development`. Using both means two executors.
- `bmad-project-context` — it writes a managed block into a root `AGENTS.md`,
  which would compete with this file. If you need it, run it on a
  `baseline/*` branch and curate the output by hand.

If you believe one of these is needed, stop and ask the human.

## 2. Superpowers behaviour in Tracks A and B

When `.sdd/<feature>/handoff.yaml` exists and validation passed:

- SKIP `superpowers:brainstorming`. The design is `specs/<feature>/spec.md`.
  Its description says "You MUST use this before any creative work" — that
  instruction is overridden here, by this file, whenever a validated handoff
  exists. State that you are skipping it and why.
- SKIP `superpowers:writing-plans` and `superpowers:executing-plans`.
  The plan is `specs/<feature>/plan.md` + `specs/<feature>/tasks.md`.
- USE `superpowers:using-git-worktrees`, `superpowers:subagent-driven-development`,
  `superpowers:test-driven-development`, `superpowers:requesting-code-review`,
  `superpowers:receiving-code-review`,
  `superpowers:verification-before-completion`,
  `superpowers:finishing-a-development-branch`,
  and `superpowers:dispatching-parallel-agents` for independent tasks.
- Each task's execution context is `.sdd/<feature>/task-<NNN>-brief.md`, not the
  whole repository and not the whole spec.

In Track C, use `superpowers:systematic-debugging`,
`superpowers:test-driven-development`, `superpowers:requesting-code-review`,
`superpowers:verification-before-completion`. Skip brainstorming and planning.

**Worktrees:** Spec Kit resolves the active feature from
`SPECIFY_FEATURE_DIRECTORY` → `SPECIFY_FEATURE` → `.specify/feature.json`
(the last is machine-local and gitignored). Inside a Superpowers worktree,
`export SPECIFY_FEATURE_DIRECTORY=specs/<feature>` before running any
`speckit-*` or `sdd_*` command, or pass `--feature <id>` explicitly.

## 3. Files you must never modify

- `docs/baseline/**` — the frozen product baseline. Human + BMAD only,
  and only on a `baseline/*` branch — **or** an agent executing a change a named
  human explicitly approved, per constitution §VII.
- `.specify/memory/constitution.md` — governance branch only; same §VII rule.
- `specs/<feature>/spec.md`, `plan.md` — Spec Kit commands only.
- `specs/<feature>/tasks.md` — Spec Kit only, except convergence-appended tasks.
- `_bmad/**`, `.specify/scripts/**`, `.specify/templates/**` — installer-managed.

If implementation conflicts with any of these, STOP and report the conflict.
Do not resolve a requirement or architecture disagreement by editing code or docs.

**Constitution §VII:** the human *decides*; the agent may *execute* a human-owned
change once a named human has approved that specific change. Execute it on the
right branch, follow its full procedure, record `approved_by: <human>` and
`executed_by: agent`, and stop to ask at any choice the human has not made.

## 4. Naming

Use the canonical terms in `docs/baseline/glossary.md`. If a needed term is not
there, stop and ask — do not invent a synonym.

## 5. Scope

Every task brief declares allowed and forbidden scope. Do not touch files outside
allowed scope, even to improve them. "While I was in there" changes are rejected
at review.

## 6. Command invocation forms in this repo

Confirmed on the installed versions — do not guess, these differ from the guide:

```text
Spec Kit (v1.0.8, HYPHEN form — not dots):
  /speckit-constitution  /speckit-specify  /speckit-clarify
  /speckit-plan  /speckit-checklist  /speckit-tasks
  /speckit-analyze  /speckit-converge
  /speckit-implement            ← FORBIDDEN here
  /speckit-taskstoissues        ← optional, unused

BMAD (v6.12.0, skills — invoke by skill name):
  Phase 1 analysis : bmad-brainstorming, bmad-deep-recon, bmad-advanced-elicitation
  Phase 1 brief    : bmad-product-brief          → docs/baseline/planning-artifacts/
  Phase 2 planning : bmad-prd, bmad-ux           → docs/baseline/planning-artifacts/
  Phase 3 solution : bmad-architecture           → docs/baseline/planning-artifacts/
  Phase 3 epics    : bmad-create-epics-and-stories  ← FORBIDDEN
  Phase 4 anything : ← FORBIDDEN (see section 1)
  Legacy recon     : bmad-walkthrough, bmad-deep-recon (one-time baseline
                     reconstruction only, then curate by hand and freeze)
  Menu of the truth: bmad-help  /  _bmad/bmm/module-help.csv

Superpowers (v6.3.0, skills — invoke by skill name):
  Execution : superpowers:using-git-worktrees
              superpowers:subagent-driven-development
              superpowers:dispatching-parallel-agents
              superpowers:test-driven-development
  Debugging : superpowers:systematic-debugging
  Review    : superpowers:requesting-code-review
              superpowers:receiving-code-review
  Closing   : superpowers:verification-before-completion
              superpowers:finishing-a-development-branch
  FORBIDDEN in Tracks A/B once a handoff is validated:
              superpowers:brainstorming
              superpowers:writing-plans
              superpowers:executing-plans

Glue:  /sdd-track  /sdd-handoff  /sdd-validate  /sdd-change
```

BMAD writes to `docs/baseline/planning-artifacts/`. The protocol expects
`docs/baseline/prd.md`, `architecture.md`, etc. A human curates and renames
BMAD output into those canonical paths during the freeze phase (protocol §A9).
Raw BMAD output is a draft; the curated file is the baseline.

## 7. Track A / B / C — the one-line runbooks

```text
A: bmad-product-brief → bmad-prd → bmad-ux → bmad-architecture
   → human curation + freeze (docs/baseline/baseline-freeze.yaml)
   → /speckit-constitution → /speckit-specify → /speckit-clarify → /speckit-plan
   → /speckit-checklist → /speckit-tasks → commit
   → /sdd-handoff <id> A → /sdd-validate <id> → Superpowers → /speckit-converge

B: intake in docs/baseline/feature-map.md → impact-analysis.md (READ ONLY)
   → /speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks
   → .sdd/<id>/codebase-context.md (≤8 KB) → commit
   → /sdd-handoff <id> B → /sdd-validate <id> → Superpowers → /speckit-converge

C: /sdd-track → /sdd-change → fill change-record.yaml → failing test
   → root cause → minimal fix → verify → review → report
```
