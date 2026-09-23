# Implementation Plan: Accounts & Authentication

**Branch**: `002-accounts` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-accounts/spec.md`

**Baseline**: `baseline-0001-ecommerce` — this plan derives from `docs/baseline/feature-map.md` row `002-accounts`, PRD §4.4 FR-9, FR-10, FR-33, and architecture decisions AD-5, AD-6, AD-8, AD-10, AD-16. It does not reopen the frozen Baseline.

## Summary

Deliver the Customer and Shop owner authentication capability for Shop Online: Customer self-registration with email and password (FR-9), authentication and session management in PostgreSQL with `httpOnly; SameSite=Lax` cookies (FR-10, AD-8), sliding 30-day idle and 90-day absolute session expiration, brute-force login rate limiting (10 attempts / 15 minutes) tracked in PostgreSQL (FR-10, AD-16), secure password hashing using Node.js built-in `scrypt`, immediate session revocation upon logout, and pre-seeding the single Shop owner account (FR-33). Preserve public Guest browsing, catalog/stock invariant tests, security headers, and single-origin architecture. Track B impact analysis is captured in [impact-analysis.md](./impact-analysis.md).

## Technical Context

No `NEEDS CLARIFICATION` remains. Values are pinned by the frozen Baseline, current workspaces, and `docs/tooling-versions.md`.

**Language/Version**: TypeScript 5.9.x on Node.js 24.21.0 (effective floor `>=24.15`)

**Primary Dependencies**: NestJS 11.2.5 · React 19.3.0 · Vite 8.3.0 · `@vitejs/plugin-react` 6.1.1 · Drizzle ORM 0.45.2 / Drizzle Kit 0.31.10 · Zod 4.6.5 · Caddy 2.11.4

**Storage**: PostgreSQL 18.6 through the existing Docker Compose `postgres` service; schema changes must be append-only migrations applied by `drizzle-kit migrate`.

**Testing**: Jest 30.4.2 (`apps/api`) · Vitest 5.0.1 (`apps/storefront`, `packages/*`) · Playwright 1.62.1 + `@axe-core/playwright` (`e2e/`). Do not mix runners inside a directory.

**Target Platform**: One VPS, one Docker Compose deployment, one origin. Local dev and prod only; no staging.

**Project Type**: Modular monolith API + storefront SPA + shared schema packages.

**Performance Goals**: Authentication read/write latency p95 ≤ 200 ms; password hashing using `scrypt` balanced for security without CPU starvation; page usability p95 ≤ 1.5 s.

**Constraints**: Baseline supremacy; TDD; four-command verification contract only; canonical glossary (Guest, Customer, Shop owner); no email/SMS delivery libraries (AD-6); server-side sessions in PostgreSQL only (AD-8, AD-16); no tokens in browser Web Storage; no back-office registration of shop owners (FR-33).

**Scale/Scope**: Single Shop owner; scalable Customer accounts; 10 attempts / 15 min rate limit per identifier.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result |
|---|---|---|
| **§I Baseline tối thượng** | Every requirement traces to PRD FR-9, FR-10, FR-33, or architecture decisions; no new product requirement | ✅ Spec and plan derive strictly from feature-map `002-accounts`, PRD §4.4, AD-5/6/8/10/16 |
| **§II Test-First** | Tests must be planned before implementation; existing invariant tests remain intact | ✅ Plan requires unit tests, API integration tests, and E2E journeys before code changes |
| **§III Verification contract** | Use exactly `npm test`, `npm run lint`, `npm run test:regression`, `npm run build` | ✅ No extra commands added; verification contract honored |
| **§IV Scope is contract** | Task scopes must respect module and artifact boundaries | ✅ `identity` module owns accounts and sessions; `catalog` and `stock` remain untouched except public auth consumers |
| **§V Closed vocabulary** | Use canonical Guest, Customer, Shop owner | ✅ Plan and contracts use canonical terms only |
| **§VI Pinned versions** | No dist-tags or version drift | ✅ Uses existing pinned dependencies |

### Re-check after Phase 1 design

✅ No new violation introduced by `research.md`, `data-model.md`, `contracts/storefront-http.md`, or `quickstart.md`. The design adheres strictly to the modular monolith architecture (`apps/api/src/modules/identity/`), server-side sessions in PostgreSQL (`AD-8`), email as identifier only (`AD-6`), and four-command verification.

## Project Structure

### Documentation (this feature)

```text
specs/002-accounts/
├── spec.md                 # Feature specification
├── impact-analysis.md      # Track B read-only codebase impact analysis
├── plan.md                 # This file (/speckit-plan output)
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output
├── quickstart.md           # Phase 1 output
├── contracts/
│   └── storefront-http.md  # Phase 1 storefront HTTP contract
└── tasks.md                # Phase 2 output from /speckit-tasks
```

### Source Code (repository root)

```text
apps/
  api/
    src/
      modules/
        identity/           # New: accounts, password hashing, sessions, rate limiting
          identity.module.ts
          identity.controller.ts
          identity.service.ts
          identity.repository.ts
          password-hasher.ts
          auth.guard.ts
  storefront/
    src/
      api/
        auth-client.ts      # Storefront auth API client
      components/
        AuthHeader.tsx      # Login/Register/Logout UI in header
      pages/
        LoginPage.tsx       # Login form
        RegisterPage.tsx    # Customer registration form
packages/
  shared/
    src/
      storefront/
        auth.ts             # Auth request/response Zod schemas and TypeScript types
db/
  schema/
    identity.ts             # Account, Session, FailedLoginAttempt schemas
  migrations/               # Drizzle migration for identity tables
  seed.ts                   # Seed single Shop owner account
e2e/
  auth-journey.e2e-spec.ts  # End-to-end registration, login, logout, and rate limiting journeys
```
