# Implementation Plan: Catalog Browse

**Branch**: `001-catalog-browse` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-catalog-browse/spec.md`

**Baseline**: `baseline-0001-ecommerce` — this plan derives from `docs/baseline/feature-map.md` row `001-catalog-browse`, PRD FR-1…FR-5 (refining spec requirements `FR-001` through `FR-024`), and architecture AD-11/AD-19/AD-20. It does not reopen the frozen Baseline.

## Summary

Complete the storefront catalog browse capability over the slice delivered by `000-walking-skeleton`: a public flat Category list with **Tất cả sản phẩm**, Category-scoped Product grids, accent-insensitive Product-name search, and paginated Product lists with default 24 / maximum 100 Products per page. Preserve Product detail, VND price display, out-of-stock visibility, exact Stock non-disclosure, fresh Stock status, security headers, and public Guest access from feature `000`.

Technical approach: extend the existing `catalog` read surface and shared storefront contract together, add append-only database support for Product-name search and Product-list performance where needed, keep catalog reads using the public Stock status seam rather than direct Stock table access, and update storefront state for Category navigation, search, pagination, empty states, and reloadable deep links. Track B impact analysis is captured in [impact-analysis.md](./impact-analysis.md).

## Technical Context

No `NEEDS CLARIFICATION` remains. Values are pinned by the frozen Baseline, current workspaces, and `docs/tooling-versions.md`.

**Language/Version**: TypeScript 5.9.x on Node.js 24.21.0 (effective floor `>=24.15`)

**Primary Dependencies**: NestJS 11.2.5 · React 19.3.0 · Vite 8.3.0 · `@vitejs/plugin-react` 6.1.1 · Drizzle ORM 0.45.2 / Drizzle Kit 0.31.10 · Zod 4.6.5 · Caddy 2.11.4

**Storage**: PostgreSQL 18.6 through the existing Docker Compose `postgres` service; schema changes must be append-only migrations applied by `drizzle-kit migrate`.

**Testing**: Jest 30.4.2 (`apps/api`) · Vitest 5.0.1 (`apps/storefront`, `packages/*`) · Playwright 1.62.1 + `@axe-core/playwright` (`e2e/`). Do not mix runners inside a directory.

**Target Platform**: One VPS, one Docker Compose deployment, one origin. Local dev and prod only; no staging.

**Project Type**: Modular monolith API + storefront SPA + shared schema packages.

**Performance Goals**: Product browse/search/detail readable within 400 ms p95 at the read boundary and usable page within 1.5 s p95 at 20,000 Products.

**Constraints**: Baseline supremacy; TDD; four-command verification contract only; canonical glossary; no exact Stock to Guest/Customer; Stock status never stale; no external search/cache service; no Product variants or hierarchical Category; no Product discontinuation lifecycle changes in this feature.

**Scale/Scope**: Y3 target 20,000 Products; flat Category only; all Products, one selected Category, or cross-Category Product-name search; Product list page size default 24 and max clamp 100.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result |
|---|---|---|
| **§I Baseline tối thượng** | Every requirement traces to PRD FR-1…FR-5, UX baseline, or existing `000` behaviour; no new product requirement | ✅ Spec and this plan derive from feature-map `001`, PRD FR-1…FR-5, AD-11/19/20, and UX browse/search/pagination details |
| **§II Test-First** | Tests must be planned before implementation; existing Stock invariant tests remain part of the gate | ✅ Plan requires characterization tests, catalog/search/pagination tests, UI tests, E2E/WCAG, and preservation of Stock invariant specs |
| **§III Verification contract** | Use exactly `npm test`, `npm run lint`, `npm run test:regression`, `npm run build` from `docs/baseline/verification.md` | ✅ No fifth command added; quickstart uses the four-command contract and setup prerequisites separately |
| **§IV Scope is contract** | Task scopes must respect module and artifact boundaries | ✅ Source structure identifies touched areas; future `tasks.md` must assign allowed/forbidden scope per task |
| **§V Closed vocabulary** | Use canonical Product, Category, Stock, Stock status, Guest, Customer, Shop owner | ✅ Plan/contracts/data model use canonical terms and avoid forbidden synonyms |
| **§VI Pinned versions** | No dist-tags or version drift | ✅ Technical Context uses pinned versions already recorded in Baseline/tooling/workspace files |

### Re-check after Phase 1 design

✅ No new violation introduced by `research.md`, `data-model.md`, `contracts/storefront-http.md`, or `quickstart.md`. Complexity Tracking remains empty: the design extends existing API/shared/storefront/catalog surfaces rather than adding a new service, new runtime dependency, or external search/cache system.

## Project Structure

### Documentation (this feature)

```text
specs/001-catalog-browse/
├── spec.md
├── impact-analysis.md      # Track B read-only codebase impact analysis
├── plan.md                 # This file
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output
├── quickstart.md           # Phase 1 output
├── contracts/
│   └── storefront-http.md  # Phase 1 storefront HTTP contract
├── checklists/
│   └── requirements.md
└── tasks.md                # Phase 2 output from /speckit-tasks, not created here
```

### Source Code (repository root)

```text
apps/
  api/
    src/
      modules/
        catalog/            # Extend public catalog reads: Category, search, pagination, Product detail preservation
        stock/              # Preserve public Stock status seam and invariant tests; do not bypass
  storefront/
    src/
      api/                  # Storefront catalog client schemas/requests
      components/           # Product card + Category/search/pagination UI pieces
      pages/                # Catalog home state and Product detail preservation
      router/               # Reloadable deep links and route announcements
packages/
  shared/
    src/
      storefront/           # Single source of truth for storefront schemas/types
      common/               # Existing error envelope
  ui/                       # Reused accessible primitives/design tokens
db/
  schema/                   # Existing catalog/Stock schema declarations
  migrations/               # Append-only migration(s) for search/list support if needed
e2e/                        # Storefront journey, regression, WCAG, security header coverage
ops/                        # Existing Caddy/Compose behaviour preserved
```

**Structure Decision**: keep the current modular-monolith structure from `000`. Extend `catalog`, `packages/shared`, `apps/storefront`, `db/migrations`, and `e2e` only as required by the feature. Do not add `apps/backoffice`, Cart/Auth/Order modules, Product write paths, external search services, or a new `usecases` layer for this feature.

## Complexity Tracking

No constitution violations require justification.
