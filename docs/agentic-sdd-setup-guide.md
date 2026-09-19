# Setup Guide — Agentic SDD Protocol v2
## Installing and wiring BMAD + Spec Kit + Superpowers into the three-track process

**Companion to:** `agentic-sdd-protocol-v2.md` (the *what*). This document is the *how*.
**Audience:** the engineer who sets up the toolchain and the tech lead who owns the process.
**Verified against:** Spec Kit docs (github.github.com/spec-kit), BMAD Method v6 docs (docs.bmad-method.org), Superpowers (github.com/obra/superpowers) as of this writing. All three move fast — Part 0.3 tells you how to pin.

---

# PART 0 — BEFORE YOU START

## 0.1 Prerequisites

| Requirement | Needed by | Check |
|---|---|---|
| Node.js ≥ 20.12 | BMAD installer | `node -v` |
| Python ≥ 3.10 | Spec Kit CLI, glue scripts | `python3 -V` |
| `uv` | Spec Kit install method | `uv --version` |
| Git ≥ 2.20 | Superpowers worktrees | `git --version` |
| A supported coding agent | all three | Claude Code, Codex, Cursor, Copilot CLI, Gemini CLI… |
| PyYAML | glue scripts | `pip install pyyaml` |

This guide uses **Claude Code** as the agent. Every step has an equivalent for the other harnesses; only the plugin-install syntax differs.

---

## 0.2 The single most important thing to understand first

**These three tools do not know each other exists.**

- BMAD will happily generate epics *and stories* and then offer to implement them.
- Spec Kit ships its own `/speckit.implement` that executes `tasks.md` directly.
- Superpowers auto-triggers `brainstorming` and `writing-plans` the moment it sees you building something.

Left at defaults, you get **three planners and two executors** fighting over the same repository. The protocol's value comes almost entirely from *turning things off*. Roughly 70% of the setup work in this guide is suppression and glue, not installation.

The three commands you must never run in Tracks A and B:

```text
/bmad:bmm:workflows:create-epics-and-stories   → produces a competing task list
/speckit.implement                              → competing executor (Superpowers owns execution)
/superpowers:write-plan                         → competing plan (tasks.md is the plan)
```

---

## 0.3 Pin everything, on day one

Create `docs/tooling-versions.md` and commit it before installing anything else:

```markdown
# Toolchain Versions — Agentic SDD

| Tool | Channel | Version | Pinned on | Upgrade owner |
|---|---|---|---|---|
| specify-cli   | pinned release | vX.Y.Z | 2026-09-17 | <name> |
| BMAD (bmm)    | stable         | vX.Y.Z | 2026-09-17 | <name> |
| Superpowers   | marketplace    | vX.Y.Z | 2026-09-17 | <name> |
| Coding agent  | —              | vX.Y.Z | 2026-09-17 | <name> |

Upgrade policy: one tool at a time, on a branch, validated against the
pilot feature before adoption. Never upgrade mid-feature.
```

Rationale: an artifact-format change in any of the three silently breaks your handoff generator and validator. You want to know exactly which version produced a given baseline.

---

# PART 1 — INSTALL THE THREE FRAMEWORKS

## 1.1 Superpowers (execution layer)

Install once per coding agent you use — it does not carry across harnesses.

```text
# Claude Code — official marketplace
/plugin install superpowers@claude-plugins-official

# or the Superpowers marketplace
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Other harnesses:

```bash
# Codex CLI:        /plugins  → search "superpowers" → Install
# Cursor:           /add-plugin superpowers
# Copilot CLI:      copilot plugin marketplace add obra/superpowers-marketplace
#                   copilot plugin install superpowers@superpowers-marketplace
# Gemini CLI:       gemini extensions install https://github.com/obra/superpowers
# Devin CLI:        devin plugins install obra/superpowers
```

**Verify:** run `/help` and confirm the Superpowers commands appear (`/superpowers:brainstorm`, `/superpowers:write-plan`, `/superpowers:execute-plan`).

**Skills you will use:** `using-git-worktrees`, `subagent-driven-development`, `test-driven-development`, `requesting-code-review`, `verification-before-completion`, `systematic-debugging`, `finishing-a-development-branch`.

**Skills you will suppress in Tracks A/B:** `brainstorming`, `writing-plans`, `executing-plans` (Part 3.1 shows how).

---

## 1.2 Spec Kit (specification + governance layer)

```bash
# install the CLI (pin to a release tag for reproducibility)
uv tool install specify-cli

# greenfield: create the project
specify init <project-name> --integration claude --script sh

# brownfield: initialize in place, on a review branch
git checkout -b chore/adopt-spec-kit
specify init --here --force --integration claude --script sh
```

`--force` is required in a non-empty directory and may replace files at managed paths — that is why you do it on a branch and review the diff.

### What `specify init` actually creates

```text
.specify/
├── memory/
│   └── constitution.md
├── scripts/            # bash|powershell|python automation
├── templates/
└── feature.json        # ← the ACTIVE FEATURE pointer
specs/
└── <NNN-feature>/      # ← feature artifacts live HERE, at repo root
.claude/
└── skills/             # the speckit skills for Claude Code
```

Three things to note, because they differ from the protocol document's idealised layout:

1. **Feature artifacts live in `specs/` at the repository root**, not `.specify/specs/`. Protocol v2 uses `.specify/specs/` for readability; the real tool uses `specs/`. Use the real path — do not fight the tool. Update your mental mapping: everywhere protocol v2 says `.specify/specs/<feature-id>/`, read `specs/<feature-id>/`.
2. **The active feature is tracked in `.specify/feature.json`**, not by the git branch. You can override it per-shell with `SPECIFY_FEATURE_DIRECTORY`. This matters enormously once Superpowers starts creating git worktrees — see Part 9.2.
3. **Command invocation differs by agent.** Docs show `/speckit.specify`; some skills-based integrations (including Claude in recent versions) expose them as `/speckit-specify`. Check with `/help` after install and write the correct form into your `CLAUDE.md`.

**Verify:**

```bash
specify version
ls .specify/memory/constitution.md
ls .claude/skills/ | grep speckit
```

### Optional extensions worth knowing about

```bash
specify extension add git       # adds numbered feature branches (001-xxx)
```

Add the `git` extension only if you want Spec Kit managing branches. If Superpowers is creating worktrees and branches, having two branch managers is one too many — most teams should skip it and let Superpowers own branching.

---

## 1.3 BMAD Method (product + architecture layer, Track A only)

Install **only in repositories that will run Track A**. Do not install it in a brownfield repo that only runs Tracks B and C — an installed tool is an invitation to use it.

```bash
# interactive
npx bmad-method install

# non-interactive / CI-reproducible — the recommended form
npx bmad-method install --yes \
  --directory /path/to/project \
  --modules bmm \
  --tools claude-code \
  --set core.output_folder=docs/baseline
```

Notes on the flags:

- `--modules bmm` — BMad Method Module only. Skip `bmb` (agent builder) and `cis` (brainstorming suite) for a first setup; they add surface area you will not use. Add `tea` (Test Architect) later if you want risk-based test strategy feeding your `verification.md`.
- `--tools claude-code` — installs BMAD's skills into the agent's skill directory.
- `--set core.output_folder=docs/baseline` — **do this**. By default BMAD merges planning artifacts into `docs/`; pointing it at a dedicated folder keeps the baseline separable and makes the "who may write here" rule enforceable by CI.
- Prerelease: `npx bmad-method@next install`. Do not use this on a real project.

### What BMAD creates

```text
_bmad/
├── _config/
│   ├── manifest.yaml          # installed modules + channel + version + sha
│   ├── workflow-manifest.csv
│   └── bmad-help.csv
└── bmm/
    ├── config.yaml
    ├── module-help.csv
    └── workflows/
docs/baseline/                  # your configured output folder
```

**Verify:**

```bash
cat _bmad/_config/manifest.yaml     # record the version in tooling-versions.md
```

In the agent, `bmad-help` tells you what to run next for your installed version — use it to confirm the exact workflow command names, which have changed between v6 releases.

### The BMAD workflows you will use (Track A)

| Phase | Workflow | Command (v6.x) | Agent |
|---|---|---|---|
| 1 Analysis (optional) | Brainstorm | `/bmad:core:workflows:brainstorming` | analyst |
| 1 Analysis (optional) | Domain research | `/bmad:bmm:workflows:research` | analyst |
| 1 Analysis | Product brief | `/bmad:bmm:workflows:create-product-brief` | analyst |
| 2 Planning | **PRD** | `/bmad:bmm:workflows:create-prd` | pm |
| 2 Planning | UX design (if UI) | `/bmad:bmm:workflows:create-ux-design` | ux-designer |
| 3 Solutioning | **Architecture** | `/bmad:bmm:workflows:create-architecture` | architect |
| 3 Solutioning | ~~Epics & stories~~ | ~~`create-epics-and-stories`~~ | **DO NOT RUN** |
| 4 Implementation | ~~everything~~ | — | **DO NOT RUN** |

Command naming has changed across v6 releases (older builds used `*workflow-init`, `*prd`, `*architecture`). Confirm against `_bmad/_config/workflow-manifest.csv` in *your* install and write the confirmed names into `CLAUDE.md`.

### Two BMAD workflows that are genuinely useful outside Track A

For a **legacy brownfield repo with no baseline** (protocol v2 §B.6), these two are the cheapest way to reconstruct one:

```text
/bmad:bmm:workflows:document-project          # analyse an existing project → documentation
/bmad:bmm:workflows:generate-project-context  # lean, LLM-optimised project-context.md
                                              # with implementation rules and conventions
```

Run them once, curate the output by hand into `architecture-baseline.md` and `glossary.md`, freeze, then uninstall or leave BMAD dormant. This is a one-time reconstruction, not an ongoing BMAD adoption.

---

## 1.4 Installation verification checklist

```bash
# 1. all three present
specify version
cat _bmad/_config/manifest.yaml | head -20      # Track A repos only
# in agent: /help  → speckit.* and superpowers:* commands both visible

# 2. spec kit scaffolding intact
test -f .specify/memory/constitution.md && echo OK
test -f .specify/feature.json && echo OK

# 3. worktrees usable (Superpowers depends on this)
git worktree list

# 4. versions recorded
grep -c "vX.Y.Z" docs/tooling-versions.md    # should be 0 — you replaced the placeholders
```

---

# PART 2 — RECONCILE CONVENTIONS WITH THE PROTOCOL

## 2.1 Path mapping — protocol name → real path

Protocol v2 was written with idealised paths. This table is authoritative for the actual repository. Use it when you write the glue scripts.

| Protocol v2 says | Real path | Owner |
|---|---|---|
| `.specify/specs/<id>/spec.md` | `specs/<id>/spec.md` | Spec Kit |
| `.specify/specs/<id>/plan.md` | `specs/<id>/plan.md` | Spec Kit |
| `.specify/specs/<id>/tasks.md` | `specs/<id>/tasks.md` | Spec Kit |
| `.specify/specs/<id>/impact-analysis.md` | `specs/<id>/impact-analysis.md` | you (Track B) |
| `.specify/memory/constitution.md` | `.specify/memory/constitution.md` | Spec Kit |
| `.specify/memory/prd.md` | `docs/baseline/prd.md` | BMAD + human |
| `.specify/memory/architecture-baseline.md` | `docs/baseline/architecture.md` | BMAD + human |
| `.specify/memory/product-brief.md` | `docs/baseline/product-brief.md` | BMAD + human |
| `.specify/memory/ux-spec.md` | `docs/baseline/ux-spec.md` | BMAD + human |
| `.specify/memory/glossary.md` | `docs/baseline/glossary.md` | **human only** |
| `.specify/memory/feature-map.md` | `docs/baseline/feature-map.md` | **human only** |
| `.specify/memory/verification.md` | `docs/baseline/verification.md` | **human only** |
| `.specify/memory/adr/` | `docs/baseline/adr/` | human + BMAD |
| `.specify/memory/baseline-freeze.yaml` | `docs/baseline/baseline-freeze.yaml` | glue script |
| `.superpowers/sdd/<id>/**` | `.sdd/<id>/**` | glue + Superpowers |
| `.superpowers/direct/<id>/**` | `.sdd/direct/<id>/**` | glue + Superpowers |

I use `.sdd/` rather than `.superpowers/` because that directory is yours, not the plugin's — Superpowers does not read or write it. Naming it after a plugin invites confusion about ownership.

---

## 2.2 Canonical repository layout

```text
repository/
│
├── docs/
│   ├── tooling-versions.md
│   ├── discovery/                  # Track A raw input (human)
│   │   ├── interviews/
│   │   ├── as-is-process/
│   │   ├── sample-data/            # anonymised
│   │   ├── external-contracts/
│   │   └── compliance/
│   └── baseline/                   # ◄── PRODUCT BASELINE — protected
│       ├── product-brief.md
│       ├── prd.md
│       ├── prd/                    # sharded
│       ├── architecture.md
│       ├── architecture/           # sharded
│       │   ├── tech-stack.md
│       │   ├── source-tree.md
│       │   ├── coding-standards.md
│       │   ├── data-model.md
│       │   └── integration-contracts.md
│       ├── ux-spec.md
│       ├── glossary.md
│       ├── feature-map.md
│       ├── verification.md
│       ├── adr/
│       └── baseline-freeze.yaml
│
├── .specify/
│   ├── memory/constitution.md
│   ├── templates/
│   ├── scripts/
│   └── feature.json
│
├── specs/
│   ├── 000-walking-skeleton/
│   └── 001-<slug>/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       ├── impact-analysis.md      # Track B
│       └── checklists/
│
├── .sdd/                           # ◄── the glue layer's artifacts
│   ├── 001-<slug>/
│   │   ├── handoff.yaml
│   │   ├── codebase-context.md     # Track B
│   │   ├── progress.md
│   │   ├── rulings.md
│   │   ├── task-001-brief.md
│   │   ├── task-001-report.md
│   │   ├── task-001-review.md
│   │   └── runs/<run-id>/
│   └── direct/
│       └── 2026-09-17-BUG-4821/
│           ├── change-record.yaml
│           ├── analysis.md
│           ├── report.md
│           └── review.md
│
├── _bmad/                          # Track A repos only
├── scripts/sdd/                    # ◄── the glue scripts (Part 3)
│   ├── sdd_handoff.py
│   ├── sdd_validate.py
│   ├── sdd_change.py
│   └── sdd_lib.py
│
├── .claude/
│   ├── skills/                     # speckit + bmad skills (generated)
│   └── commands/                   # ◄── your custom slash commands (Part 3.2)
│
├── CLAUDE.md                       # ◄── the traffic controller (Part 3.1)
├── src/
└── tests/
```

### What goes in `.gitignore`

```gitignore
# BMAD scratch — regenerate, never review
_bmad/**/cache/
.bmad-output/

# execution snapshots are large; keep only manifests
.sdd/*/runs/*/*.snapshot.md
```

Everything else — baseline, specs, handoffs, briefs, reports, reviews, change records — **is committed**. The audit trail is the point.

---

## 2.3 Directory permissions, enforced

Protocol v2 has an artifact ownership matrix. A matrix in a document is a suggestion; a CI check is a rule. Part 7 gives the CI job. The minimum ruleset:

| Path | May be modified on a feature branch? | By whom |
|---|---|---|
| `docs/baseline/**` | **NO** | only on a `baseline/*` branch, by a human |
| `.specify/memory/constitution.md` | NO | only on a `governance/*` branch |
| `specs/<active-feature>/**` | YES | Spec Kit commands |
| `specs/<other-feature>/**` | NO | — |
| `.sdd/<active-feature>/**` | YES | glue + Superpowers |
| `src/**`, `tests/**` | YES, within task scope | Superpowers |

---

## 2.4 Configure BMAD's output location (Track A)

If you did not pass `--set core.output_folder=docs/baseline` at install time:

```bash
npx bmad-method install --yes --action update --set core.output_folder=docs/baseline
# or edit _bmad/bmm/config.yaml directly, then re-run quick-update
```

Then confirm where BMAD actually writes by checking `output-location` in `_bmad/bmm/module-help.csv` for each workflow you plan to run (`planning_artifacts`, `project-knowledge`, and `output_folder` are distinct destinations).

---

# PART 3 — BUILD THE GLUE

None of the three frameworks knows about the others, so five small pieces of glue carry the protocol. Budget **2–3 days** for this part. It is the only custom code in the whole setup, and it is deliberately small.

| # | Artifact | Purpose |
|---|---|---|
| 3.1 | `CLAUDE.md` | traffic controller — track selection and command suppression |
| 3.2 | `.claude/commands/sdd-*.md` | slash commands that wrap the glue scripts |
| 3.3 | `scripts/sdd/sdd_handoff.py` | generate `handoff.yaml` from real artifacts + git SHAs |
| 3.4 | `scripts/sdd/sdd_validate.py` | the handoff validator (HV / BV / BF / CV rules) |
| 3.5 | `scripts/sdd/sdd_change.py` | Track C `change-record.yaml` generator |

---

## 3.1 `CLAUDE.md` — the traffic controller

This is the highest-leverage file in the entire setup. It is what stops the three frameworks from colliding. Put it at the repository root (`AGENTS.md` for harnesses that read that instead; symlink one to the other).

````markdown
# Agentic SDD — Operating Rules

This repository runs the three-track Agentic SDD protocol.
Read `docs/agentic-sdd-protocol-v2.md` before any non-trivial work.

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

## 1. Commands that are FORBIDDEN in this repository

- `/bmad:bmm:workflows:create-epics-and-stories` — Spec Kit owns the task list.
- Any BMAD Phase 4 workflow (story creation, dev agent, QA agent) — Superpowers owns execution.
- `/bmad:bmm:workflows:*quick-spec*` and `*quick-dev*` — Track C is Superpowers-only.
- `/speckit.implement` — Superpowers owns execution. Spec Kit stops at `tasks.md`.
- `/superpowers:write-plan` and `/superpowers:brainstorm` when a validated
  `handoff.yaml` exists — `tasks.md` IS the plan. Do not create a second one.

If you believe one of these is needed, stop and ask the human.

## 2. Superpowers behaviour in Tracks A and B

When `.sdd/<feature>/handoff.yaml` exists and validation passed:

- SKIP the `brainstorming` skill. The design is `specs/<feature>/spec.md`.
- SKIP the `writing-plans` skill. The plan is `specs/<feature>/plan.md` +
  `specs/<feature>/tasks.md`.
- USE `using-git-worktrees`, `subagent-driven-development`,
  `test-driven-development`, `requesting-code-review`,
  `verification-before-completion`, `finishing-a-development-branch`.
- Each task's execution context is `.sdd/<feature>/task-<NNN>-brief.md`, not the
  whole repository and not the whole spec.

In Track C, use `systematic-debugging`, `test-driven-development`,
`requesting-code-review`, `verification-before-completion`. Skip brainstorming
and planning.

## 3. Files you must never modify

- `docs/baseline/**` — the frozen product baseline. Human + BMAD only,
  and only on a `baseline/*` branch.
- `.specify/memory/constitution.md` — governance branch only.
- `specs/<feature>/spec.md`, `plan.md` — Spec Kit commands only.
- `specs/<feature>/tasks.md` — Spec Kit only, except convergence-appended tasks.

If implementation conflicts with any of these, STOP and report the conflict.
Do not resolve a requirement or architecture disagreement by editing code or docs.

## 4. Naming

Use the canonical terms in `docs/baseline/glossary.md`. If a needed term is not
there, stop and ask — do not invent a synonym.

## 5. Scope

Every task brief declares allowed and forbidden scope. Do not touch files outside
allowed scope, even to improve them. "While I was in there" changes are rejected
at review.

## 6. Command invocation forms in this repo

Spec Kit:   /speckit.constitution  /speckit.specify  /speckit.clarify
            /speckit.plan  /speckit.checklist  /speckit.tasks
            /speckit.analyze  /speckit.converge
            (confirm the exact separator with /help — some integrations use /speckit-*)
BMAD:       see docs/tooling-versions.md for the confirmed workflow command names
Glue:       /sdd-track  /sdd-handoff  /sdd-validate  /sdd-change
````

Two deliberate choices here worth understanding:

- **`/speckit.converge` stays allowed.** It is Spec Kit's convergence step and maps exactly onto protocol v2 §A18/§B11. Keep it; it is one of the most valuable commands in the toolchain.
- **`/speckit.checklist` stays allowed.** It generates requirements-quality checklists before task breakdown — cheap and useful. Note that `/speckit.implement` reads checklist state as a gate; since you never run `implement`, that coupling is irrelevant to you.

---

## 3.2 Custom slash commands

Claude Code reads `.claude/commands/*.md`. Create four thin wrappers so the process is one keystroke rather than a remembered incantation.

**`.claude/commands/sdd-track.md`**

````markdown
---
description: Decide which SDD track applies to the requested work
---

Determine the correct track for: $ARGUMENTS

1. Check whether `docs/baseline/baseline-freeze.yaml` exists with status `frozen`.
2. Walk the Track C entry criteria CV001–CV010 from
   `docs/agentic-sdd-protocol-v2.md` explicitly, one by one, answering each
   true/false with a one-line reason.
3. Recommend a track and state the first command to run.
4. Do NOT start any work. This command only decides.
````

**`.claude/commands/sdd-handoff.md`**

````markdown
---
description: Generate the handoff contract for the active feature
---

Run: `python3 scripts/sdd/sdd_handoff.py --feature $ARGUMENTS`

Then show me the generated `.sdd/<feature>/handoff.yaml` and stop.
Do not begin execution until `/sdd-validate` passes.
````

**`.claude/commands/sdd-validate.md`**

````markdown
---
description: Validate the handoff contract before execution
---

Run: `python3 scripts/sdd/sdd_validate.py --feature $ARGUMENTS`

If it exits non-zero, report every failed rule and STOP.
Do not start Superpowers execution. Do not attempt to fix artifacts to make
the validator pass — fix the underlying problem in the owning artifact, or
return the feature to the owning phase.
````

**`.claude/commands/sdd-change.md`**

````markdown
---
description: Start a Track C direct change
---

For the defect described in: $ARGUMENTS

1. Walk CV001–CV010 explicitly. If any is false, STOP and tell me it is Track B.
2. Run `python3 scripts/sdd/sdd_change.py --ticket <ID> --type <bugfix|config|docs|dependency-patch|internal-refactor>`
3. Fill in the generated `change-record.yaml`: defect, root cause (leave blank
   until found), allowed/forbidden scope.
4. Then, and only then, write the failing regression test.
````

---

## 3.3 `scripts/sdd/sdd_lib.py` — shared helpers

```python
"""Shared helpers for the Agentic SDD glue scripts."""
from __future__ import annotations
import json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BASELINE = ROOT / "docs" / "baseline"
SPECS = ROOT / "specs"
SDD = ROOT / ".sdd"
CONSTITUTION = ROOT / ".specify" / "memory" / "constitution.md"
FEATURE_JSON = ROOT / ".specify" / "feature.json"


def git_sha(path: Path) -> str | None:
    """Last commit SHA that touched `path`. None if untracked/uncommitted."""
    rel = path.relative_to(ROOT)
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%H", "--", str(rel)],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out or None
    except subprocess.CalledProcessError:
        return None


def working_tree_clean() -> bool:
    out = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                         capture_output=True, text=True).stdout
    return out.strip() == ""


def active_feature() -> str | None:
    """Spec Kit tracks the active feature in .specify/feature.json."""
    if not FEATURE_JSON.exists():
        return None
    data = json.loads(FEATURE_JSON.read_text())
    d = data.get("feature_directory") or data.get("featureDirectory") or ""
    return Path(d).name or None


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def find_ids(text: str, prefix: str) -> set[str]:
    """Extract requirement-style IDs, e.g. FR-001, NFR-012, AC-003, T005."""
    return set(re.findall(rf"\b{prefix}-?\d{{2,4}}\b", text))


def has_unresolved_clarifications(text: str) -> bool:
    return "[NEEDS CLARIFICATION" in text.upper()
```

---

## 3.4 `scripts/sdd/sdd_handoff.py` — handoff generator

```python
#!/usr/bin/env python3
"""Generate .sdd/<feature>/handoff.yaml from the real artifacts on disk."""
from __future__ import annotations
import argparse, datetime
from pathlib import Path
import yaml

from sdd_lib import (ROOT, BASELINE, SPECS, SDD, CONSTITUTION,
                     git_sha, active_feature, read)


def ref(path: Path) -> dict | None:
    if not path.exists():
        return None
    return {"path": str(path.relative_to(ROOT)), "git_sha": git_sha(path)}


def build(feature: str, track: str) -> dict:
    fdir = SPECS / feature
    if not fdir.exists():
        raise SystemExit(f"feature directory not found: {fdir}")

    verification = read(BASELINE / "verification.md")

    h: dict = {
        "feature_id": feature,
        "track": track,
        "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "constitution": ref(CONSTITUTION),
        "spec": ref(fdir / "spec.md"),
        "plan": ref(fdir / "plan.md"),
        "tasks": ref(fdir / "tasks.md"),
        "execution": {"engine": "superpowers",
                      "mode": "subagent-driven-development"},
        "policy": {
            "allow_replan": False,
            "allow_spec_change": False,
            "allow_architecture_change": False,
            "require_tdd": True,
            "require_task_review": True,
            "require_code_quality_review": True,
            "require_final_verification": True,
            "require_convergence": True,
        },
        "verification": {
            "source": "docs/baseline/verification.md",
            "commands": parse_verification(verification),
        },
        "context": {
            "include": ["constitution", "glossary", "feature_spec",
                        "implementation_plan", "current_task",
                        "relevant_dependencies"],
            "exclude": ["full_prd", "full_architecture_document",
                        "unrelated_tasks", "unrelated_features",
                        "full_chat_history", "unrelated_repository_context"],
        },
    }

    if track == "A":
        freeze_path = BASELINE / "baseline-freeze.yaml"
        freeze = yaml.safe_load(read(freeze_path) or "{}") or {}
        h["baseline"] = {
            "baseline_id": freeze.get("baseline_id"),
            "prd": ref(BASELINE / "prd.md"),
            "architecture": ref(BASELINE / "architecture.md"),
            "glossary": ref(BASELINE / "glossary.md"),
        }
        h["policy"]["allow_baseline_change"] = False
        h["context"]["include"] += ["referenced_prd_sections",
                                    "referenced_architecture_sections"]

    if track == "B":
        h["baseline"] = {
            "architecture": ref(BASELINE / "architecture.md"),
            "glossary": ref(BASELINE / "glossary.md"),
            "prd": ref(BASELINE / "prd.md"),   # may be None on legacy systems
        }
        h["impact_analysis"] = ref(fdir / "impact-analysis.md")
        h["codebase_context"] = {
            "path": f".sdd/{feature}/codebase-context.md"}
        h["policy"]["require_characterization_tests"] = True
        h["policy"]["require_regression_suite"] = True
        h["context"]["include"] += ["codebase_context",
                                    "impact_analysis_relevant_sections"]
        h["context"]["exclude"] += ["full_repository", "unrelated_modules"]

    return h


def parse_verification(text: str) -> dict:
    """Read 'key: command' lines out of the fenced commands block."""
    fence = "`" * 3
    cmds, inside = {}, False
    for line in text.splitlines():
        if line.strip().startswith(fence + "commands"):
            inside = True
            continue
        if inside and line.strip().startswith(fence):
            break
        if inside and ":" in line:
            k, v = line.split(":", 1)
            cmds[k.strip()] = v.strip()
    return cmds


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--feature", default=None)
    p.add_argument("--track", choices=["A", "B"], required=True)
    a = p.parse_args()

    feature = a.feature or active_feature()
    if not feature:
        raise SystemExit("no feature given and .specify/feature.json is empty")

    out_dir = SDD / feature
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "handoff.yaml"
    out.write_text(yaml.safe_dump(build(feature, a.track), sort_keys=False),
                   encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
```

`verification.md` must contain a block the parser can read:

````markdown
# Verification Contract

```commands
test: npm test
integration: npm run test:integration
regression: npm run test:regression
lint: npm run lint
build: npm run build
```

Coverage threshold: 80% lines on changed files.
Prerequisites: Docker running for integration tests.
````

---

## 3.5 `scripts/sdd/sdd_validate.py` — the handoff validator

```python
#!/usr/bin/env python3
"""Validate a handoff contract. Exit 0 = PASS, 1 = BLOCKED."""
from __future__ import annotations
import argparse, shutil, subprocess, sys
from pathlib import Path
import yaml

from sdd_lib import (ROOT, BASELINE, SPECS, SDD, CONSTITUTION,
                     git_sha, working_tree_clean, read,
                     find_ids, has_unresolved_clarifications)

CODEBASE_CONTEXT_MAX_BYTES = 8_000   # ~one page


class Result:
    def __init__(self) -> None:
        self.failures: list[tuple[str, str]] = []
        self.warnings: list[tuple[str, str]] = []

    def check(self, rule: str, ok: bool, msg: str) -> None:
        if not ok:
            self.failures.append((rule, msg))

    def warn(self, rule: str, ok: bool, msg: str) -> None:
        if not ok:
            self.warnings.append((rule, msg))


def artifact(h: dict, key: str) -> Path | None:
    node = h.get(key) or {}
    return ROOT / node["path"] if node.get("path") else None


def validate(feature: str) -> Result:
    r = Result()
    hp = SDD / feature / "handoff.yaml"
    if not hp.exists():
        r.check("HV000", False, f"handoff not found: {hp}")
        return r
    h = yaml.safe_load(hp.read_text())
    track = h.get("track")
    fdir = SPECS / feature

    spec_txt = read(fdir / "spec.md")
    plan_txt = read(fdir / "plan.md")
    tasks_txt = read(fdir / "tasks.md")

    # ---------- common rules ----------
    r.check("HV001", CONSTITUTION.exists(), "constitution.md missing")
    r.check("HV002", bool(spec_txt), "spec.md missing or empty")
    r.check("HV003", bool(plan_txt), "plan.md missing or empty")
    r.check("HV004", bool(tasks_txt), "tasks.md missing or empty")
    r.check("HV005", not has_unresolved_clarifications(spec_txt),
            "spec.md still contains [NEEDS CLARIFICATION]")

    spec_frs = find_ids(spec_txt, "FR")
    r.check("HV006", bool(spec_frs) and any(f in plan_txt for f in spec_frs),
            "plan.md references no requirement ID from spec.md")
    r.check("HV007", bool(spec_frs) and any(f in tasks_txt for f in spec_frs),
            "tasks.md references no requirement ID from spec.md")

    acs = find_ids(spec_txt, "AC")
    uncovered = sorted(a for a in acs if a not in tasks_txt)
    r.warn("HV007b", not uncovered,
           f"acceptance criteria with no owning task: {', '.join(uncovered)}")

    r.check("HV008", not (SDD / feature / "plan.md").exists(),
            "a competing plan exists under .sdd/ — tasks.md is the only plan")

    cmds = (h.get("verification") or {}).get("commands") or {}
    r.check("HV009", bool(cmds.get("test")) and bool(cmds.get("lint")),
            "verification commands missing (need at least test + lint)")
    for name, cmd in cmds.items():
        exe = cmd.split()[0] if cmd else ""
        r.warn("HV009b", bool(exe) and shutil.which(exe) is not None,
               f"verification command '{name}' → '{exe}' not on PATH")

    pol = h.get("policy") or {}
    r.check("HV010", "require_tdd" in pol, "TDD policy not defined")
    r.check("HV011", pol.get("require_task_review") is not None
            and pol.get("require_code_quality_review") is not None,
            "review policy not defined")
    r.check("HV012", pol.get("require_convergence") is True,
            "convergence is not enabled")

    for key in ("spec", "plan", "tasks"):
        node = h.get(key) or {}
        r.check("HV013", bool(node.get("git_sha")),
                f"{key}: git_sha not captured (commit the artifact first)")
        p = artifact(h, key)
        if p and node.get("git_sha"):
            r.check("HV013b", git_sha(p) == node["git_sha"],
                    f"{key} changed since the handoff was generated — STALE")

    r.check("HV014", working_tree_clean(),
            "working tree is dirty — commit or stash before execution")

    glossary = BASELINE / "glossary.md"
    r.check("HV015", glossary.exists() and len(read(glossary)) > 500,
            "glossary.md missing or too thin")

    # ---------- Track A ----------
    if track == "A":
        freeze_p = BASELINE / "baseline-freeze.yaml"
        freeze = yaml.safe_load(read(freeze_p) or "{}") or {}
        r.check("BV001", freeze.get("status") == "frozen",
                "baseline-freeze.yaml missing or not frozen")
        r.check("BV002",
                (h.get("baseline") or {}).get("baseline_id") == freeze.get("baseline_id"),
                "handoff baseline_id does not match the current freeze — STALE")

        prd_txt = read(BASELINE / "prd.md") + "".join(
            read(p) for p in (BASELINE / "prd").glob("*.md"))
        prd_frs = find_ids(prd_txt, "FR")
        untraced = sorted(f for f in spec_frs if f not in prd_frs)
        r.check("BV003", not untraced,
                f"spec FRs with no PRD origin: {', '.join(untraced)}")

        r.warn("BV004", "architecture" in plan_txt.lower()
               or "ADR" in plan_txt,
               "plan.md cites no architecture decision — verify it follows the baseline")

        inc = (h.get("context") or {}).get("include") or []
        r.check("BV005", "full_prd" not in inc and "prd" not in inc,
                "context.include pulls the whole PRD — use sharded sections")

    # ---------- Track B ----------
    if track == "B":
        ia = fdir / "impact-analysis.md"
        r.check("BF001", ia.exists() and len(read(ia)) > 800,
                "impact-analysis.md missing or trivial")
        ia_txt = read(ia)
        r.warn("BF002", "## Affected contracts" in ia_txt,
               "impact analysis has no 'Affected contracts' section")
        reg = ((h.get("verification") or {}).get("commands") or {}).get("regression")
        r.check("BF003", bool(reg), "no regression command defined")
        cc = ROOT / (h.get("codebase_context") or {}).get("path", "")
        r.check("BF004", cc.exists() and cc.stat().st_size <= CODEBASE_CONTEXT_MAX_BYTES,
                f"codebase-context.md missing or larger than "
                f"{CODEBASE_CONTEXT_MAX_BYTES} bytes")

    return r


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--feature", required=True)
    a = p.parse_args()
    r = validate(a.feature)

    for rule, msg in r.warnings:
        print(f"WARN  {rule}  {msg}")
    for rule, msg in r.failures:
        print(f"FAIL  {rule}  {msg}")

    if r.failures:
        print("\nBLOCKED — DO NOT START SUPERPOWERS.")
        print("Fix the owning artifact and regenerate the handoff.")
        sys.exit(1)
    print("\nPASS — handoff validated. Superpowers execution may begin.")


if __name__ == "__main__":
    main()
```

**Design notes that matter more than the code:**

- The validator **never repairs anything**. The moment it starts auto-fixing artifacts so it can pass, it stops being a gate. Protocol v2 anti-pattern #10.
- `HV013b` (staleness) is the rule that earns its keep. It catches the case where someone edits `spec.md` while execution is running — the failure mode that produces code nobody can explain.
- Warnings vs failures: warnings inform, failures block. Resist the urge to demote a failing rule to a warning because it is inconvenient this week.

---

## 3.6 `scripts/sdd/sdd_change.py` — Track C change record

```python
#!/usr/bin/env python3
"""Scaffold .sdd/direct/<change-id>/change-record.yaml for a Track C change."""
from __future__ import annotations
import argparse, datetime
from pathlib import Path
import yaml

from sdd_lib import ROOT, SDD, BASELINE, CONSTITUTION, git_sha, read

CV = ["CV001_defect_against_documented_behaviour",
      "CV002_no_business_rule_change",
      "CV003_no_contract_change",
      "CV004_no_schema_change",
      "CV005_no_authz_change",
      "CV006_no_acceptance_criteria_change",
      "CV007_no_nfr_impact",
      "CV008_no_new_dependency",
      "CV009_reproducible_by_test",
      "CV010_single_module_scope"]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ticket", required=True)
    p.add_argument("--type", default="bugfix",
                   choices=["bugfix", "config", "docs",
                            "dependency-patch", "internal-refactor"])
    a = p.parse_args()

    today = datetime.date.today().isoformat()
    change_id = f"{today}-{a.ticket}"
    d = SDD / "direct" / change_id
    d.mkdir(parents=True, exist_ok=True)

    record = {
        "change_id": change_id,
        "track": "C",
        "type": a.type,
        "ticket": a.ticket,
        "severity": "TODO",
        "created_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "constitution": {"path": ".specify/memory/constitution.md",
                         "git_sha": git_sha(CONSTITUTION)},
        "defect": {"observed": "TODO", "expected": "TODO",
                   "documented_behaviour_ref": "TODO",
                   "reproduction": "TODO: path to the failing test"},
        "entry_criteria": {k: "TODO" for k in CV},
        "root_cause": "TODO — must be filled before the fix is written",
        "scope": {"allowed": ["TODO"], "forbidden":
                  ["migrations/**", "**/openapi.yaml", "**/*.proto"]},
        "policy": {"require_regression_test": True, "require_tdd": True,
                   "require_code_quality_review": True,
                   "require_full_verification": True,
                   "require_spec_review": False,
                   "require_convergence": False,
                   "max_files_changed": 8},
        "verification": {"commands": {"test": "TODO", "lint": "TODO"}},
        "escalation": {"triggers": ["contract_change_required",
                                    "schema_change_required",
                                    "business_rule_ambiguity",
                                    "fix_requires_forbidden_scope",
                                    "root_cause_not_found"],
                       "action": "STOP_AND_ESCALATE_TO_TRACK_B"},
        "status": "in_progress",
    }
    out = d / "change-record.yaml"
    out.write_text(yaml.safe_dump(record, sort_keys=False), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")
    print("Fill in every TODO before writing any code.")


if __name__ == "__main__":
    main()
```

A companion check for CI — refuse any Track C change whose record still contains `TODO` in `entry_criteria` or `root_cause`, or whose diff touches a path in `scope.forbidden`. Part 7.3 has it.

---

## 3.7 Optional: package the glue as a Spec Kit extension

Spec Kit supports community extensions, presets, and workflows, and organisations can host their own catalogs. Once the glue is stable, packaging `sdd-handoff` / `sdd-validate` as an internal extension means new repositories get the whole process with:

```bash
specify init <project> --integration claude
specify extension add <your-org>/agentic-sdd
```

Do this **after** the process has run successfully on two or three real features — not before. Packaging an unproven process just makes the wrong thing easy to spread.

---

# PART 4 — TRACK A RUNBOOK (GREENFIELD)

Commands in order, with the checkpoint after each. Expect **2–4 weeks** from A0 to the first feature MR on a real system; most of that is human decision time, not tool time.

## Phase 0 — Human input (1–5 days, no agent)

```bash
mkdir -p docs/discovery/{interviews,as-is-process,sample-data,external-contracts,compliance}
```

Fill them. Gate before continuing: scope-out list exists, NFRs carry numbers, a named decision-maker is committed to a response SLA. If you cannot get those three, the agents will invent them.

## Phase 1 — BMAD discovery and planning

```text
# optional, when requirements are genuinely unclear
/bmad:core:workflows:brainstorming
/bmad:bmm:workflows:research            # market / domain / technical

# required
/bmad:bmm:workflows:create-product-brief
/bmad:bmm:workflows:create-prd
/bmad:bmm:workflows:create-ux-design    # only if there is a UI
/bmad:bmm:workflows:create-architecture

# STOP. Do not run create-epics-and-stories. Do not run Phase 4.
```

Checkpoints between steps:

| After | Verify before continuing |
|---|---|
| product brief | success metrics are numeric |
| PRD | every FR has a stable unique ID; every NFR has a number; **delete any generated user stories** |
| architecture | `source-tree.md` is concrete enough that a task can name allowed directories |

BMAD writes into `docs/baseline/` if you set `core.output_folder`. Curate: promote what is real, delete what the agent padded. A PRD nobody trimmed is a PRD nobody will read.

## Phase 2 — Human curation and freeze (1–2 days)

Write three files by hand. Do not delegate these.

```bash
$EDITOR docs/baseline/glossary.md        # bilingual VI–EN, ≥20 canonical terms
$EDITOR docs/baseline/feature-map.md     # epics → vertical slices, ≤15 tasks each
$EDITOR docs/baseline/verification.md    # the ```commands block from Part 3.4
```

`feature-map.md` template:

```markdown
# Feature Map

| ID  | Outcome (demonstrable to a user) | PRD FRs | Depends on | Est. tasks |
|-----|----------------------------------|---------|------------|------------|
| 000 | Walking skeleton: health endpoint + one vertical slice | — | — | 8 |
| 001 | Operations staff can cancel an order within 24h | FR-012, FR-013 | 000 | 12 |
| 002 | Customer receives a cancellation notification | FR-014 | 001 | 7 |
```

Then freeze:

```bash
git add docs/baseline
git commit -m "baseline: freeze 2026-09-17-001"
python3 scripts/sdd/sdd_freeze.py --approved-by "<name>"   # or write the YAML by hand
git add docs/baseline/baseline-freeze.yaml && git commit -m "baseline: record freeze"
```

A minimal `sdd_freeze.py` is 30 lines — same `ref()` pattern as `sdd_handoff.py`, writing the schema in protocol v2 §A7. Writing it by hand the first time is also fine.

**Protect the baseline now**, before anyone can accidentally edit it:

```bash
cat > .githooks/pre-commit <<'EOF'
#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)
case "$branch" in
  baseline/*|governance/*) exit 0 ;;
esac
if git diff --cached --name-only | grep -qE '^docs/baseline/|^\.specify/memory/constitution\.md'; then
  echo "BLOCKED: baseline/constitution changes require a baseline/* or governance/* branch."
  exit 1
fi
EOF
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

## Phase 3 — Constitution

```text
/speckit.constitution Derive from docs/baseline/architecture/coding-standards.md,
docs/baseline/architecture/tech-stack.md and docs/baseline/verification.md.
Add: TDD is mandatory; every task requires spec-compliance and code-quality review;
no public API change without an ADR; every DB migration needs a rollback plan.
```

Do not hand-write principles that contradict the architecture baseline. Check the diff.

## Phase 4 — Feature 000, the walking skeleton

```text
/speckit.specify Feature 000 walking skeleton: create the repository structure
described in docs/baseline/architecture/source-tree.md, a runnable unit and
integration test harness, lint and format configuration, CI pipeline, migration
tooling, a health endpoint, and exactly one thin vertical slice from API through
service to persistence with a passing test. No business functionality.

/speckit.plan     (tech stack from docs/baseline/architecture/tech-stack.md)
/speckit.tasks
/speckit.analyze
```

Generate a handoff with TDD relaxed — edit `policy` in the generated file:

```yaml
policy:
  require_tdd: false
  tdd_exemption_reason: "Bootstrap: the test harness is what this feature builds."
  require_convergence: false
```

```bash
python3 scripts/sdd/sdd_handoff.py --feature 000-walking-skeleton --track A
$EDITOR .sdd/000-walking-skeleton/handoff.yaml     # apply the bootstrap exemption
python3 scripts/sdd/sdd_validate.py --feature 000-walking-skeleton
```

Then in the agent: *"Execute the tasks in specs/000-walking-skeleton/tasks.md using subagent-driven-development. The handoff is validated. Do not brainstorm or write a new plan."*

**Exit gate:** every command in `verification.md` runs green on a fresh clone. Do not proceed otherwise — every later task brief depends on this being real.

## Phase 5 — The per-feature loop

```bash
# 1. point Spec Kit at the feature
$EDITOR .specify/feature.json          # or: export SPECIFY_FEATURE_DIRECTORY=specs/001-order-cancellation
```

```text
# 2. specification (paste only the relevant sharded PRD sections, not the whole PRD)
/speckit.specify <outcome from feature-map.md> ... Traces to PRD FR-012, FR-013.
/speckit.clarify
/speckit.plan
/speckit.checklist
/speckit.tasks
/speckit.analyze
```

```bash
# 3. commit artifacts so git SHAs exist, then hand off
git add specs/001-order-cancellation && git commit -m "spec(001): specification, plan, tasks"
python3 scripts/sdd/sdd_handoff.py --feature 001-order-cancellation --track A
python3 scripts/sdd/sdd_validate.py --feature 001-order-cancellation
git add .sdd/001-order-cancellation && git commit -m "sdd(001): handoff validated"
```

```text
# 4. execution — the exact prompt matters
Execute specs/001-order-cancellation/tasks.md using subagent-driven-development.

The handoff .sdd/001-order-cancellation/handoff.yaml is validated. Rules:
- Do NOT brainstorm. Do NOT write a plan. tasks.md is the plan.
- For each task, first write .sdd/001-order-cancellation/task-<NNN>-brief.md
  using the Context Contract in docs/agentic-sdd-protocol-v2.md Part V section 2.
- Give each implementer subagent ONLY its brief plus relevant source and tests.
- TDD, then spec-compliance review, then code-quality review, then verification.
- Write task-<NNN>-report.md and task-<NNN>-review.md; update progress.md.
- Commit per task. Stop and report on any spec, architecture, or scope conflict.
```

```text
# 5. convergence
/speckit.converge
```

If it appends tasks, execute them the same way and converge again. When it reports converged, run the full verification suite and open the MR with the traceability chain in the description.

**Repeat Phase 5 per feature.** Phases 0–4 happen once.

---

# PART 5 — TRACK B RUNBOOK (BROWNFIELD FEATURE)

## One-time setup per repository

```bash
git checkout -b chore/adopt-spec-kit
specify init --here --force --integration claude --script sh
mkdir -p docs/baseline .sdd scripts/sdd
```

If the repo has no baseline, reconstruct one once (protocol v2 §B.6). BMAD is genuinely the cheapest way to do this even in a Track B repo:

```text
/bmad:bmm:workflows:document-project
/bmad:bmm:workflows:generate-project-context
```

Curate the output by hand into `docs/baseline/architecture.md` and `docs/baseline/glossary.md`, add `verification.md`, record known debt as ADRs with `status: accepted-as-is`, then freeze as `baseline_id: reconstructed-<date>`. Skip `prd.md` — reconstructing a PRD for a legacy system is usually waste.

```text
/speckit.constitution Preserve public API compatibility. Follow the existing service
boundaries. Every migration includes a rollback plan. Run the repository's existing
unit and integration suites. TDD for new code; characterization tests before changing
untested code.
```

Commit the whole adoption as one reviewable diff.

## Per feature

```bash
# 1. intake — append to docs/baseline/feature-map.md (outcome, not solution)
# 2. baseline reference check — can this be built inside the current architecture?
#    NO → escalate to a baseline revision on a baseline/* branch.
```

```text
# 3. impact analysis — READ ONLY, no code changes
Analyse the impact of <feature> and write specs/014-<slug>/impact-analysis.md using the
template in docs/agentic-sdd-protocol-v2.md Part III B2. Read the codebase; change nothing.
Sections required: existing behaviour, affected modules, affected contracts, existing
tests that must keep passing, regression risk, reusable assets, migration needs, out of scope.
```

```text
# 4. specification
/speckit.specify <outcome>. Preserve <compatibility boundaries from impact-analysis.md>.
/speckit.clarify
/speckit.plan
/speckit.checklist
/speckit.tasks     ← ensure characterization-test, migration and regression tasks exist
/speckit.analyze
```

```bash
# 5. codebase context — one page, hand-curated or agent-drafted then trimmed
$EDITOR .sdd/014-<slug>/codebase-context.md

# 6. handoff
git add specs/014-<slug> && git commit -m "spec(014): specification, plan, tasks"
python3 scripts/sdd/sdd_handoff.py --feature 014-<slug> --track B
python3 scripts/sdd/sdd_validate.py --feature 014-<slug>
```

```text
# 7. execution — same prompt as Track A, plus:
- Each task brief must include a "Must not break" section from impact-analysis.md.
- Run the regression suite after EVERY task, not only at the end.
```

```text
# 8. convergence
/speckit.converge
```

Add one manual check that `/speckit.converge` will not do for you: diff the branch against the union of all task allowed-scopes. Anything outside is a finding even when the tests pass.

```bash
git diff --name-only main...HEAD
```

---

# PART 6 — TRACK C RUNBOOK (DIRECT CHANGE)

No Spec Kit, no BMAD. Superpowers only. Target: **under a day, end to end**.

```text
# 1. decide the track — do not skip this
/sdd-track BUG-4821: cancelling an order leaves the audit record uncommitted
```

If any of CV001–CV010 is false, stop. It is Track B.

```bash
# 2. scaffold the record
python3 scripts/sdd/sdd_change.py --ticket BUG-4821 --type bugfix
$EDITOR .sdd/direct/2026-09-17-BUG-4821/change-record.yaml
# fill every TODO except root_cause; declare allowed and forbidden scope NOW
git add .sdd/direct/2026-09-17-BUG-4821 && git commit -m "sdd(BUG-4821): change record"
```

```text
# 3. reproduce — failing test first
Reproduce BUG-4821 with a failing test. Use test-driven-development.
Do not fix anything yet. Show me the failure output.
```

```text
# 4. root cause
Use systematic-debugging to find the root cause. Write
.sdd/direct/2026-09-17-BUG-4821/analysis.md with: root cause, why it was not caught,
blast radius, whether the same pattern exists elsewhere. Do not fix yet.
```

If the root cause sits in a contract, schema, or business rule → **stop, escalate to Track B**, record the escalation in the ticket.

```bash
$EDITOR .sdd/direct/2026-09-17-BUG-4821/change-record.yaml   # fill root_cause
```

```text
# 5. minimal fix
Implement the minimal fix. Scope is declared in change-record.yaml — do not touch
anything outside scope.allowed, including improvements. If the fix requires a path in
scope.forbidden, STOP and report.
```

```text
# 6–8. verify, review, report
Run every command in change-record.yaml verification, plus the full regression suite.
Then use requesting-code-review, checking specifically: is this the root-cause fix or a
symptom patch, is the regression test meaningful, is the diff within declared scope.
Write review.md and report.md using the templates in protocol v2 Part IV.
```

MR description must state Track C, link the change record, and confirm the entry criteria were verified. That is what makes skipping the specification layer auditable rather than invisible.

---

# PART 7 — CI ENFORCEMENT

Process documents are suggestions. CI jobs are rules. Four jobs carry most of the enforcement.

## 7.1 Baseline protection

```yaml
# .gitlab-ci.yml
baseline-guard:
  stage: validate
  rules:
    - if: '$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME =~ /^(baseline|governance)\//'
      when: never
    - when: always
  script:
    - |
      CHANGED=$(git diff --name-only origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME...HEAD)
      if echo "$CHANGED" | grep -qE '^docs/baseline/|^\.specify/memory/constitution\.md'; then
        echo "BLOCKED: baseline or constitution modified outside a baseline/governance branch"
        echo "$CHANGED" | grep -E '^docs/baseline/|^\.specify/memory/constitution\.md'
        exit 1
      fi
```

## 7.2 Handoff validation and staleness

```yaml
handoff-guard:
  stage: validate
  script:
    - pip install pyyaml
    - |
      FEATURE=$(python3 -c "import json;print(__import__('pathlib').Path(json.load(open('.specify/feature.json')).get('feature_directory','')).name)")
      if [ -f ".sdd/$FEATURE/handoff.yaml" ]; then
        python3 scripts/sdd/sdd_validate.py --feature "$FEATURE"
      else
        echo "no handoff for $FEATURE — assuming Track C; skipping"
      fi
```

Run it on every push to a feature branch, not only at MR time. Catching a stale handoff at task 3 is cheap; catching it at task 12 is not.

## 7.3 Track C guard

```yaml
track-c-guard:
  stage: validate
  script:
    - |
      for rec in $(git diff --name-only origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME...HEAD \
                   | grep 'change-record.yaml' || true); do
        grep -q 'TODO' "$rec" && { echo "BLOCKED: $rec has unfilled TODOs"; exit 1; }
        python3 - "$rec" <<'PY'
      import sys, subprocess, fnmatch, yaml
      rec = yaml.safe_load(open(sys.argv[1]))
      forbidden = (rec.get("scope") or {}).get("forbidden") or []
      changed = subprocess.run(["git","diff","--name-only",
                                "origin/main...HEAD"], capture_output=True,
                               text=True).stdout.split()
      bad = [f for f in changed for pat in forbidden if fnmatch.fnmatch(f, pat)]
      if bad:
          print("BLOCKED: change touches forbidden scope:", bad); sys.exit(1)
      PY
      done
```

## 7.4 Traceability

```yaml
traceability-guard:
  stage: validate
  script:
    - |
      # every MR must reference a feature id or a Track C change id
      echo "$CI_MERGE_REQUEST_DESCRIPTION" | grep -qE '(specs/[0-9]{3}-|\.sdd/direct/)' \
        || { echo "BLOCKED: MR description has no traceability reference"; exit 1; }
```

Keep these jobs fast (< 60s total). A slow gate gets disabled.

---

# PART 8 — ROLLOUT PLAN

The order in protocol v2 Part VI is deliberate and worth repeating here: **Track C first, then B, then A.** Track A is the most expensive to learn on and the least frequent; teams that start there build an elaborate pipeline they have never validated against real execution.

## Week 1 — Track C on a real repository

- Install Superpowers only. No Spec Kit, no BMAD.
- Write `CLAUDE.md` sections 0, 2 (Track C part), 5.
- Write `sdd_change.py` and the `.claude/commands/sdd-change.md` wrapper.
- Run 5–10 real bug fixes through it.
- **Success criterion:** every fix has a failing-test-first record and a named root cause, and at least one change was correctly escalated to "this is Track B".

What you are actually learning here: whether your team can hold a scope boundary. If Track C changes keep growing, no amount of Track A ceremony will save you.

## Weeks 2–4 — Track B on the same repository

- Install Spec Kit; reconstruct a minimal baseline (architecture + glossary + verification).
- Write `sdd_handoff.py`, `sdd_validate.py`, the full `CLAUDE.md`, CI jobs 7.1–7.2.
- Run **two or three real features** end to end.
- **Success criterion:** the validator blocked something real at least once, convergence found at least one genuine gap, and no agent edited a protected artifact.

## Weeks 5+ — Track A, when a greenfield project actually starts

- Install BMAD in that repository only.
- Run phases 0–4, freeze, build the walking skeleton.
- **Success criterion:** feature 001 reaches MR without a baseline revision. If it needs one immediately, the baseline was not really ready — that is a useful and cheap lesson at feature 001, and an expensive one at feature 010.

## Roles

| Role | Owns |
|---|---|
| Tech lead | track decisions, baseline freeze approval, architecture conflicts |
| Product owner / BA | discovery input, PRD content, clarification SLA |
| Platform / tooling engineer | glue scripts, CI jobs, version pinning |
| Every developer | running the tracks, not bypassing them |

The clarification SLA is the one that quietly decides whether this works. An agent blocked on `[NEEDS CLARIFICATION]` for three days is an agent that someone will "help" by guessing.

## Metrics worth tracking from day one

```text
- % of changes by track (a healthy ratio is roughly C 50-60%, B 35-45%, A rare)
- Track C escalations, and whether they were caught at C1 or later
- validator failures by rule (which rule fires most tells you where the process leaks)
- convergence gaps per feature (trending up = specs getting thinner)
- rework after MR (the real outcome measure)
```

---

# PART 9 — KNOWN FRICTION AND TROUBLESHOOTING

## 9.1 Two executors, one repository

**Symptom:** the agent runs `/speckit.implement` and Superpowers never engages, or both touch the same files.
**Cause:** Spec Kit's documented happy path ends in `implement` + `converge`. Every tutorial the agent has seen does that.
**Fix:** `CLAUDE.md` §1 forbids it explicitly by name. Repeat the prohibition in the execution prompt itself. Consider removing or renaming the `speckit.implement` skill file for your integration if the agent keeps reaching for it.

## 9.2 Worktrees vs `.specify/feature.json`

**Symptom:** Spec Kit commands operate on the wrong feature after Superpowers creates a worktree.
**Cause:** the active feature is a file in the working tree, and a worktree is a different working tree.
**Fix:** export the override in the worktree shell:

```bash
export SPECIFY_FEATURE_DIRECTORY=specs/001-order-cancellation
```

Put this in the worktree setup step so it is automatic, and add it to the task brief's verification section.

## 9.3 Superpowers plans over your plan

**Symptom:** `brainstorming` or `writing-plans` fires and produces a design document competing with `spec.md`.
**Cause:** those skills trigger automatically on "I'm building something".
**Fix:** the execution prompt must open with *"The handoff is validated. Do not brainstorm. Do not write a plan."* — the `CLAUDE.md` rule alone is weaker than an instruction in the immediate prompt. If it still fires, the handoff is probably missing or the prompt started with a feature description instead of a pointer to `tasks.md`.

## 9.4 BMAD wants to keep going

**Symptom:** after `create-architecture`, BMAD offers epics, stories, and the dev loop.
**Fix:** stop the session there. Do not install the modules you do not need. If someone runs `create-epics-and-stories` anyway, delete the stories, keep nothing but the epic titles, and note it in the ticket — the failure mode is a team quietly maintaining two backlogs.

## 9.5 Command names changed after an upgrade

**Symptom:** a documented command no longer exists.
**Fix:** this is why you pinned. To re-derive the current names:

```bash
cat _bmad/_config/workflow-manifest.csv       # BMAD workflows and their invocations
cat _bmad/bmm/module-help.csv                 # per-workflow output locations
ls .claude/skills | grep speckit              # Spec Kit command form for your integration
```

Update `CLAUDE.md` and `tooling-versions.md` in the same commit as the upgrade.

## 9.6 Token cost is higher than expected

**Checks, in order of impact:**
1. Is the whole PRD or architecture document in `context.include`? Shard it.
2. Is `codebase-context.md` over a page? Trim it (BF004 enforces this).
3. Are task briefs being regenerated with the full spec inlined? They should carry only referenced sections.
4. Are features too large? A 40-task feature reloads context 40 times. Split it.

## 9.7 The validator keeps failing on HV013

**Symptom:** `git_sha not captured`.
**Cause:** artifacts are not committed. The handoff records commit SHAs, so uncommitted artifacts have no identity.
**Fix:** commit spec/plan/tasks before generating the handoff. This is by design — an execution pinned to an uncommitted file is not reproducible.

## 9.8 "This is slowing us down"

Almost always one of three things, and only one of them is the process's fault:

- **Track selection is wrong.** Small changes going through Track B is the usual cause. Audit the last 20 changes against the decision tree.
- **Features are too big.** 15 tasks is the ceiling for a reason.
- **Clarification is blocked.** The named decision-maker is not responding. This is an organisational problem wearing a process costume.

---

# APPENDIX A — SETUP CHECKLIST

```text
FOUNDATION
[ ] docs/tooling-versions.md with real versions, no placeholders
[ ] Superpowers installed and /help shows its commands
[ ] Spec Kit initialized; .specify/memory/constitution.md and specs/ exist
[ ] BMAD installed (Track A repos only) with core.output_folder=docs/baseline
[ ] git worktree works

GLUE
[ ] CLAUDE.md at repo root with all six sections
[ ] .claude/commands/sdd-{track,handoff,validate,change}.md
[ ] scripts/sdd/{sdd_lib,sdd_handoff,sdd_validate,sdd_change}.py
[ ] docs/baseline/verification.md with a parseable ```commands block
[ ] pre-commit hook protecting docs/baseline and constitution.md

BASELINE (Track A / reconstructed)
[ ] product-brief.md, prd.md (+ sharded), architecture.md (+ sharded)
[ ] glossary.md — bilingual, ≥20 canonical terms
[ ] feature-map.md — vertical slices, ≤15 tasks each, dependency-ordered
[ ] adr/ with the decisions that actually constrain implementation
[ ] baseline-freeze.yaml committed with a human name on it

EXECUTION READINESS
[ ] feature 000 walking skeleton merged (Track A)
[ ] every verification.md command green on a fresh clone
[ ] validator run once against a deliberately broken handoff — it blocked

CI
[ ] baseline-guard
[ ] handoff-guard
[ ] track-c-guard
[ ] traceability-guard
[ ] total runtime under 60s

PROCESS
[ ] named clarification decision-maker with a response SLA
[ ] track-selection decision recorded on every ticket
[ ] monthly Track C audit scheduled
[ ] upgrade owner named per tool
```

---

# APPENDIX B — THE FIVE THINGS THAT MOST OFTEN GO WRONG

1. **Skipping the glossary.** Costs nothing to write, and its absence produces naming chaos that task-scoped review structurally cannot detect.
2. **Not freezing the baseline.** One agent reads a draft while another edits it; every downstream artifact becomes unverifiable.
3. **Letting Track C absorb feature work.** The entry gate is the entire value of Track C. A Track C that accepts features is just an undocumented Track B.
4. **Features larger than ~15 tasks.** Convergence always finds gaps, any spec change invalidates the in-flight handoff, and context cost scales badly.
5. **Installing all three frameworks everywhere.** An installed tool is an invitation to use it. BMAD belongs only in repositories that run Track A.
