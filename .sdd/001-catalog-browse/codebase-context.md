# Codebase Context: 001-catalog-browse

**Feature**: `001-catalog-browse` (Track B brownfield feature)  
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

1. **Exact Stock Non-disclosure (AD-19, FR-020)**:
   - Exact numerical `stock.quantity` MUST NEVER leave the server or be exposed to Guest/Customer.
   - Public schemas (`packages/shared/src/storefront/product.ts`) enforce `.strict()` to reject `quantity`.
   - Only `StockStatus` ("in_stock" / "Còn hàng" or "out_of_stock" / "Hết hàng") is public.
2. **Fresh Stock Status (AD-20, FR-021)**:
   - Stock status is read fresh for newly loaded lists and detail. `Cache-Control: no-store` is applied.
   - Products with `quantity = 0` remain visible in browse, search, and detail (FR-022).
3. **Price Invariant (FR-017)**:
   - Non-negative integer VND, VAT inclusive, no decimal amount, no separate tax line.
4. **Public Guest Access (FR-001, FR-002, FR-024)**:
   - No login redirects or auth guards on storefront catalog browse/search/detail.
5. **No Stock Table Leaks**:
   - Catalog service reads stock status via the public seam, not by joining raw stock ledger internals.

---

## 3. Existing Modules & Reusable Assets

### `apps/api`
- `src/modules/catalog/`:
  - `catalog.controller.ts`: `GET /api/products`, `GET /api/products/:id`.
  - `catalog.service.ts`: Composes product summaries/details with stock status seam.
  - `catalog.repository.ts`: Drizzle queries over `product`, `category`, `product_image`.
  - `catalog-test-support.ts`: `createTestApp()` initializes real Nest application.
  - `catalog-response-assertions.ts`: Verifies strict response shapes and absence of stock fields.
- `src/modules/stock/`:
  - `stock-test-support.ts`: `createTestPool()`, `truncateAllTables()`, `seedProduct()`, `seedStock()`.

### `packages/shared`
- `src/storefront/product.ts`:
  - `StockStatusSchema`, `ProductSummarySchema`, `ProductImageSchema`, `ProductDetailSchema`, `ProductsListResponseSchema`.
- `src/config/env.ts`:
  - `loadEnv(process.env)` validates `DATABASE_URL`, `API_PORT`, `NODE_ENV`, `PRODUCT_IMAGE_PATH`.

### `apps/storefront`
- `src/api/client.ts`: `fetchProducts()`, `fetchProduct(id)`. Validates responses against shared Zod schemas.
- `src/components/ProductCard.tsx`: Displays product card, VND price, and `StockStatusLabel`.
- `src/pages/HomePage.tsx`: Storefront catalog home page (grid view).
- `src/pages/ProductDetailPage.tsx`: Product detail view.
- `src/router/router.ts`: Lightweight SPA hash/path router.

### `db/`
- `schema/catalog.ts`: `category`, `product`, `product_image` table definitions.
- `schema/stock.ts`: `stock`, `stock_ledger` table definitions.
- `seed.ts`: Idempotent seed script.

---

## 4. Feature 001 Additions & Scope Boundaries

- **Allowed Scope**:
  - Extend `db/seed.ts` with multi-category & Vietnamese accent fixtures (T001).
  - Add API fixture helpers in `catalog-test-support.ts` (T002).
  - Add storefront test factories in `catalogFixtures.ts` (T003).
  - Extend E2E seed expectations (T004).
  - Add `CategorySummary`, `ProductListQuery`, `Pagination` schemas (T005, T006).
  - Add browse/search indices in `db/schema/catalog.ts` and migrations (T007).
  - Add `catalog-query.ts` parsing logic with default 24 / max 100 clamp (T008, T009).
  - Add router tests (T010).
  - Later stories: `categories.controller.ts`, accent-insensitive search, pagination.
- **Forbidden Scope**:
  - Do NOT modify `docs/baseline/**` or `.specify/memory/constitution.md`.
  - Do NOT introduce product variants, hierarchical categories, fuzzy search, or external search/cache engines (Elasticsearch, Redis).
  - Do NOT alter stock ledger write invariants or concurrency rules.
