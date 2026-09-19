# Agentic SDD Framework — template repository

A working installation of the three-track Agentic SDD protocol: **BMAD**
(product + architecture) → **Spec Kit** (specification + governance) →
**Superpowers** (execution), wired together so they stop competing.

This repo is a **template**. Copy it to start a project that runs the protocol,
or read it to see what the wiring actually looks like once installed.

> The value of this setup is mostly in what is **turned off**. Left at defaults
> the three tools give you three planners and two executors fighting over one
> repository. Roughly 70% of the work here is suppression and glue.

---

## What is in here

| Path | What it is |
|---|---|
| `CLAUDE.md` | **The traffic controller.** Track selection, forbidden commands, file ownership, and the verified command names for every installed tool. The highest-leverage file in the repo. |
| `scripts/sdd/` | The glue: handoff generator, handoff validator, Track C change-record scaffolder, shared helpers. ~500 lines, the only custom code. |
| `.claude/commands/` | `/sdd-track`, `/sdd-handoff`, `/sdd-validate`, `/sdd-change` |
| `docs/baseline/` | The protected product baseline: glossary, feature map, verification contract, ADRs, freeze record. |
| `docs/agentic-sdd-protocol-v2.md` | The protocol — the *what*. |
| `docs/agentic-sdd-setup-guide.md` | The setup guide — the *how*. |
| `docs/tooling-versions.md` | Pinned versions **and every place the installed tools deviate from the guide.** Read this before debugging anything. |
| `docs/bootstrap-new-repo.md` | Step-by-step procedure for standing the framework up on a new greenfield repo. |
| `docs/sdd-setup-status.md` | Appendix A checklist with the real state of this repo, including what was deliberately left out. |
| `specs/` | Spec Kit feature artifacts (`spec.md`, `plan.md`, `tasks.md`). |
| `.sdd/` | Handoff contracts, task briefs, reports, Track C change records. |
| `tests/` | Proof the validator blocks — 12 cases, run by `npm test`. |

---

## Using it as a template for a new project

**Full step-by-step procedure: [`docs/bootstrap-new-repo.md`](docs/bootstrap-new-repo.md)**
— every command in it was actually run when this template was built. It covers
two paths:

- **Path B — clone this repo** (~30 min). Everything except the Superpowers
  plugin registration travels with the repo: all 39 skills, Spec Kit's bash
  scripts, BMAD's config, the glue layer. Verified: clone → `rm -rf .git` →
  `git init` → `npm test` 12/12 green, no reinstall. Freezes you at this
  template's tool versions.
- **Path A — install from scratch** (1–2 h). Newest tool versions, works on a
  new machine or a non-Claude-Code harness.

Both paths still require Phase 4 (adapt `verification.md` and the glossary to
your project) and Phase 6 (build and freeze the baseline). Cloning does not
shorten those.

The short version of Path B:

```bash
git clone <this-repo> my-project && cd my-project
git remote set-url origin <new-repo-url>
sed -i 's/sdd-framework/my-product/g' package.json _bmad/config.toml _bmad/bmm/config.yaml _bmad/core/config.yaml
rm -rf .sdd/direct/2026-09-18-SDD-001 docs/sdd-setup-status.md
npm test
```

For Path A, in order:

1. **Reinstall the toolchain** into the new repo — the installers write
   machine-specific manifests, so do not rely on the copied ones.
   Commands are in `docs/tooling-versions.md`. Superpowers must be installed
   from inside Claude Code: `/plugin install superpowers@claude-plugins-official`.
2. **Skip BMAD if you will not run Track A.** An installed tool is an invitation
   to use it. Brownfield repos that only run Tracks B and C should not have it.
3. **Rewrite `docs/baseline/verification.md`** for the real stack. The
   ` ```commands ` block is parsed into every handoff; `test` and `lint` are
   blocking, `regression` is blocking for Track B.
4. **Append domain terms to `docs/baseline/glossary.md`.** The 20 terms shipped
   here are process vocabulary only. Missing domain vocabulary produces naming
   chaos that task-scoped review structurally cannot detect.
5. **Update `CLAUDE.md` §6** if your tool versions differ. Command names change
   between releases; confirm with `/help` and `_bmad/bmm/module-help.csv`.
6. **Add the CI guards** from setup guide §7 (see *Known gaps* below).

---

## The three tracks

```text
A  greenfield        no frozen baseline exists
   bmad-product-brief → bmad-prd → bmad-ux → bmad-architecture
   → human curation + freeze → /speckit-constitution → /speckit-specify
   → /speckit-clarify → /speckit-plan → /speckit-tasks → commit
   → /sdd-handoff <id> A → /sdd-validate <id> → Superpowers → /speckit-converge

B  brownfield feature   baseline exists, and the change touches business rules,
                        contracts, schema, authz, acceptance criteria, NFRs,
                        or adds a capability
   feature-map intake → impact-analysis.md (READ ONLY) → /speckit-specify
   → /speckit-clarify → /speckit-plan → /speckit-tasks → codebase-context.md
   → commit → /sdd-handoff <id> B → /sdd-validate <id> → Superpowers
   → /speckit-converge

C  direct change       reproducible defect or trivial change, none of the above
   /sdd-track → /sdd-change → fill change-record.yaml → failing test
   → root cause → minimal fix → verify → review → report
```

Start with **C**, then B, then A. Track A is the most expensive to learn on and
the least frequent; teams that start there build an elaborate pipeline they have
never validated against real execution.

`/sdd-track <description>` walks the ten Track C entry criteria and recommends.
If you cannot justify Track C against **all ten**, it is Track B. Never
downgrade a track.

A worked Track C example ships with the repo:
`.sdd/direct/2026-09-18-SDD-001/` — a real defect in `sdd_change.py`, taken
through the full gate.

---

## The gate

Execution does not start until `handoff.yaml` validates:

```bash
python3 scripts/sdd/sdd_handoff.py --feature 001-slug --track B
python3 scripts/sdd/sdd_validate.py --feature 001-slug
```

Blocking rules cover: missing or unclarified spec, requirement IDs that never
reach the plan or tasks, a competing plan under `.sdd/`, missing verification
commands, undefined policy, uncaptured git SHAs, **a stale handoff** (an
artifact edited after the handoff was generated), a dirty working tree, a thin
glossary, and the Track A/B specific rules.

Two things the validator will never do, by design:

- **It never repairs anything.** The moment a validator auto-fixes artifacts so
  it can pass, it stops being a gate.
- **Warnings never become failures because they are inconvenient this week.**

`HV013b` — staleness — is the rule that earns its keep. It catches someone
editing `spec.md` while execution is running, which is the failure mode that
produces code nobody can explain.

---

## Verification

```bash
npm test              # 12 cases: the validator blocks what it should
npm run lint          # JS syntax + Python compile + YAML parse, zero deps
npm run test:regression
npm run build
```

All four must be green **on a fresh clone** before a baseline is frozen.

---

## Known gaps in this template

These are deliberate, not oversights. Read `docs/sdd-setup-status.md` for the
full checklist.

- **No CI enforcement.** The four guard jobs from setup guide §7
  (baseline-guard, handoff-guard, track-c-guard, traceability-guard) are not
  installed, and no pre-commit hook is either. Until they exist, every rule in
  `CLAUDE.md` §3 — including "never modify `docs/baseline/**`" — is
  honour-system only. A matrix in a document is a suggestion; a CI check is a
  rule.
- **No product baseline.** `prd.md` and `architecture.md` do not exist because
  no product does. `baseline-freeze.yaml` is `status: draft`, so Track A
  handoffs will fail `BV001` until a named human freezes it. That is correct
  behaviour, not a bug.
- **Glossary has process terms only.** Add domain vocabulary before the first
  real feature.

---

## The five things that most often go wrong

1. Skipping the glossary.
2. Not freezing the baseline — one agent reads a draft while another edits it.
3. Letting Track C absorb feature work. A Track C that accepts features is just
   an undocumented Track B.
4. Features larger than ~15 tasks.
5. Installing all three frameworks everywhere.
