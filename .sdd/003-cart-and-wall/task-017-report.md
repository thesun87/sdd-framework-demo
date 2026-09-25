# Task T017 report — Storage-unavailable feedback on Thêm vào giỏ hàng; Đặt đơn page failure branch; no false prices

## What I implemented

1. **`apps/storefront/src/cart/cartStore.ts`** — `add(productId, quantity?)` now returns
   `boolean` instead of `void`: `true` when the write actually happened, `false` for
   invalid input, an already-`unavailable` store, or a `writeToStorage` failure (in the
   last case it also flips the snapshot to `unavailable` and notifies listeners, exactly
   as it already did — only the return value is new). All existing internal call sites
   (`setQuantity`, `remove`, `dropUnknown`) were unaffected; they don't call `add`.
2. **`apps/storefront/src/cart/useCart.ts`** — updated the `UseCartResult.add` type to
   `(productId, quantity?) => boolean` to match.
3. **`apps/storefront/src/components/AddToCartButton.tsx`** — `handleAdd` now branches on
   `cartStore.add(productId)`'s return value: announces exactly
   **"Đã thêm vào giỏ hàng."** on success, or exactly
   **"Không lưu được giỏ hàng trên trình duyệt này."** on failure, via the existing
   `aria-live` region (same mechanism the button already used for the success message —
   no new visible UI element was added).
4. **`apps/storefront/src/pages/PlaceOrderPage.tsx`**:
   - Added a `checkError` state, set to `false` on a successful check and `true` on a
     failed one (mirroring `CartPage.tsx`'s existing pattern). The failure branch does
     **not** call `setLineStatuses`, so no line is flagged or unflagged on a failed check
     (Ruling R2) — `lineStatuses` simply keeps whatever it held before (empty on a first
     failure).
   - Renders exactly **"Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang."** as a
     visible paragraph under the "Chức năng đặt đơn chưa sẵn sàng." line when `checkError`
     is true — the same string CartPage shows, in the same page area (Đặt đơn page has no
     Đặt đơn button of its own to attach a "disabled reason" to, so it's a standalone
     paragraph instead).
   - Added `allLinesPriced = lines.every(l => Boolean(lineStatuses.get(l.productId)?.product))`.
     Per-line price (`Đơn giá`/price × qty row) is now only rendered when that line's
     `product` is present (i.e. a successful, non-`not_found` status for that productId);
     otherwise nothing renders in its place (no `0 ₫`). The whole "Tổng tiền hàng" block is
     only rendered when `allLinesPriced` is true, i.e. only once every current line has a
     successful status with a known price.
5. **`apps/storefront/src/pages/CartPage.tsx`** — identical treatment, same
   `allLinesPriced` gate: per-line "Đơn giá: …" and the right-column line total are each
   wrapped in `{product && (...)}`; the "Tổng tiền hàng" summary block is wrapped in
   `{allLinesPriced && (...)}`. T016's `isChecking`/`checkError`/`wasFlaggedRef`/gating
   logic for Đặt đơn was **not** touched — only the price/subtotal JSX changed, and
   `disabledReason`/`canPlaceOrder` still work exactly as T016 left them (verified: all 5
   T016 tests still pass unmodified).

No changes to `apps/storefront/src/test/cartFixtures.ts` were needed — existing factories
covered every new test.

## Tests and results

New tests added (6 total):

- `cartStore.test.ts`: `add` báo cáo đã ghi được (true) khi ghi thành công, và báo thất
  bại (false) khi storage không dùng được (T017) — asserts `add(10)` → `true` and, after
  mocking `Storage.prototype.setItem` to throw, `add(20)` → `false` with
  `getSnapshot().unavailable === true`.
- `AddToCartButton.test.tsx`: khi `cartStore.add` không ghi được → shows
  "Không lưu được giỏ hàng trên trình duyệt này." and "Đã thêm vào giỏ hàng." is absent.
- `PlaceOrderPage.test.tsx` (2 new):
  - failed check → the failure message shown; placeholder name shown; no `₫` anywhere; no
    "Tổng tiền hàng".
  - never-resolving check (pending) → same three assertions (placeholder name, no `₫`, no
    "Tổng tiền hàng").
- `CartPage.test.tsx` (2 new, new describe block "không hiện giá giả khi chưa có trạng
  thái thành công (T017 - FR-006, Ruling R2)"):
  - pending (never-resolving fetch) → placeholder name shown, no `₫` anywhere, no "Tổng
    tiền hàng".
  - failed check → failure message shown, placeholder name shown, no `₫` anywhere, no
    "Tổng tiền hàng".

### Full suite

- `apps/storefront` (`npm run --silent test`): **132/132 passed** (19 test files) — up
  from the pre-T017 132... actually from 126 (T016 baseline) + 6 new = 132, no
  regressions. Re-ran 4 times back-to-back to confirm stability (see TDD Evidence / Issues
  below re: one transient flake observed during a single combined run).
- `packages/shared`: 69/69 passed (unchanged baseline).
- `packages/ui`: 14/14 passed (unchanged baseline).
- `npm run lint` (root, all workspaces incl. `apps/api`, `e2e`, `glue`): **PASS**.
- `npm run build` (root, all workspaces): **PASS**.
- `npm test` (root): `glue`, `apps/storefront`, `packages/shared`, `packages/ui` all
  **PASS**; `apps/api` **FAILS** — pre-existing environmental failure (`DATABASE_URL chưa
  được đặt`, real PostgreSQL required per AD-27), reproduced on unmodified `main` per the
  ledger's Environment gate table, unrelated to this task (`apps/api/**` untouched,
  forbidden scope for T017). Ran `npm test` as instructed; naming it here rather than
  attempting a fix.

## TDD Evidence

### RED

Command:
```
cd apps/storefront && npx vitest run src/cart/cartStore.test.ts src/components/AddToCartButton.test.tsx src/pages/PlaceOrderPage.test.tsx src/pages/CartPage.test.tsx
```

Result (before implementation): **6 failed, 41 passed (47)** — one new test per area, all
failing for the reasons the brief expects:

- `cartStore.test.ts` — `add` still returned `undefined`, not `false`, for the
  storage-failure case (assertion `expect(cartStore.add(20)).toBe(false)` failed against
  `undefined`).
- `AddToCartButton.test.tsx` — `handleAdd` always announced "Đã thêm vào giỏ hàng.",
  regardless of `cartStore.add`'s (mocked `false`) return value; the failure text was
  never rendered.
- `PlaceOrderPage.test.tsx` (failed-check test) — `TestingLibraryElementError: Unable to
  find an element with the text: Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại
  trang.` — no failure branch existed in the effect.
- `PlaceOrderPage.test.tsx` (pending test) and both `CartPage.test.tsx` T017 tests —
  `Found multiple elements with the text: /₫/`, showing `0₫` rendered for the
  unresolved/failed line (e.g. `0₫ × 2 = 0₫` and `Tổng tiền hàng: 0₫`) — the exact false
  price the brief describes.

Full failing summary:
```
Test Files  4 failed (4)
     Tests  6 failed | 41 passed (47)
```

### GREEN

Command:
```
cd apps/storefront && npx vitest run src/cart/cartStore.test.ts src/components/AddToCartButton.test.tsx src/pages/PlaceOrderPage.test.tsx src/pages/CartPage.test.tsx
```
Result after implementing the `boolean` return, the `AddToCartButton` branch, the
`PlaceOrderPage` `checkError` branch/message, and the `allLinesPriced` gating on both
pages:
```
Test Files  4 passed (4)
     Tests  47 passed (47)
```

Then the full storefront suite (run 4× to confirm no flake from this change):
```
cd apps/storefront && npm run --silent test
Test Files  19 passed (19)
     Tests  132 passed (132)
```
(×4 consecutive runs, all 132/132.)

## Files changed

- `apps/storefront/src/cart/cartStore.ts` — `add` returns `boolean`.
- `apps/storefront/src/cart/cartStore.test.ts` — 1 new test.
- `apps/storefront/src/cart/useCart.ts` — `add` type updated.
- `apps/storefront/src/components/AddToCartButton.tsx` — branch on `add`'s return value.
- `apps/storefront/src/components/AddToCartButton.test.tsx` — 1 new test.
- `apps/storefront/src/pages/CartPage.tsx` — `allLinesPriced` gate on per-line price and
  the Tổng tiền hàng block; no change to T016's Đặt đơn gating logic.
- `apps/storefront/src/pages/CartPage.test.tsx` — 2 new tests (new describe block).
- `apps/storefront/src/pages/PlaceOrderPage.tsx` — `checkError` state + failure message;
  `allLinesPriced` gate on per-line price and the Tổng tiền hàng block.
- `apps/storefront/src/pages/PlaceOrderPage.test.tsx` — 2 new tests.
- `.sdd/003-cart-and-wall/task-017-report.md` — this report.

`apps/storefront/src/test/cartFixtures.ts` was read but not modified.

## Self-review findings

- **Completeness**: all 4 brief requirements covered — (1) `cartStore.add` reports
  success/failure, `AddToCartButton` shows the exact required strings; (2)
  `PlaceOrderPage` shows the exact failure string on a failed check, no line
  flagged/unflagged (verified: the failure branch never calls `setLineStatuses`); (3) both
  pages never render `0 ₫` and hide the Tổng tiền hàng block until every line has a
  successful, priced status; (4) T016's `CartPage.tsx` behaviour (isChecking gate, pending
  reason string, cleared-flags announcement) is untouched — all 5 T016 tests still pass
  verbatim, and no line of T016's logic (`isChecking`, `checkSucceeded`, `canPlaceOrder`,
  `disabledReason`, `wasFlaggedRef`) was edited.
- **Naming**: only glossary terms used — "Tổng tiền hàng" (Line subtotal) label text was
  never renamed, "Đơn giá" label text was never renamed (both required to stay untouched
  per brief — this is T018's job); "Tóm tắt đơn hàng" heading in `PlaceOrderPage.tsx` was
  not touched.
- **Exact strings**: both new/changed user-facing strings —
  "Không lưu được giỏ hàng trên trình duyệt này." and
  "Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang." — are copied verbatim from
  the brief/ledger (the latter already existed verbatim in `CartPage.tsx`; reused as-is in
  `PlaceOrderPage.tsx`).
- **Single source of truth for "priced"**: chose `Boolean(lineStatuses.get(id)?.product)`
  as the one gating condition for both "does this line show a price" and "can the
  subtotal render" on both pages, rather than inventing a second concept (e.g. tracking
  `checkError`/`isChecking` separately for price-gating). This works because
  `CartLineStatusResponseItemSchema` guarantees `product` is non-null iff `lineStatus !==
  "not_found"` (see `packages/shared/src/storefront/cart.ts`), so "has product" exactly
  means "this line's current price is known from a successful check" — considered and
  rejected a more complex `checkError`-aware gate for `CartPage.tsx` because the brief's
  own test list ("before any successful status (and after a failed one)") only requires
  the empty/never-populated case to hide prices, and the simpler product-presence gate
  already covers both that case and the "some lines still pending" case uniformly.
- **YAGNI**: did not add a `PlaceOrderPage`-specific `isChecking` state (unlike T016's
  `CartPage.tsx`) because nothing in this brief or in Ruling R2 requires gating a Đặt đơn
  *button* on this page (it has none — "Chức năng đặt đơn chưa sẵn sàng." is static); the
  `allLinesPriced` gate alone satisfies "no false price" for both the pending and failed
  cases.
- **Test quality**: new tests assert both the positive (message present) and negative
  (absent text) side for each scenario — e.g. `queryByText(/₫/)` returning `null` proves
  no price element rendered at all, not just that a specific string is missing; the
  `AddToCartButton` test also asserts the success string is absent, not just that the
  failure string is present.
- Comments added are in Vietnamese, matching the surrounding file's existing style and
  referencing the ledger ruling / FR numbers as the rest of the codebase does.

## Issues or concerns

- `apps/api` Jest fails at Nest bootstrap on this machine: `DATABASE_URL chưa được đặt.`
  — pre-existing environmental failure, reproduced on unmodified `main` per the ledger's
  Environment gate table, unrelated to this task's scope (`apps/api/**` not touched, and
  forbidden scope for T017). Ran `npm test` as instructed; naming it here rather than
  attempting a fix.
- One transient failure was observed in a single `npm run --silent test` run inside
  `apps/storefront`, in a pre-existing T016 test ("trước khi có phản hồi đầu tiên, Đặt đơn
  bị vô hiệu hoá với lý do đang kiểm tra") with `TypeError: resolveFirst is not a
  function` — this test file was not touched by T017 in that region, the test passed in
  isolation, and 4 subsequent full-suite runs all passed 132/132 consistently. Treating
  this as an unrelated, pre-existing timing flake (not reproducible, not caused by any
  T017 change) rather than a regression; flagging it here for visibility per the
  ledger's minor-findings convention.
- No other concerns. All allowed-scope verification commands pass; no forbidden paths
  were touched.
