# Codebase Context: 003-cart-and-wall

**Feature**: `003-cart-and-wall` (Track B) · **Baseline**: `baseline-0002-ecommerce` · **Budget**: ≤ 8 KB
Read-only map for subagents. Scope per task lives in `task-NNN-brief.md`, not here.

## 1. Stack (pinned, add nothing)

- Node 24.21 · TypeScript 5.9 · NestJS 11.2.5 · PostgreSQL 18.6 (`pg` pool, Drizzle for schema only).
- React 19.3 · Vite 8.3 · Zod 4.6.5.
- Jest in `apps/api`. Vitest in `apps/storefront` and `packages/*`. Playwright + axe in `e2e/`.
- Verification commands (verbatim): `npm test` · `npm run lint` · `npm run test:regression` · `npm run build`.

## 2. Invariants that must not break

1. **AD-17**: the Cart lives only in `localStorage` key `shop_cart` as `{v:1, lines:[{productId, quantity}]}`. There is no cart table, no `cart` module, and no price in the Cart. The server ignores any client price.
2. **AD-19 / ADR-0001**: no Stock number ever reaches the storefront. Cart lines use the enum `ok | exceeds_stock | out_of_stock | not_found`. The Stock comparison stays inside `stock.public.ts`.
3. **AD-20**: Stock status and line statuses are never cached at any tier.
   - Responses send `Cache-Control: no-store`.
   - Client `fetch` uses `cache: "no-store"` and keeps no module-scope state.
   - No react-query or SWR.
4. **AD-8**: no token, email or account id in `localStorage`. The session is the `shop_session` httpOnly cookie, owned by `identity`. Do not touch it.
5. **AD-5**: only `stock` reads the `stock` and `stock_ledger` tables. `catalog` calls `stock.public.ts`. Dependency arrow: `catalog → stock` only.
6. **AD-10**: every HTTP shape lives in `packages/shared/src/storefront/`. Controllers `.parse()` responses through `.strict()` schemas before returning.
7. **AD-29 CSP**: no inline script, no `eval`.
8. **FR-17**: every page before the Registration wall answers 200 without a session. No redirects.
9. **Existing `002` behaviour**: login and register without `returnTo` still `navigate("/")`.
10. **AD-28**: tests isolate with `TRUNCATE` on committed state. No transaction-rollback isolation.

## 3. Reuse, do not re-create

### `packages/shared` (`import { storefront } from "shared"`)

- `storefront/product.ts`:
  - `StockStatusSchema`: exactly two values. **Never extend it.** The cart enum is separate.
  - `ProductDetailSchema`, `ProductSummarySchema`: `.strict()`.
- `storefront/auth.ts`: `AccountSummary` with `role: "customer" | "shop_owner"`, and `CurrentUserResponse`.
- `common/error.ts`: the error envelope, used by `ErrorEnvelopeFilter` (a global `APP_FILTER` in `catalog.module.ts`).
- `storefront/index.ts` re-exports modules. Add `cart.js` there.

### `apps/api/src/modules/stock/`

- `stock.public.ts` → `getStockStatus(queryable, productId)`. This is the pattern for the new `getStockSufficiency`.
- `stock.repository.ts` → `readStockQuantity(queryable, id)`. Add `readStockQuantities` next to it (`ANY($1)`).
- `stock.contract.ts` → `StockUnitOfWork = Pick<PoolClient,'query'>`. A `pg.Pool` satisfies it.
- `stock-test-support.ts` → DB helpers for int-specs.

### `apps/api/src/modules/catalog/`

- `catalog.controller.ts`: the controller pattern. The `api/` prefix goes in `@Controller`, because there is no global prefix. Uses `@Header('Cache-Control','no-store')` and `Schema.parse(result)`.
- `catalog.service.ts`:
  - `CatalogService`, which injects `PG_POOL` and `ENV`;
  - `toImageUrlOrNull(diskPath)`, which maps a disk path to `/images/...` URL. Reuse it.
- `catalog.repository.ts`: raw SQL with `pool.query`. Primary image = `product_image` with the lowest `position`. `findProductById` is the model for `findProductsByIds`.
- `catalog.module.ts`: register new controllers in `controllers: [...]`.
- `catalog-test-support.ts` → `createTestApp()`, the real Nest app for int-specs. `catalog-response-assertions.ts` holds shared assertions.
- `product-not-found.exception.ts`: **do not use it** for cart lines. An unknown id is `lineStatus: "not_found"`, not a 404.

### `apps/storefront/src/`

- `api/client.ts`:
  - `fetchNoStore`, and the `FetchResult<T>` union `ok | not-found | error`;
  - validates responses with `safeParse`.
  - Copy this style for `cart-client.ts`, but with `POST` and a JSON body.
- `api/auth-client.ts` → `getCurrentUser()`, `logout()`. Logout must not touch the Cart.
- `router/router.ts`:
  - `Route` union, `parseRoute(pathAndQuery)`, `navigate(path)`;
  - query parsing done by hand with `URLSearchParams`.
- `router/usePathname.ts`: `useSyncExternalStore` pattern. Mirror it in `cart/useCart.ts`.
- `router/Link.tsx`: internal SPA link.
- `App.tsx`:
  - renders routes;
  - `announcementFor(route)` is an **exhaustive switch**, so every new route needs a case.
  - `AuthHeader` sits above all routes.
- `components/AuthHeader.tsx`: fetches the account on every `pathname` change and already branches on `shop_owner`. The Cart counter goes here.
- `pages/ProductDetailPage.tsx`: its header comment says "KHÔNG nút thêm vào giỏ". Update that comment when adding the button.
- `pages/LoginPage.tsx:42`, `RegisterPage.tsx:42`: `navigate("/")` after success. Cross-links at about line 175.
- `formatPrice.ts` → `formatPriceVnd(int)`.
- `test/catalogFixtures.ts`, `test/authFixtures.ts`: fixture patterns.

### `packages/ui`

- `StockStatusLabel`, `RouteAnnouncer` (message prop, live region), `tokens.ts`.
- Export new primitives from `index.ts`.

### `e2e/`

- `playwright.config.ts`: `baseURL` goes through the real Caddy proxy. **Do not edit.**
- `global-setup.ts`: runs the seed.
- `auth-journey.e2e-spec.ts`: register and login helpers to copy.
- `performance.e2e-spec.ts`: `p95()` nearest-rank, 30 navigations or 50 API calls. Keep the existing SC-003 blocks unchanged.

## 4. Seed data (`db/seed.ts`, read-only)

- 5 Products. Stock 50, 20, 35, **0** (one out-of-stock product), 15.
- One Shop owner, from `SHOP_OWNER_EMAIL` / `SHOP_OWNER_PASSWORD`.
- No Discontinued column exists until feature `009`.

## 5. Names (glossary + plan R6)

- **Glossary terms**: Cart, Cart line, Line subtotal, Stock, Stock status, Guest, Customer, Shop owner, Storefront, Registration wall, Place order.
- **Code names**: `CartPage` for `/cart`, `PlaceOrderPage` for `/place-order`, `RegistrationWall`, `CartLinesController` for `POST /api/cart-lines/status`, `cartStore`, `useCart`, `useCurrentAccount`, `safeReturnPath`, `QuantityStepper`, `CartLineStatusSchema`.
- **Forbidden**: "checkout", "basket", "inventory", "login wall", "paywall", "cart item", and any noun for "price × quantity" of one line.

## 6. Out of bounds for every task

- `db/**`: no migration. AD-17.
- `apps/api/src/modules/identity/**`: if the Cart breaks on login, STOP and report.
- `apps/backoffice/**`, `ops/**`, `docs/baseline/**`, `.specify/memory/**`.
- Existing schemas in `product.ts` and `auth.ts`.
