# Track C report — SDD-001

**Change id:** `2026-09-18-SDD-001` · **Type:** bugfix · **Severity:** medium

## Defect
`python3 scripts/sdd/sdd_change.py --ticket '../../escaped-BUG'` wrote
`.sdd/direct/escaped-BUG/change-record.yaml` — outside the audit tree — while
the record's own `change_id` field read `2026-09-18-../../escaped-BUG`.
Location and identity disagreed, so the record was invisible to any tooling
that walks `.sdd/direct/<change-id>/`, including the Track C CI guard in
setup guide §7.3 which globs `change-record.yaml` paths.

## Entry gate
CV001–CV010 all true, recorded in `change-record.yaml` **before** any code was
written. No contract, schema, authz, NFR, or dependency impact.

## Root cause
The ticket string was interpolated straight into a path with no validation that
it is a single safe path segment; `Path.__truediv__` resolves `..` at write
time. `mkdir(parents=True)` also ran before any check, so malformed input left
directories behind.

## Fix
`scripts/sdd/sdd_change.py`: added `TICKET_RE = ^[A-Za-z0-9][A-Za-z0-9._-]*$`
and `validate_ticket()`, called as the first statement of `main()` — before
`mkdir`. Invalid input exits non-zero and creates nothing.
2 files changed (limit: 8). No forbidden path touched.

## Verification
| Command | Result |
|---|---|
| `npm test` | 12 passed, 0 failed |
| `npm run lint` | passed |

Regression test: `tests/sdd_change.test.mjs` →
`rejects a ticket id that escapes .sdd/direct`, plus a table-driven case for
`a/b`, `.`, `..`, `""`, `with space`, `x\y`. Both were **red before the fix**
and green after.

## Out-of-scope issue found and handled separately
`npm test` was never green: `node --test tests/` does not accept a directory on
Node 24. That is the verification harness itself, not the SDD-001 change unit,
so it was fixed in its own commit (`fix(setup): …`) rather than smuggled into
this record — see protocol v2 anti-pattern "feature work smuggled in as a fix".
