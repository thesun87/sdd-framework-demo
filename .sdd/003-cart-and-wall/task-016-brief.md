# Task T016 — Giỏ hàng: line statuses bound to the current lines; Đặt đơn gating; flags-cleared announcement

## Source
- Feature: `003-cart-and-wall` (Track B) · Task **T016**, `tasks.md` §Phase 10: Convergence
- Convergence findings F1, F7, F8
- Spec: **FR-008** (statuses re-determined after every quantity change, never served from a
  remembered earlier result), **FR-010** (Đặt đơn disabled *with a visible reason* while any line is
  flagged, the Cart is empty, or statuses could not be determined), **US3-3**, **US3-4**
  (flag disappears after the re-check; once no line is flagged Đặt đơn is enabled)
- Plan task **T009** ("`aria-live` announces flags appearing or clearing")
- Constitution §II (every behaviour has a test written first)

## Objective
The Giỏ hàng must never enable **Đặt đơn** on a status result that was computed for different
Cart lines, and must always show why Đặt đơn is disabled.

## Current defect (verified)
`apps/storefront/src/pages/CartPage.tsx`:
- `lineStatuses` (≈ :13-15) is a `Map` keyed by `productId` only and is **not** invalidated when
  `lines` change (effect ≈ :19-69). `canPlaceOrder` (≈ :156-161) reads it, so after changing a
  quantity 3 → 5 the previous `ok` keeps Đặt đơn enabled until the re-check returns.
- During the very first check `canPlaceOrder` is false but `disabledReason` (≈ :163-170) is `null`,
  so no reason is shown.
- The announcement (≈ :51-53) is set only when `hasAnyFlags`; flags **clearing** is never announced.

## Requirements
1. A status result counts only for the exact `(productId, quantity)` it was computed for. When the
   Cart lines change, results for changed/removed lines no longer count; a response that arrives
   for an older set of lines must not be applied to the current lines (guard against out-of-order
   responses).
2. While the check for the current lines is pending — including the first check — Đặt đơn is
   disabled and the visible reason is exactly **"Đang kiểm tra tình trạng hàng."** (ledger Ruling R1).
   Existing reasons stay verbatim: "Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang.",
   "Bạn sửa các dòng được đánh dấu để đặt đơn.", "Giỏ hàng của bạn đang trống.".
3. When a successful re-check leaves **no** flagged line after at least one line had been flagged,
   announce it through the existing `aria-live` region. Use a short Vietnamese sentence that uses
   only glossary terms (e.g. "Các dòng giỏ hàng đã hợp lệ, bạn có thể đặt đơn."). Do not invent a
   new noun; if you believe one is needed, STOP and report.
4. Do not change the request/response contract, the store, or any other page.

## Tests (write first, watch them fail)
In `apps/storefront/src/pages/CartPage.test.tsx`:
- an `ok` line whose quantity is raised: Đặt đơn is disabled with "Đang kiểm tra tình trạng hàng."
  until the new response resolves, then reflects the new status;
- first render before the first response: Đặt đơn disabled with "Đang kiểm tra tình trạng hàng.";
- an out-of-order (stale) response does not override the current lines' result;
- US3-4: an `exceeds_stock` line is reduced (and separately: removed), re-checked as `ok` → no flag,
  Đặt đơn enabled, and the cleared announcement is present in the `aria-live` region.

## Architecture decisions binding this task
- **AD-20**: no cached status survives between renders/navigations as if it were current.
- **AD-19**: no Stock number in the DOM (existing tests must keep passing).
- Constitution §V: glossary terms only (`docs/baseline/glossary.md`).

## Scope
**Allowed**
```text
apps/storefront/src/pages/CartPage.tsx
apps/storefront/src/pages/CartPage.test.tsx
apps/storefront/src/test/cartFixtures.ts
.sdd/003-cart-and-wall/task-016-report.md
```
**Forbidden** — touching any is STOP and report
```text
apps/api/**  packages/**  e2e/**  specs/**  docs/**  scripts/**  tests/**
apps/storefront/src/pages/PlaceOrderPage.tsx  (T017/T018)
apps/storefront/src/cart/**  apps/storefront/src/components/**  (T017)
```

## Must not break (impact-analysis §5, §6)
All Vitest in `apps/storefront`, `packages/shared`, `packages/ui`; `router.test.ts`, `App.test.tsx`.
AD-20 risk: do not introduce a status cache that outlives the current lines.

## Verification commands
```bash
(cd apps/storefront && npm run --silent test)
npm run lint
npm run build
```
`apps/api` Jest currently fails at Nest bootstrap on this machine for a pre-existing environmental
reason (not caused by this task). Run `npm test` anyway and name that failure in the report.

## Dependencies / previous outputs
T007–T009 built `CartPage.tsx`. `fetchCartLineStatuses` lives in `apps/storefront/src/api/cart-client.ts`
(read, do not modify). Fresh worktrees need `packages/shared` and `packages/ui` built first
(`npm run build` in each) — already done in this worktree.
