---

description: "Task list for 003-cart-and-wall"
---

# Tasks: Cart & Registration Wall

**Input**: Design documents from `specs/003-cart-and-wall/`
**Traceability**: Implements `FR-001` through `FR-021` and every acceptance scenario of `spec.md` (see *Acceptance ownership*, HV007b).

**Prerequisites**: `plan.md`, `spec.md`, `impact-analysis.md`, `research.md`, `data-model.md`, `contracts/storefront-http.md`, `quickstart.md`

**Tests**: Required. Constitution §II: every task writes its tests **first**, runs them and sees them fail for the missing behaviour, then implements. A task is not done until its tests pass **and** the four verification commands exit 0.

**Organization**: 15 tasks, which is the `feature-map.md` ceiling. Grouped by user story. Track B execution uses `.sdd/003-cart-and-wall/task-NNN-brief.md` for exact allowed/forbidden scope and the "Must not break" list from `impact-analysis.md` §5–§6.

**Global forbidden scope (every task)**: `db/**`, `apps/api/src/modules/identity/**`, `apps/backoffice/**`, `ops/**`, `docs/baseline/**`, `.specify/memory/**`, existing schemas in `packages/shared/src/storefront/product.ts` and `auth.ts`.

**Naming (R6, approved 2026-09-23)**: `RegistrationWall`, `PlaceOrderPage` + `/place-order`, `CartPage` + `/cart`. Never "checkout", "login wall", "paywall", "basket", "inventory".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase: different files, no dependency on incomplete tasks
- **[Story]**: User story label (`US1` … `US6`)

---

## Phase 1: Setup

No setup task. The workspaces, runners, proxy and SPA fallback already exist (`plan.md` §Technical Context), and no dependency is added.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared contract, the Stock comparison and the browser Cart store. Every user story builds on these three.

**⚠️ CRITICAL**: No user story task starts until T001–T003 are complete.

- [ ] T001 [P] Write failing tests in `packages/shared/src/storefront/cart.test.ts`, then implement `packages/shared/src/storefront/cart.ts` and re-export it from `packages/shared/src/storefront/index.ts`. Schemas (`contracts/storefront-http.md` §1, `data-model.md` §1–§2):
  - `CartLineSchema`: `productId` "số nguyên > 0", `quantity` "số nguyên, 1 … 9 999";
  - `CartLineStatusSchema = z.enum(["ok", "exceeds_stock", "out_of_stock", "not_found"])`, a separate enum that must **not** touch `StockStatusSchema`;
  - `CartLinesStatusRequestSchema`: `lines` "0 tới 100 phần tử", duplicate `productId` rejected, unknown fields **stripped** (a `price` field is dropped, not rejected);
  - `CartLinesStatusResponseSchema`: `.strict()` at every level, `product` is `null` iff `lineStatus = "not_found"`, `product = { name, price (int VND ≥ 0), imagePath (string | null) }`;
  - `StoredCartSchema`: `{ v: 1, lines: CartLine[] }`, `.strict()`.

  Tests must prove:
  - a response carrying any numeric stock field (e.g. `quantity`, `availableQuantity`, `stock`) fails to parse;
  - a request carrying `price` parses with `price` removed;
  - `quantity` values 0, -1, 1.5 and 10000 are rejected.

  (FR-001, FR-007, FR-012, FR-020)
- [ ] T002 [P] Write failing tests in `apps/api/src/modules/stock/stock-sufficiency.int-spec.ts` (real PostgreSQL, `TRUNCATE` isolation per AD-28), then add `readStockQuantities(queryable, productIds)` to `apps/api/src/modules/stock/stock.repository.ts` and `getStockSufficiency(queryable, lines)` to `apps/api/src/modules/stock/stock.public.ts`.
  - The repository function uses one `SELECT product_id, quantity FROM stock WHERE product_id = ANY($1)`.
  - `getStockSufficiency` returns `Map<productId, 'sufficient' | 'insufficient' | 'out_of_stock'>` with these rules:
    - S ≥ Q → `sufficient`;
    - 0 < S < Q → `insufficient`;
    - S = 0 or no `stock` row → `out_of_stock`.
  - The exported return type must contain no number (research R2).
  - Tests cover all three values, a product with no `stock` row, 20 products answered by a single query, and that neither `stock.quantity` nor the `stock_ledger` row count changes.

  (FR-007, FR-011, AD-5, AD-19)
- [ ] T003 [P] Write failing tests in `apps/storefront/src/cart/cartStore.test.ts`, then implement `apps/storefront/src/cart/cartStore.ts` and `apps/storefront/src/cart/useCart.ts`. The store is the **only** code that touches `localStorage` key `shop_cart` (`data-model.md` §1, research R4).
  - **Operations**: `add`, `setQuantity`, `remove`, `dropUnknown`, `totalQuantity`, `subscribe`, `getSnapshot`. Every mutation re-reads storage, applies the change, writes, then notifies (FR-021). Cross-tab changes are delivered through the `storage` event, same-tab changes through an internal listener. `useCart` uses `useSyncExternalStore`.
  - **Tests must cover**:
    - add merges into the existing line and never creates a duplicate (FR-003);
    - `setQuantity(0)` removes the line; -1, 1.5 and 10000 are rejected and the Cart is left unchanged (FR-004);
    - a quantity above Stock is accepted, since the store never knows Stock (FR-005);
    - the read-repair table of `data-model.md` §1 — garbage JSON, `v ≠ 1`, invalid lines, duplicate lines merged and clamped at 9 999;
    - a `localStorage` that throws puts the store in the `unavailable` state;
    - a simulated `storage` event from another tab updates subscribers;
    - a write made after another tab changed storage starts from the new value, not a stale copy;
    - the serialized value contains only `v`, `productId`, `quantity` — no price, email, account id or token (FR-001, FR-020).

  (FR-001, FR-003, FR-004, FR-005, FR-020, FR-021, Edge Cases)

**Checkpoint**: contract, Stock comparison and Cart store are ready.

---

## Phase 3: User Story 1 — Guest adds Products to a Cart that lives in the browser (P1) 🎯 MVP

**Goal**: A Guest adds a Product from its detail page, sees the header counter rise, and opens a Giỏ hàng showing current prices and the Line subtotal. No server write happens anywhere.

**Independent Test**: As a Guest, add two Products (one twice), reload, open `/cart`. Expect two lines, quantity 2 on the repeated one, Line subtotal = Σ(current price × quantity), no shipping fee, and Stock unchanged.

- [ ] T004 [US1] Write failing tests first, then implement `POST /api/cart-lines/status`.
  - **Tests**, as three int-spec files in `apps/api/src/modules/catalog/`:
    - `cart-lines-status.int-spec.ts`:
      - the three stock-derived statuses plus `not_found`, in request order;
      - price comes from the DB even when the request sends a different `price` (US3-6);
      - a price changed in the DB is reflected on the next call (US1-6);
      - `Cache-Control: no-store`;
      - `400` for more than 100 lines, a duplicate `productId`, quantity 0, -1, 1.5 or 10000, a missing `lines`, and a non-JSON body;
      - `lines: []` returns `{ "lines": [] }`;
      - a Guest with no session cookie gets `200`;
      - no stack trace appears in error bodies.
    - `cart-lines-status-no-stock-number.int-spec.ts` (AD-19 named invariant): for products with Stock 0, 1, 3 and 50, walk every key and value of the response and assert no stock number or stock-quantity key appears.
    - `cart-does-not-reserve-stock.int-spec.ts` (PRD FR-7 named invariant): record `stock.quantity` and the `stock_ledger` count, call the endpoint many times with Q > S, Q = S and Q < S, then assert both are unchanged. Also assert two **sequential** calls for a product with S = 1 and Q = 1 both return `ok` — adding to a Cart is client-only, so US1-8 needs no server concurrency and no `*.race-spec.ts` (US1-7, US1-8).
  - **Implementation**:
    - `apps/api/src/modules/catalog/cart-lines.controller.ts`: `@Controller('api/cart-lines')`, `@Post('status')`, `@HttpCode(200)`, `@Header('Cache-Control', 'no-store')`, request parsed by `CartLinesStatusRequestSchema`, response passed through `CartLinesStatusResponseSchema.parse()` before return.
    - `CatalogService.getCartLineStatuses` in `apps/api/src/modules/catalog/catalog.service.ts`: maps `sufficient → ok`, `insufficient → exceeds_stock`, `out_of_stock → out_of_stock`, adds `not_found`, and reuses `toImageUrlOrNull`.
    - `findProductsByIds` in `apps/api/src/modules/catalog/catalog.repository.ts`: one query returning id, name, price and primary image path by lowest `position`.
    - Register the controller in `apps/api/src/modules/catalog/catalog.module.ts`.
    - Exactly two queries per request (research R9).

  (FR-006, FR-007, FR-008, FR-011, FR-012; US1-6, US1-7, US1-8, US3-6)
- [ ] T005 [P] [US1] Write failing tests in `apps/storefront/src/api/cart-client.test.ts`, then implement `apps/storefront/src/api/cart-client.ts` and `apps/storefront/src/api/useCurrentAccount.ts`.
  - `fetchCartLineStatuses(lines)` sends `POST /api/cart-lines/status` with `cache: "no-store"` and `credentials: "same-origin"`, validates the response with `CartLinesStatusResponseSchema`, returns the `FetchResult` union of `api/client.ts`, and keeps nothing in module scope (AD-20).
  - `useCurrentAccount()` wraps `getCurrentUser()` and re-runs on every `pathname` change, returning `loading | guest | customer | shop_owner` (research R7).
  - Tests must prove:
    - two consecutive calls hit the network twice and return the two different mocked results;
    - the request body never contains `price`;
    - network and schema failures map to `kind: "error"`.

  (FR-008, FR-012, FR-018)
- [ ] T006 [US1] Write failing tests, then implement the Add-to-Cart button and the header counter.
  - **Files**:
    - `apps/storefront/src/components/AddToCartButton.tsx` + `AddToCartButton.test.tsx`;
    - `apps/storefront/src/components/CartIconLink.tsx` + `CartIconLink.test.tsx`;
    - modify `apps/storefront/src/components/AuthHeader.tsx` + `AuthHeader.test.tsx`;
    - modify `apps/storefront/src/pages/ProductDetailPage.tsx` + `ProductDetailPage.test.tsx`.
  - **Behaviour**:
    - The button calls `cartStore.add` and does not navigate.
    - When `stockStatus = "out_of_stock"` the button is disabled with "Sản phẩm này đang hết hàng." next to it.
    - An `aria-live="polite"` message "Đã thêm vào giỏ hàng." is announced.
    - The counter shows `totalQuantity()` from the store, makes **no API call**, and links to `/cart`.
    - The button and the counter are **absent** while the account is `loading` or `shop_owner`.
    - Every control is at least 44×44 px.
    - `ProductDetailPage`'s existing comment "KHÔNG nút thêm vào giỏ" is updated to reflect this feature.
  - Existing `AuthHeader` and `ProductDetailPage` tests must keep passing.

  (FR-002, FR-003, FR-018; US1-1, US1-2, US1-3, US6-1, US6-2)
- [ ] T007 [US1] Write failing tests, then implement the Giỏ hàng display and its route.
  - **Files**:
    - `apps/storefront/src/pages/CartPage.tsx` + `CartPage.test.tsx`, display only in this task;
    - `apps/storefront/src/test/cartFixtures.ts`;
    - add route `{ type: "cart" }` for `/cart` to `apps/storefront/src/router/router.ts` + `router.test.ts`;
    - render it and add "Đã chuyển đến trang giỏ hàng." to `announcementFor()` in `apps/storefront/src/App.tsx` + `App.test.tsx`.
  - **Behaviour**:
    - On every mount and every Cart change, call `fetchCartLineStatuses`.
    - Call `cartStore.dropUnknown` for `not_found` lines.
    - Render each line with name, primary image, current price and price × quantity (no new noun for this value — glossary has only *Line subtotal*), then the Line subtotal as Σ(price × quantity) in integer VND via `formatPrice.ts`.
    - **No** shipping fee line.
    - An empty Cart shows "Giỏ hàng của bạn đang trống." with a link to `/`.
    - A store in the `unavailable` state shows "Không lưu được giỏ hàng trên trình duyệt này."
    - The page answers without a session.
    - In a Shop owner session the page shows only "Tài khoản chủ shop không đặt đơn được." and leaves the stored Cart untouched (FR-018).
  - Tests must include "a Cart persisted in storage renders the same lines after remount" (reload) and "a price change between two mounts shows the new price".

  (FR-001, FR-006, FR-017, FR-018; US1-4, US1-5, US1-6, US1-9)

**Checkpoint**: US1 is demonstrable end to end.

---

## Phase 4: User Story 2 — Guest or Customer edits Cart lines (P1)

**Goal**: Change a quantity in place, and remove lines without a dialog.

**Independent Test**: Cart A, B. Set A = 3 and B = 0, then try -1 and 1.5 on A. Expect A = 3, B gone, both invalid values rejected.

- [ ] T008 [US2] Write failing tests, then implement quantity editing.
  - **`packages/ui/src/QuantityStepper.tsx`** + `QuantityStepper.test.tsx`, exported from `packages/ui/src/index.ts`:
    - − and + buttons plus a numeric input, **each at least 44×44 px**;
    - accessible names "Giảm số lượng {tên}" and "Tăng số lượng {tên}";
    - the value is committed on blur, on Enter, or on a button press;
    - an invalid value (negative, non-integer, > 9 999) shows its message directly under the input, linked by `aria-describedby`. Messages: "Số lượng phải là số nguyên không âm." and "Số lượng quá lớn.";
    - after an invalid value the input reverts to the last valid quantity.
  - **Wire into `apps/storefront/src/pages/CartPage.tsx`** + `CartPage.test.tsx`:
    - `setQuantity(0)` removes the line;
    - a **Xoá** button per line removes it with no confirmation dialog;
    - a quantity above Stock is accepted;
    - each change triggers a re-check through `fetchCartLineStatuses`;
    - `aria-live="polite"` announces "Đã cập nhật số lượng {tên}." and "Đã xoá {tên} khỏi giỏ hàng."

  (FR-004, FR-005; US2-1, US2-2, US2-3, US2-4, US2-5)

**Checkpoint**: US1 + US2 work together.

---

## Phase 5: User Story 3 — Cart flags lines that cannot currently be bought (P1)

**Goal**: Show per-line flags with no Stock number, and make **Đặt đơn** conditional.

**Independent Test**: Stock A = 3, B = 0. Cart A × 5, B × 1. Expect two flags with no number and **Đặt đơn** disabled with a reason. Fix both lines and expect **Đặt đơn** enabled.

- [ ] T009 [US3] Write failing tests in `apps/storefront/src/pages/CartPage.test.tsx`, then implement line flags and the **Đặt đơn** control in `apps/storefront/src/pages/CartPage.tsx`.
  - **Flag messages**:
    - `exceeds_stock` → "Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn." (interim copy, `contracts/storefront-http.md` §3);
    - `out_of_stock` → "Sản phẩm này đang hết hàng.".
  - Flagged lines stay visible and are never auto-corrected or auto-removed.
  - **Đặt đơn** is a link to `/place-order`. It is enabled **iff** the Cart is non-empty, the last check succeeded, and every line is `ok`. Otherwise it is disabled, with the matching reason from `data-model.md` §3 shown in text next to it:
    - "Bạn sửa các dòng được đánh dấu để đặt đơn.";
    - "Giỏ hàng của bạn đang trống.";
    - "Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang.".
  - A failed check leaves the lines as stored and does not flag or unflag anything from stale data.
  - `aria-live` announces flags appearing or clearing after a re-check.
  - Tests must assert that **no digit taken from Stock** appears in the rendered page. Use fixture Stock values that differ from every quantity and price.

  (FR-007, FR-008, FR-009, FR-010; US3-1, US3-2, US3-3, US3-4, US3-5)

**Checkpoint**: US1–US3 work together. The Giỏ hàng is complete.

---

## Phase 6: User Story 4 — Cart survives registration, login and logout (P1)

**Goal**: Identity changes never touch the Cart.

**Independent Test**: Guest Cart A × 2, B × 1. Register, log out, log in. The Cart is identical after each step.

- [ ] T010 [US4] Write `e2e/cart-journey.e2e-spec.ts`. This task creates the file. It runs against the real proxy and seed and covers:
  - (a) Guest adds A × 2 and B × 1, then reloads: Cart unchanged (US1-4);
  - (b) registers a new Customer: Cart unchanged (US4-1);
  - (c) logs out: Cart unchanged (US4-3);
  - (d) logs in: Cart unchanged (US4-2);
  - (e) a failed login followed by a return to `/cart`: Cart unchanged (US4-4);
  - (f) `localStorage.shop_cart` is inspected after each step: only `v`, `productId`, `quantity`, and no email or token (FR-020).

  If any step fails, the fix belongs in `cartStore.ts` or the component that cleared the Cart. **Never** in `apps/api/src/modules/identity/**` (forbidden scope). If identity code is the cause, STOP and report.

  (FR-013, FR-020; US4-1, US4-2, US4-3, US4-4)

**Checkpoint**: FR-8 is proven in a real browser.

---

## Phase 7: User Story 5 — Guest meets the Tường đăng ký and returns to Đặt đơn (P1)

**Goal**: Guest sees the wall, registers or logs in, and returns to Đặt đơn. A Customer goes straight to Đặt đơn.

**Independent Test**: Guest presses **Đặt đơn**, sees the wall, registers, and lands on the Đặt đơn page with the Cart intact. A Customer pressing **Đặt đơn** sees no wall.

- [ ] T011 [P] [US5] Write failing tests in `apps/storefront/src/router/safeReturnPath.test.ts` and `router.test.ts`, then implement `apps/storefront/src/router/safeReturnPath.ts` and extend `apps/storefront/src/router/router.ts`.
  - **`safeReturnPath` accepts only** a value that starts with exactly one `/`, does not start with `//` or `/\`, contains no control characters, and resolves to the same origin (research R5).
  - **Rejection table in the test**: `//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:alert(1)`, `""`, `"/\u0000x"`.
  - **Router additions**:
    - `{ type: "place-order" }` for `/place-order`;
    - `returnTo` parsed on `{ type: "login"; returnTo?: string }` and `{ type: "register"; returnTo?: string }` through `safeReturnPath`.
  - Existing router tests must keep passing unchanged.

  (FR-016; US5-6)
- [ ] T012 [US5] Write failing tests in `apps/storefront/src/pages/LoginPage.test.tsx` and `RegisterPage.test.tsx`, then modify `apps/storefront/src/pages/LoginPage.tsx`, `RegisterPage.tsx` and the `login`/`register` branches of `apps/storefront/src/App.tsx`.
  - A successful submit calls `navigate(returnTo ?? "/")`. The default stays `/`, so the existing `002` behaviour and tests are unchanged.
  - The cross-links "Đăng ký" and "Đăng nhập" carry `returnTo` when present.
  - A failed submit leaves the Cart untouched.
  - Registration still establishes the session immediately, with no second login.

  (FR-013, FR-015, FR-016; US5-2, US5-3, US5-6)
- [ ] T013 [US5] Write failing tests, then implement the Đặt đơn route.
  - **Files**:
    - `apps/storefront/src/pages/PlaceOrderPage.tsx` + `PlaceOrderPage.test.tsx`;
    - `apps/storefront/src/components/RegistrationWall.tsx` + `RegistrationWall.test.tsx`;
    - render `place-order` and add announcements to `announcementFor()` in `apps/storefront/src/App.tsx` + `App.test.tsx`: "Đã chuyển đến trang đặt đơn." (Customer) and "Bạn cần một tài khoản để đặt đơn." (Guest).
  - **`useCurrentAccount()` decides what the page shows**:
    - **Guest** → `RegistrationWall` with exactly "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên." and two links, **Đăng ký** → `/register?returnTo=/place-order` and **Đăng nhập** → `/login?returnTo=/place-order`. No form, no error styling, HTTP 200.
    - **Customer** → page titled "Đặt đơn" with the Cart summary (lines, current prices, Line subtotal from `fetchCartLineStatuses`) and "Chức năng đặt đơn chưa sẵn sàng." Lines are flagged exactly as in the Giỏ hàng; an empty Cart shows "Giỏ hàng của bạn đang trống." with a link to `/`. It has no address or payment field and no submit control.
    - **Shop owner** → "Tài khoản chủ shop không đặt đơn được."
  - Leaving the wall does not change the Cart.

  (FR-014, FR-015, FR-017, FR-018, FR-019; US5-1, US5-4, US5-5, US5-7, US5-8, US6-3)

**Checkpoint**: FR-11 complete; US6 complete (T006 + T013).

---

## Phase 8: User Story 6 — Shop owner has no Cart on the Trang bán hàng (P2)

Covered by **T006** (US6-1, US6-2) and **T013** (US6-3), and proven in a browser by **T014**. No separate task: splitting would create a task with no behaviour of its own, and the feature is at the 15-task ceiling.

---

## Phase 9: Polish & Cross-Cutting

- [ ] T014 Extend `e2e/cart-journey.e2e-spec.ts` (created by T010). It must run after T006–T013.
  - **Journeys**:
    - UJ-1: Guest → detail → add → `/cart` → **Đặt đơn** → wall → **Đăng ký** → Đặt đơn page with the Cart intact (US5-1, US5-2);
    - the same through **Đăng nhập** (US5-3);
    - a logged-in Customer goes directly to Đặt đơn (US5-4);
    - a Guest opening `/place-order` directly sees the wall (US5-5).
  - **Security**: `/login?returnTo=//evil.com` stays on origin (US5-6).
  - **Flags**: the seeded out-of-stock product shows a disabled button. Quantity 9 999 on an in-stock product raises a flag, disables **Đặt đơn**, and no Stock number appears in the DOM or in any `/api/cart-lines/status` response body (US1-3, US3-1, US3-3, SC-005).
  - **Tabs**: two tabs on `/cart`; a change in tab 1 appears in tab 2 without reload (FR-021).
  - **Shop owner**: no counter, no button, and the `/place-order` message (US6-1, US6-2, US6-3).
  - **Corrupted storage**: `localStorage.shop_cart = "rác"` → no crash, empty Cart.
  - **Shop owner leftover Cart**: a Guest Cart exists, the Shop owner logs in → no counter, `/cart` shows the Shop owner message; logs out → the same Cart is back (spec Edge Cases, FR-018).
  - **Accessibility**: `@axe-core/playwright` on `/cart` (with lines and flags) and `/place-order` (wall and Customer): zero WCAG 2.1 AA violations.
  - **No redirect**: every pre-wall route answers 200 with no redirect (FR-017).

  (FR-017, FR-021, SC-001, SC-004, SC-005, SC-006)
- [ ] T015 Extend `e2e/performance.e2e-spec.ts` with SC-007, keeping the existing SC-003 blocks and thresholds untouched.
  - **Fixture**: 20 fixture Products inserted by the test's own setup and removed after, respecting AD-28 (committed state, no transaction rollback).
  - **Measurements**:
    - 30 full navigations to `/cart` with a 20-line Cart: **p95 ≤ 1500 ms**;
    - 50 direct `POST /api/cart-lines/status` calls with 20 lines: **p95 ≤ 400 ms**;
    - use the file's existing `p95()` nearest-rank function.
  - **Then** run the four commands verbatim — `npm test`, `npm run lint`, `npm run test:regression`, `npm run build` — and record their output in the task report. Confirm the product half **ran**: no `SKIPPED` for `apps/*`, `packages/*` or `e2e/`.
  - Walk `quickstart.md` §3 scenarios 1–13.
  - Confirm line coverage of `apps/api/src/modules/**` stays ≥ 80% including the new `catalog` and `stock` code (constitution §III).

  (SC-007, SC-008)

---

## Acceptance ownership (HV007b)

| Acceptance | Owner |
|---|---|
| US1-1, US1-2, US1-3 | T006 (T014 e2e) |
| US1-4, US1-5, US1-9 | T007 (T010 e2e for US1-4) |
| US1-6 | T004 (API), T007 (UI) |
| US1-7, US1-8 | T004 |
| US2-1 … US2-5 | T008 |
| US3-1 … US3-5 | T009 (T014 e2e) |
| US3-6 | T004 |
| US4-1 … US4-4 | T010 |
| US5-1, US5-4, US5-5, US5-7, US5-8 | T013 (T014 e2e) |
| US5-2, US5-3 | T012, T013 (T014 e2e) |
| US5-6 | T011, T012 (T014 e2e) |
| US6-1, US6-2 | T006 (T014 e2e) |
| US6-3 | T013 (T014 e2e) |
| SC-001, SC-004, SC-005, SC-006 | T014 |
| SC-002 | T010 |
| SC-003 | T002, T004 |
| SC-007, SC-008 | T015 |

## Dependencies & Execution Order

```text
T001 ─┬─► T004 ◄── T002
      ├─► T005 ─┬─► T006 ◄── T003
      │         └─► T007 ◄── T003 ─► T008 ─► T009
T003 ─┘
T006, T007 ─► T010
T011 ─► T012
T011, T007, T005 ─► T013
T006 … T013 ─► T014 ─► T015
```

- Phase 2: T001, T002 and T003 have no mutual dependency and run in parallel.
- T004 needs T001 and T002. T005 needs T001. T006 and T007 need T003 and T005.
- T008 and T009 edit `CartPage.tsx` after T007, **strictly sequential**.
- T011 needs only Phase 2 and can run in parallel with T004–T010.
- `App.tsx` is edited by T007, T012 and T013. Run those three **sequentially**, in that order.
- `e2e/cart-journey.e2e-spec.ts` is created by T010 and extended by T014. Sequential.

## Parallel Execution Examples

```text
Wave 1: T001 | T002 | T003
Wave 2: T004 | T005 | T011
Wave 3: T006 | T007            (different files; both read the store and client)
Wave 4: T008 | T012            (CartPage.tsx vs LoginPage/RegisterPage — App.tsx touched only by T012 here)
Wave 5: T009 | T010
Wave 6: T013
Wave 7: T014 → T015
```

## Implementation Strategy

- **MVP = Phase 2 + US1 (T001–T007)**: a working browser Cart with current prices, the server status path and both named invariant tests. It is demonstrable without login.
- **Increment 2 = US2 + US3 (T008–T009)**: the Giỏ hàng is complete.
- **Increment 3 = US4 + US5 (+ US6) (T010–T013)**: FR-8 and FR-11 are complete, and the feature-map outcome is met.
- **Close = T014–T015**: e2e, accessibility, performance, the full verification contract.
- **If a task proves larger than one brief**, do not split it inside this feature: the ceiling is reached. STOP and ask the human whether to split `003` in `feature-map.md`. The natural cut is `003a` Cart (T001–T009) and `003b` Tường đăng ký (T010–T015).

## Phase 10: Convergence

> Appended by `/speckit-converge` on 2026-09-25 (findings F1–F10). The 15-task ceiling was
> put to the human: grouping the ten findings into four tasks was approved by Tuan Nguyen
> (executed_by: agent). F5 wording uses existing glossary terms only — no new term.

- [ ] T016 In `CartPage.tsx`, bind every line-status result to the Cart lines it was computed for and keep **Đặt đơn** disabled with a visible reason while the check for the current lines is pending or has not yet run; announce through the `aria-live` region when flags clear after a successful re-check; add a `CartPage.test.tsx` case where an `exceeds_stock` line is reduced/removed, re-checked as `ok`, and **Đặt đơn** becomes enabled, per FR-008, FR-010, US3-3, US3-4, T009, Constitution II (partial)
- [ ] T017 Make `cartStore.add` report failure when browser storage is unavailable and have `AddToCartButton` show "Không lưu được giỏ hàng trên trình duyệt này." instead of "Đã thêm vào giỏ hàng."; give `PlaceOrderPage.tsx` the same line-status-check failure message as the Giỏ hàng; on both pages never render a `0 ₫` price or `0 ₫` Tổng tiền hàng for lines without a successful status check, per Edge Case "Browser storage unavailable", Edge Case "Line status check fails", FR-006, FR-019 (partial)
- [ ] T018 Replace the heading "Tóm tắt đơn hàng" in `PlaceOrderPage.tsx` with "Giỏ hàng" and remove the "Đơn giá" label in `CartPage.tsx` (show the value without a new noun), updating their tests, per Constitution V, glossary *Order*/*Cart*, FR-019 (contradicts)
- [ ] T019 Tighten the e2e suite: stop the SC-007 `/cart` p95 timer only once all 20 lines show current price and status; in the flags test assert the seeded Stock number is absent from the page text and every `/api/cart-lines/status` body; extend the FR-017 test to every pre-wall route plus `/place-order`, `/login?returnTo=…`, `/register?returnTo=…` with `maxRedirects: 0` and status 200; run the axe WCAG 2.1 AA scan on `/cart` with a flagged line, per SC-007, SC-005, FR-017, T014, T015 (partial)
