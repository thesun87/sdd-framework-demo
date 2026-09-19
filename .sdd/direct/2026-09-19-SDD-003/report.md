# Track C report — SDD-003

**Change id:** `2026-09-19-SDD-003` · **Type:** bugfix · **Severity:** high
**Branch:** `chore/0003-bv003-traceability` · **Commits:** `f746a70`, `6785722`

## Defect

`/sdd-validate` on the Track A handoff for `000-walking-skeleton` reported

```
FAIL  BV003  spec FRs with no PRD origin: FR-001 … FR-008
```

— every declared requirement in the spec — although `spec.md` carries an
explicit origin for each one, written `- **FR-001** *(← PRD FR-4)*: …`.
The feature could not be handed off at all.

In the same run BV003 silently **accepted** `FR-14`, which occurs in `spec.md`
only inside an out-of-scope note ("Đặt đơn là FR-14, thuộc feature 004") and
belongs to feature `004`, because that string also occurs in `prd.md`.

## Entry gate

CV001–CV010 recorded in `change-record.yaml` **before** any code was written.
Eight true; **CV006 and CV010 CONTESTED**, put to the decision-maker together
with the option of escalating to Track B, and Track C was chosen. Mitigation
for CV006 — the gate is made strictly stronger, never weaker — is pinned by
tests in both directions. No contract, schema, authz, NFR or dependency impact.

## Root cause

Three faults compose. `find_ids` (`sdd_lib.py`, unchanged since bootstrap
commit `d7424d8`) extracted ids with `\b{prefix}-?\d{2,4}\b`.

1. **The two-digit floor** made `prd.md`'s `FR-1` … `FR-9` invisible: `prd_frs`
   held 26 of the PRD's 35 requirements. Feature `000` traces exclusively to
   `FR-4` and `FR-5` — both inside the invisible nine.
2. **BV003 compared raw id strings**, assuming spec ids and PRD ids share a
   namespace. `.specify/templates/spec-template.md:90-94` is installer-managed
   and mandates spec-local `FR-001` numbering, so the two namespaces cannot
   coincide by construction. The real trace is the `*(← PRD FR-N)*`
   back-reference, which BV003 never read.
3. **The input set was every FR-shaped string in the document**, so a
   cross-feature mention in an out-of-scope note counted as a traced
   requirement.

Faults 1 and 2 are locked together: fixing either alone leaves BV003 red.

Numeric normalisation is **not** an alternative fix and is actively wrong —
`FR-001` would normalise onto PRD `FR-1` (catalog browse, feature `001`) while
it actually traces to PRD `FR-4`.

## Fix

- `sdd_lib.py` — `find_ids` takes `min_digits` (default **2**, unchanged
  behaviour); new `declared_requirements()` + `DECLARED_FR_RE` / `PRD_ORIGIN_RE`
  map each FR a spec *declares* to the PRD FR it cites, or `None`.
- `sdd_validate.py` — BV003 reads `declared_requirements()` and fails an FR
  whose origin is missing or absent from the PRD; `prd_frs` alone passes
  `min_digits=1`. The failure message now names the expected syntax.

4 files changed (limit 8). No forbidden path touched.

## Verification

| Command | Result |
|---|---|
| `npm test` | 22 passed, 0 failed |
| `npm run lint` | passed |

Regression tests in `tests/sdd_validate.test.mjs` — five for BV003, one for the
review finding. **Red before the fix:** back-reference accepted; single-digit
PRD origin resolved; id-collision-without-back-reference rejected; prose-only
mention not credited; HV006 not satisfied by a prefix collision. **Guard
(green both before and after):** back-reference pointing at an absent PRD FR
still blocks.

End-to-end against the real feature, in a throwaway worktree merging this
branch into `feature/000-walking-skeleton`:
`PASS — handoff validated`, exit 0. All 8 declared FRs resolve
(`FR-001…FR-004 → FR-4`, `FR-005…FR-008 → FR-5`); `FR-14` no longer enters the
checked set; `prd_frs` 26 → 35.

## Scope compliance

No file outside declared scope was modified. Verified mechanically against the
`allowed` / `forbidden` globs in `change-record.yaml`.

## Review

Code quality: **PASS with one Important finding, fixed before merge.**

The reviewer found that widening the `find_ids` floor leaked past BV003 into
HV006/HV007, which test membership by plain substring containment. Confirmed
independently on the real artifacts: `spec_frs` grew 9 → 16, and `FR-1` matched
inside `FR-14`, `FR-2` inside `FR-24/25` — ids belonging to other features. The
outcome did not flip today, because `FR-001` already satisfied both rules on
its own, but the gate had begun tolerating noise, which is exactly what this
record promised would not happen.

Fixed in `6785722` by moving the floor to the call site: the default stays at
two and only BV003's PRD read lowers it. `spec_frs` and `acs` are now
byte-identical to their pre-SDD-003 values, verified against the real spec.

## Related findings (NOT fixed here)

1. **HV007b is inert.** `find_ids(spec_txt, "AC")` returns an empty set for
   feature `000`: the pattern requires a digit immediately after the hyphen,
   but the spec names its criteria `AC-AD1`, `AC-AD21`, …. The "acceptance
   criteria with no owning task" warning therefore never fires. Pre-existing,
   unrelated to this root cause, outside declared scope.
2. **HV006/HV007 match by substring, not by word boundary.** Keeping the floor
   at two digits removes today's exposure but not the underlying weakness —
   `FR-14` would still match inside `FR-140`.
3. **The `(← PRD FR-N)` convention is written down nowhere.** It is not in the
   protocol and not in `spec-template.md`, which is installer-managed and may
   not be edited here. BV003 now depends on it, so a future spec that omits it
   will fail. Mitigated only by the failure message, which states the syntax.
   The right home is `docs/agentic-sdd-protocol-v2.md` §BV003 — outside this
   change's declared scope.

Each is a separate change unit. Recording them here rather than fixing them is
deliberate: protocol v2 anti-pattern *"feature work smuggled in as a fix"*.
