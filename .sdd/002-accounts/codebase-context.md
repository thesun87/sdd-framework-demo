# Codebase Context: 002-accounts

**Feature**: `002-accounts` (Track B brownfield feature)  
**Budget**: $\le 8\text{ KB}$

---

## 1. System Architecture & Tech Stack

- **Pattern**: Modular monolith API (`apps/api`) + React SPA storefront (`apps/storefront`) + shared schema packages (`packages/shared`, `packages/ui`).
- **Runtime**: Node.js 24.21.0, TypeScript 5.9.x.
- **Backend**: NestJS 11.2.5, PostgreSQL 18.6 with Drizzle ORM 0.45.2.
- **Frontend**: React 19.3.0, Vite 8.3.0, Vanilla CSS, accessible HTML5 (WCAG 2.1 AA).
- **Validation**: Zod 4.6.5 across shared packages and HTTP boundaries.
- **Testing**: Jest 30.4.2 (`apps/api`), Vitest 5.0.1 (`apps/storefront`, `packages/*`), Playwright 1.62.1 (`e2e/`).

---

## 2. Protected Baseline Invariants (Must NOT Break)

1. **Email is Identifier Only (AD-6)**:
   - Email is strictly a login identifier.
   - Absolutely NO email/SMS delivery libraries (no nodemailer, no SMTP client) in `package.json` or code.
2. **Server-side Sessions in PostgreSQL (AD-8)**:
   - Session tokens are stored in PostgreSQL table `session`.
   - Issued via `httpOnly; SameSite=Lax; Path=/` cookie named `shop_session`.
   - NO authentication tokens may be stored in `localStorage` or `sessionStorage`.
3. **Module Boundaries as Data Boundaries (AD-5)**:
   - The new `identity` module owns `account`, `session`, `failed_login_attempt`.
   - No other module may directly query or modify identity tables.
4. **Runtime Dependency Discipline (AD-16)**:
   - Runtime relies ONLY on PostgreSQL and local filesystem; NO Redis or external broker.
5. **Exact Stock Non-disclosure (AD-19, AD-20)**:
   - Numerical stock quantity must never leave the server; stock status remains textual.
6. **Public Guest Access**:
   - Guest catalog browsing, searching, and detail viewing must never be blocked by authentication guards.

---

## 3. Existing Modules & Reusable Assets

### `apps/api`
- `src/app.module.ts`: Root module importing feature modules.
- `src/modules/catalog/`:
  - `catalog.controller.ts`, `categories.controller.ts`, `health.controller.ts`.
  - `catalog-test-support.ts`: `createTestApp()` initializes the real NestJS test application.
- `src/modules/stock/`:
  - Invariant tests for stock ledger and concurrency (`stock-never-negative.int-spec.ts`).

### `packages/shared`
- `src/storefront/product.ts`: Product and Category schemas.
- `src/config/env.ts`: `loadEnv(process.env)` schema validation.
- `src/common/error.ts`: Standard error envelope helpers.

### `apps/storefront`
- `src/router/router.ts`: Lightweight SPA client-side router.
- `src/api/client.ts`: API client pattern using shared Zod schemas.
- `src/App.tsx`: Root component hosting navigation and pages.

### `db/`
- `schema/catalog.ts` & `schema/stock.ts`: Existing Drizzle tables.
- `seed.ts`: Idempotent database seed script.

---

## 4. Feature 002 Additions & Scope Boundaries

### Allowed Scope:
- `apps/api/src/modules/identity/**`: Identity module, controller, service, repository, `scrypt` password hasher, and auth guard.
- `apps/api/src/app.module.ts`: Import `IdentityModule`.
- `packages/shared/src/storefront/auth.ts`: Zod schemas for auth requests and responses.
- `packages/shared/src/storefront/index.ts` & `packages/shared/src/index.ts`: Re-exports.
- `db/schema/identity.ts`: Tables for `account`, `session`, `failed_login_attempt`.
- `db/migrations/**`: Drizzle migration for identity tables.
- `db/seed.ts`: Pre-seeding single Shop owner account.
- `apps/storefront/src/api/auth-client.ts`: Auth HTTP client.
- `apps/storefront/src/pages/RegisterPage.tsx`, `LoginPage.tsx`: Customer auth forms.
- `apps/storefront/src/components/AuthHeader.tsx`: Storefront header auth controls.
- `e2e/auth-journey.e2e-spec.ts`: E2E auth tests.

### Forbidden Scope:
- `docs/baseline/**`: Protected baseline documents.
- `.specify/memory/constitution.md`: Governance file.
- Cart, Checkout, or Order placement code (deferred to `003-cart-and-wall` and `004-place-order`).
- Customer password reset by Shop owner (deferred to `011-password-reset`).
