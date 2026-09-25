# Track C report — SDD-004

**Change id:** `2026-09-25-SDD-004` · **Type:** bugfix · **Severity:** high
**Branch:** `fix/SDD-004-handoff-ux-spec` · **Commits:** single commit on the branch (see `git log --grep SDD-004`)

## Defect

`specs/001-catalog-browse`, `002-accounts` and `003-cart-and-wall` each cite
`docs/baseline/ux-spec.md` as a baseline dependency, yet every generated
`handoff.yaml` pinned only `prd`, `architecture`, `glossary` and put no UX
section into `context.include`. `/sdd-validate` passed them. Task execution
therefore never saw the visual contract (ux-spec Part 1 tokens, layout, linked
mockups): `packages/ui/src/tokens.ts` carries an invented palette and the
storefront does not match the mockups. An edit to ux-spec.md would also have
marked no handoff STALE.

## Entry gate

CV001–CV010 recorded in `change-record.yaml` before any code. Nine true;
**CV006 CONTESTED** (a handoff gate becomes stricter), put to the
decision-maker with the Track B option; Track C was chosen. No new rule id —
HV013/HV013b are extended to `ux_spec`, and tests pin both directions.

## Root cause

Both since bootstrap commit `d7424d8`:

1. `sdd_handoff.py` hardcoded the `baseline:` block to the three artifacts in
   the protocol's illustrative A15/B8 handoffs, ignoring protocol :1831 ("each
   artifact it depends on").
2. `sdd_validate.py` applied HV013/HV013b only to spec/plan/tasks, so a
   dependency the handoff forgot was invisible.

## Fix

- `sdd_lib.py` — `UX_SPEC` + `depends_on_ux_spec()`, the single predicate both
  consumers share (deliberately loose: over-matching only over-pins).
- `sdd_handoff.py` — pins `baseline.ux_spec` and adds
  `referenced_ux_spec_sections` when the spec depends on it (both tracks).
- `sdd_validate.py` — HV013 when `ux_spec` is not captured (message
  distinguishes "regenerate" from "commit ux-spec.md first"); HV013b against
  the canonical file, not the handoff's own path claim.

## Verification

- Red → green: 4 regression tests red before the fix; 2 more red before the
  review fix; reviewer independently confirmed revert-fails in a temp worktree.
- `npm test`: glue 30/30, storefront, shared, ui PASS. **apps/api FAIL** — Nest
  app bootstrap exits 1 in integration tests; reproduced identically on
  unmodified `main` with this change stashed. Pre-existing and environmental,
  not caused by this change (diff touches no `apps/` or `packages/`).
- `npm run lint`: PASS.
- Real handoffs: 001, 002, 003 now FAIL `HV013 ux_spec: not captured` — the
  defect surfacing, as intended.

## Review

One independent reviewer: no Critical/Important. Minor findings applied:
HV013 message, canonical-path HV013b, vacuous assertion removed, test names in
the record, remaining gap recorded. Declined: tightening the predicate to the
full path (would let a bare `ux-spec.md` citation through); `full_ux_spec`
exclude entry (cosmetic, unenforced).

## Follow-ups (not done — human decision)

1. Regenerate `.sdd/{001,002,003}/handoff.yaml` (forbidden scope here).
2. HV013b for the pinned prd/architecture/glossary nodes (same fault 2).
3. `UX_REFS` in the task-brief contract — protocol §2 change.
4. Visual conformance of the storefront to ux-spec — a Track B feature.
5. `apps/api` integration suite failing on this machine.
