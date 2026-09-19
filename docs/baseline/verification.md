# Verification Contract

**Human-owned.** This is the single source of truth for "is it done?".
`scripts/sdd/sdd_handoff.py` parses the fenced block below into
`handoff.yaml → verification.commands`, and the validator enforces it:

- **HV009 (blocking)** — `test` and `lint` must both be present and non-empty.
- **HV009b (warning)** — the first word of each command must be on `PATH`.
- **BF003 (blocking, Track B)** — `regression` must be present.

Keep the keys stable. Agents run these commands verbatim; they never invent
their own. **The four keys are fixed** — there is no fifth. Browser tests hang
off `regression`, not off a key of their own.

```commands
test: npm test
lint: npm run lint
regression: npm run test:regression
build: npm run build
```

## Every command has two halves

Each command runs a **glue half** (`scripts/`, `tests/` — the SDD machinery,
always present) and a **product half** (`apps/*`, `packages/*`, `e2e/` — which
does not exist until feature `000-walking-skeleton` lands).

This is not an accident to tidy up later. Track A **freezes the baseline before
any product code exists**, and the freeze gate below requires every command to
be green on a fresh clone. A command hardcoded to `apps/api` would make that
gate unpassable. `scripts/verify.mjs` therefore discovers product workspaces at
run time: a missing one is **skipped and reported as skipped**, a present one
that fails is a failure. The output always names what it ran and what it did not.

## What each command covers

| Key | Command | Glue half | Product half |
|---|---|---|---|
| `test` | `npm test` | `node --test tests/**/*.test.mjs` | `npm test` in each workspace — Jest in `apps/api`, Vitest in `apps/storefront`, `apps/backoffice`, `packages/*`. Includes `*.int-spec.ts` and `*.race-spec.ts`, so **a running database is required** once the product half exists. |
| `lint` | `npm run lint` | `node scripts/lint.mjs` — parses every `.mjs`/`.js` under `scripts/` and `tests/`, compiles every `.py` under `scripts/sdd/`, parses every `.yaml` under `docs/baseline/` and `.sdd/` | `npm run lint` in each workspace |
| `regression` | `npm run test:regression` | `npm test` | `npm test` **plus** `npm run test:e2e` — Playwright in `e2e/`. This is the only place `AD-9` (admin bundle never reaches a customer browser), `AD-20` (stock status never cached client-side) and the WCAG 2.1 AA floor are checkable at all. |
| `build` | `npm run build` | none — the glue layer is interpreted | `npm run build` in each workspace: two separate Vite builds (`AD-9`) plus the `apps/api` compile |

## Prerequisites

Required for a fresh clone to go green **today**, before any product code:

- **Node ≥ 24.15** — see the note below.
- **Python ≥ 3.10** with **PyYAML** (`scripts/lint.mjs` shells out to it).
- No network access.

Additionally required once feature `000-walking-skeleton` has landed:

- **Docker + Docker Compose.**
- **The `postgres` service from `ops/compose.yaml` running**, with migrations
  applied by `drizzle-kit migrate` (`architecture.md` AD-25). Integration and
  race tests run against **real PostgreSQL 18** — `architecture.md` AD-27
  forbids in-memory substitutes, because the central invariant lives in a
  `CHECK` constraint and in the affected-row count of a conditional `UPDATE`,
  neither of which a fake database reproduces.
- **`npx playwright install`** — downloads browsers, and **needs network the
  first time**. From that point on, "no network access needed" is no longer
  true of `regression`; it remains true of `test` and `lint`.

> **Node floor, and the gap on the current machine.**
> `>=24.15` is set in `package.json`. Two different floors feed it: NestJS 11
> needs Node ≥ 20.19 at **runtime**, while `@nestjs/schematics` needs
> ≥ 24.15 to **scaffold**. Agents scaffold, so the higher one governs.
> `docs/tooling-versions.md` records the machine at **24.13.0** — below the
> floor. npm will emit `EBADENGINE` warnings until that is upgraded. Upgrading
> Node is a prerequisite of feature 000, not of the freeze.

## Thresholds

- **Named-invariant tests are the real gate, not a percentage.**
  `architecture.md` AD-21 requires a test named for each of the four
  cross-cutting invariants in `prd.md` §8, plus the concurrency test addendum §7
  demands: N processes placing orders against stock M, exactly M succeed. A build
  with 95% line coverage and no concurrency test has not verified the product's
  central claim; a build with the concurrency test has.
- **Line coverage: 80% on `apps/api/src/modules/**`**, measured once the product
  half exists. No threshold on UI code, where coverage measures the wrong thing.
  *This number is a proposal from the architecture phase — the human who freezes
  the baseline owns it and may change it here.*
- **AD-28 constrains how those tests isolate.** Race tests run on committed
  state across independent connections and clean up by `TRUNCATE`; they must
  never use transaction-rollback isolation, which silently collapses N
  concurrent processes into one transaction and makes the test pass vacuously.

## Definition of done (all tracks)

1. Every command in the block above exits 0, and its output shows the product
   half **ran** rather than being skipped (once feature 000 has landed).
2. Every acceptance criterion in `specs/<feature>/spec.md` has an owning task
   in `tasks.md` (HV007b) and that task reports done.
3. Code quality review passed (`requesting-code-review`).
4. Final verification passed (`verification-before-completion`).
5. Track A/B only: `/speckit-converge` ran and produced no unaddressed tasks.
