# Final-review fix wave — 003-cart-and-wall Phase 10 (b1ab9ea..02370fb)

One dispatch, all findings below. Spec (`specs/003-cart-and-wall/spec.md`) is the binding authority;
T016–T019 briefs in this directory are the plan. TDD applies: failing test first for each item.

## F-1 (Important) — storage-failure message is screen-reader-only
`apps/storefront/src/components/AddToCartButton.tsx` (≈ :24-28, :58-73) writes
"Không lưu được giỏ hàng trên trình duyệt này." only into the visually hidden `aria-live` span.
Spec Edge Case "Browser storage unavailable": the user **is told**; T017: the button **shows** it.
- Render the message visibly next to the button when `cartStore.add` returns `false`, styled like the
  existing "Sản phẩm này đang hết hàng." span; keep the live-region announcement.
- Test: assert the message is in a visible element (not the clipped live-region span) —
  `getByText` alone also matches hidden text (`AddToCartButton.test.tsx` ≈ :82-87).

## F-2 (Minor, fixed in this wave) — status result bound to lines only indirectly
`apps/storefront/src/pages/CartPage.tsx` (≈ :14-20, :34, :170-175). T016 brief req. 1: a result counts
only for the exact `(productId, quantity)` it was computed for. Today the map is keyed by productId and
gating relies on `setIsChecking(true)` inside the effect, i.e. one render after `lines` changed — so a
non-discrete update (cross-tab `storage` event, FR-021) commits one render with an enabled Đặt đơn on the
old result; and after a **failed** re-check the old prices / price × quantity / Tổng tiền hàng stay on
screen (ledger Ruling R2: no price for a line without a successful status).
- Store the lines a result was computed for together with the map (e.g. `{ forKey, map }` where the key
  is the ordered `productId:quantity` list) and **derive** "checking" from `forKey !== currentKey` during
  render instead of setting it in the effect. This removes the duplicated `setIsChecking(false)`.
- A failed check for the current lines means no line has a successful status → no prices, no Tổng tiền
  hàng (reuse `computeLineSubtotal`).
- Keep: stale-response guard, pending reason "Đang kiểm tra tình trạng hàng.", flags-cleared
  announcement, flag stays visible until the re-check (US3-4).
- Tests: a lines change delivered as a non-act/external store update renders Đặt đơn disabled on the
  very first render; a failed re-check after a successful one shows no `₫` and no Tổng tiền hàng.

## F-3 (Minor, fixed in this wave) — FR-017 e2e cannot catch a client-side redirect
`e2e/cart-journey.e2e-spec.ts` FR-017 test: Caddy serves the SPA shell with 200 for every route, so
`maxRedirects: 0` only proves the server does not redirect. Keep that loop, and add for each of the
8 routes a `page.goto(path)` followed by `expect(page).toHaveURL(<same path>)` in a session-less
context. Run e2e exactly as `task-019-brief.md` §"How to run e2e against THIS worktree" describes
(throwaway `e2e-proxy-003conv`, never touch `shop-online_*`, always stop the container).

## F-4 (Minor, fixed in this wave) — `cartStore.add` false conflates invalid input with storage failure
`apps/storefront/src/cart/cartStore.ts` (≈ :143-144) returns `false` for an invalid productId/quantity
too, which would make the button show the storage-failure copy. Make the storage-failure signal
distinct (e.g. return a small result union, or throw/no-op for invalid input while `false` means only
"storage unavailable") and document it; update callers and tests.

## Not in this wave (recorded in the ledger)
- "tình trạng hàng" is listed as a synonym-to-avoid in `glossary.md:56` yet used by sanctioned
  baseline copy — human decision.
- SC-005 check limited to status responses — conforms to the T019 brief.

## Scope
**Allowed**
```text
apps/storefront/src/components/AddToCartButton.tsx
apps/storefront/src/components/AddToCartButton.test.tsx
apps/storefront/src/pages/CartPage.tsx
apps/storefront/src/pages/CartPage.test.tsx
apps/storefront/src/cart/cartStore.ts
apps/storefront/src/cart/cartStore.test.ts
apps/storefront/src/cart/useCart.ts
apps/storefront/src/cart/lineSubtotal.ts
apps/storefront/src/cart/lineSubtotal.test.ts
e2e/cart-journey.e2e-spec.ts
.sdd/003-cart-and-wall/final-review-fixwave-report.md
```
**Forbidden**: everything else (notably `apps/api/**`, `packages/**`, `specs/**`, `docs/**`, `ops/**`,
`PlaceOrderPage.tsx` — it already uses `computeLineSubtotal`; if F-2 seems to require touching it,
STOP and report).

## Verification
```bash
(cd apps/storefront && npm run --silent test)
npm run lint
npm run build
E2E_BASE_URL=http://localhost:8080 npm run test:e2e   # via the throwaway proxy only
npm test   # name the pre-existing apps/api Nest-bootstrap failure; do not fix it
```
