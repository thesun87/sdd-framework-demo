# Verification Contract

**Human-owned.** This is the single source of truth for "is it done?".
`scripts/sdd/sdd_handoff.py` parses the fenced block below into
`handoff.yaml → verification.commands`, and the validator enforces it:

- **HV009 (blocking)** — `test` and `lint` must both be present and non-empty.
- **HV009b (warning)** — the first word of each command must be on `PATH`.
- **BF003 (blocking, Track B)** — `regression` must be present.

Keep the keys stable. Agents run these commands verbatim; they never invent
their own.

```commands
test: npm test
lint: npm run lint
regression: npm run test:regression
build: npm run build
```

## What each command covers

| Key | Command | Covers |
|---|---|---|
| `test` | `npm test` | the full unit suite (`node --test tests/`) |
| `lint` | `npm run lint` | syntax + static checks over `scripts/` and `tests/` |
| `regression` | `npm run test:regression` | the suite that must stay green across every Track B/C change |
| `build` | `npm run build` | build/packaging step; a no-op today, kept so the key exists |

## Thresholds and prerequisites

- Coverage threshold: **not enforced yet** — set one before the first real
  product feature, and record it here.
- Prerequisites: Node ≥ 20.12, Python ≥ 3.10, PyYAML. No network access needed.
- Every command above must be green **on a fresh clone** before a baseline is
  frozen (setup guide Appendix A, "EXECUTION READINESS").

## Definition of done (all tracks)

1. Every command in the block above exits 0.
2. Every acceptance criterion in `specs/<feature>/spec.md` has an owning task
   in `tasks.md` (HV007b) and that task reports done.
3. Code quality review passed (`requesting-code-review`).
4. Final verification passed (`verification-before-completion`).
5. Track A/B only: `/speckit-converge` ran and produced no unaddressed tasks.
