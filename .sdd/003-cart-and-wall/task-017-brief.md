# Task T017 — Storage-unavailable feedback on Thêm vào giỏ hàng; Đặt đơn page failure branch; no false prices

## Source
- Feature: `003-cart-and-wall` (Track B) · Task **T017**, `tasks.md` §Phase 10: Convergence
- Convergence findings F4, F6
- Spec: Edge Case **"Browser storage unavailable"** (the user is told the Cart cannot be saved in this
  browser; browsing keeps working) · Edge Case **"Line status check fails"** (no line flagged or
  unflagged on stale data; Đặt đơn stays disabled until a successful check) · **FR-006** (current
  name, image, current price, price × quantity, Line subtotal from **current** prices) · **FR-019**
  (Đặt đơn page re-checks and flags lines *exactly as in the Giỏ hàng*)
- research.md R4 (storage unavailable → "Không lưu được giỏ hàng trên trình duyệt này.")

## Objective
The storefront never tells the user something false: not "added" when nothing was saved, not a
`0 ₫` price for a line whose current price is unknown, and not silence when the Đặt đơn page's
line check fails.

## Current defects (verified)
- `apps/storefront/src/cart/cartStore.ts` `add` (≈ :140-147) returns `void` and silently returns
  when storage is unavailable; `apps/storefront/src/components/AddToCartButton.tsx` (≈ :21-25)
  always announces "Đã thêm vào giỏ hàng.".
- `apps/storefront/src/pages/PlaceOrderPage.tsx` (≈ :26-45) has no failure branch for the line
  status check.
- On both `CartPage.tsx` and `PlaceOrderPage.tsx`, a line without a successful status shows
  `Sản phẩm #id` and `0 ₫`, and the Line subtotal shows `0 ₫`.

## Requirements
1. `cartStore.add` reports whether the write happened (e.g. returns `boolean`); existing callers
   and tests keep working. When it did not happen, `AddToCartButton` shows/announces exactly
   **"Không lưu được giỏ hàng trên trình duyệt này."** instead of "Đã thêm vào giỏ hàng.".
2. `PlaceOrderPage` shows exactly **"Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang."**
   when the line status check fails, the same way the Giỏ hàng does (ledger Ruling R2); no line is
   flagged or unflagged on that failure.
3. On both pages (ledger Ruling R2): a line with no successful status shows its name placeholder
   but **no price and no price × quantity**, and the **Tổng tiền hàng** (Line subtotal) is not
   rendered until every line has a successful status. Never render `0 ₫` as a price.
4. Keep T016's behaviour in `CartPage.tsx` intact (status bound to current lines, pending reason
   "Đang kiểm tra tình trạng hàng.", cleared announcement).

## Tests (write first, watch them fail)
- `cartStore.test.ts`: `add` reports failure when storage is unavailable, success otherwise.
- `AddToCartButton.test.tsx`: unavailable storage → "Không lưu được giỏ hàng trên trình duyệt này.",
  and "Đã thêm vào giỏ hàng." is absent.
- `PlaceOrderPage.test.tsx`: failed check → the failure message; no `0 ₫`.
- `CartPage.test.tsx` + `PlaceOrderPage.test.tsx`: before any successful status (and after a
  failed one) no `0 ₫` and no Tổng tiền hàng.

## Architecture decisions binding this task
- **AD-17** (Cart lives in the browser, `shop_cart` key) · **AD-20** (no remembered status) ·
  **AD-19** (no Stock number reaches the page). Single `cartStore` owns storage (plan).
- Constitution §V: glossary terms only.

## Scope
**Allowed**
```text
apps/storefront/src/cart/cartStore.ts
apps/storefront/src/cart/cartStore.test.ts
apps/storefront/src/cart/useCart.ts
apps/storefront/src/components/AddToCartButton.tsx
apps/storefront/src/components/AddToCartButton.test.tsx
apps/storefront/src/pages/CartPage.tsx
apps/storefront/src/pages/CartPage.test.tsx
apps/storefront/src/pages/PlaceOrderPage.tsx
apps/storefront/src/pages/PlaceOrderPage.test.tsx
apps/storefront/src/test/cartFixtures.ts
.sdd/003-cart-and-wall/task-017-report.md
```
**Forbidden** — STOP and report
```text
apps/api/**  packages/**  e2e/**  specs/**  docs/**  scripts/**  tests/**
```
Do not rename the "Tóm tắt đơn hàng" heading or the "Đơn giá" label — that is T018.

## Must not break
All Vitest in `apps/storefront`, `packages/shared`, `packages/ui`; `ProductDetailPage.test.tsx`,
`App.test.tsx`, `router.test.ts`. The header Cart counter reads `localStorage` without network calls.

## Verification commands
```bash
(cd apps/storefront && npm run --silent test)
npm run lint
npm run build
```
`apps/api` Jest fails at Nest bootstrap on this machine (pre-existing, environmental): run `npm test`
anyway and name it in the report.

## Dependencies / previous outputs
T016 (commit range in `.sdd/003-cart-and-wall/progress.md`) changed how `CartPage.tsx` stores and
gates line statuses — read its report `.sdd/003-cart-and-wall/task-016-report.md` before editing.
