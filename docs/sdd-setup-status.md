# SDD Setup Status — 2026-09-18

Appendix A of `agentic-sdd-setup-guide.md`, with the real state of this repository.

## FOUNDATION
- [x] `docs/tooling-versions.md` with real versions, no placeholders
- [x] Superpowers installed and active — v6.3.0, scoped to this project,
      enabled via `.claude/settings.json`. All 7 skills the protocol needs are
      present, and the 3 it suppresses (`brainstorming`, `writing-plans`,
      `executing-plans`) are named explicitly in `CLAUDE.md` §1/§2.
- [x] Spec Kit initialized; `.specify/memory/constitution.md` and `specs/` exist
- [x] BMAD installed (v6.12.0, `bmm` only) with `core.output_folder=docs/baseline`
- [x] `git worktree` works (git 2.43.0)

## GLUE
- [x] `CLAUDE.md` at repo root with all six sections (+ §7 runbooks)
- [x] `.claude/commands/sdd-{track,handoff,validate,change}.md`
- [x] `scripts/sdd/{sdd_lib,sdd_handoff,sdd_validate,sdd_change}.py`
- [x] `docs/baseline/verification.md` with a parseable ` ```commands ` block
- [ ] pre-commit hook protecting `docs/baseline` and `constitution.md`
      — **deliberately skipped**: no enforcement layer was requested. The rule
      currently lives only in `CLAUDE.md` §3, which is a suggestion, not a gate.

## BASELINE
- [ ] `product-brief.md`, `prd.md` (+ sharded), `architecture.md` (+ sharded)
      — **not written**: no product exists yet. Track A starts with `bmad-product-brief`.
- [x] `glossary.md` — 20 canonical process terms, bilingual EN/VI.
      Domain terms must be appended before the first real product feature.
- [x] `feature-map.md` — template with the Track B intake queue
- [x] `adr/0000-template.md`
- [x] `baseline-freeze.yaml` — present with `status: draft`.
      **Track A handoffs will fail BV001 until a human freezes it.** That is correct.

## EXECUTION READINESS
- [ ] feature 000 walking skeleton merged — Track A not started
- [x] every `verification.md` command green on a **fresh clone**
      (`npm test` 12/12, `npm run lint`, `npm run test:regression` 12/12, `npm run build`)
- [x] validator run against a deliberately broken handoff — **it blocked**.
      Automated as 8 cases in `tests/sdd_validate.test.mjs`:
      HV000, HV005, HV008, HV013b (staleness), HV014, HV015, BF001, BF004.

## CI
- [ ] baseline-guard / handoff-guard / track-c-guard / traceability-guard
      — **deliberately skipped** (no CI platform wired yet). The four jobs remain
      specified in `docs/agentic-sdd-setup-guide.md` §7. Until they exist,
      every rule in `CLAUDE.md` §3 is honour-system only.

## PROCESS
- [ ] named clarification decision-maker with a response SLA
- [x] track-selection decision recorded — demonstrated on SDD-001
- [ ] monthly Track C audit scheduled
- [x] upgrade owner named per tool (`docs/tooling-versions.md`)

---

## Pilot run — Track C, SDD-001

A real defect, found and fixed through the full Track C gate:
`sdd_change.py` accepted a `--ticket` containing path separators and wrote the
record outside `.sdd/direct/`, while `change_id` inside the file still claimed
the correct location.

Sequence actually followed: CV001–CV010 gate → `change-record.yaml` scaffolded
with `root_cause` left blank → failing regression test → root cause → minimal
fix (2 files, limit 8) → verification → report.

Record: `.sdd/direct/2026-09-18-SDD-001/` · Commit: `41e88fa`

One out-of-scope defect surfaced mid-pilot (`npm test` passed a directory to
`node --test`, which Node 24 rejects). It was fixed in a **separate commit**
(`93c6cd5`) rather than folded into the Track C change unit.

---

## What to do next

1. Decide whether this repo stays a template or gets a real product. If real:
   `bmad-product-brief` → `bmad-prd` → `bmad-architecture` → curate into
   `docs/baseline/` → set `baseline-freeze.yaml` to `frozen` with your name.
3. Append domain terms to `glossary.md` before the first feature.
4. Wire the four CI guards when a CI platform is chosen — until then the
   baseline protection rules are advisory.
