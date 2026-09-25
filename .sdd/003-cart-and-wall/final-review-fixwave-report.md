# Final-review fix wave — 003-cart-and-wall Phase 10 — report

Scope: `apps/storefront/src/{cart,components,pages}/*`, `e2e/cart-journey.e2e-spec.ts`, this
report. All four findings (F-1..F-4) addressed in one wave, on `feat/003-convergence`, worktree
`.claude/worktrees/003-convergence`.

## F-1 — storage-failure message is screen-reader-only

**What changed**: `AddToCartButton.tsx` gained a `storageUnavailable` boolean state, set from
`handleAdd`'s outcome. When `cartStore.add(...)` does not succeed for storage reasons, a
**visible** red span ("Không lưu được giỏ hàng trên trình duyệt này.", styled identically to
the existing "Sản phẩm này đang hết hàng." span) renders next to the button, in addition to —
not instead of — the existing sr-only `aria-live` announcement (which still carries the same
text so screen readers are still told).

**RED** — `cd apps/storefront && npx vitest run src/components/AddToCartButton.test.tsx`
(after adding the 3 new/updated tests, before any implementation change):
```
 ❯ src/components/AddToCartButton.test.tsx (6 tests | 3 failed) 2246ms
   ❯ AddToCartButton (T006) (6)
     × khi cartStore.add không ghi được (storage unavailable), thông báo 'Không lưu được giỏ hàng trên trình duyệt này.' và KHÔNG có 'Đã thêm vào giỏ hàng.' (T017) 1020ms
     × thông báo lưu-thất-bại được hiển thị ở một phần tử NHÌN THẤY ĐƯỢC, không chỉ trong vùng aria-live ẩn (F-1) 1014ms
     × khi productId không hợp lệ, cartStore.add không ghi vào giỏ và KHÔNG hiển thị thông báo lưu-thất-bại hay thông báo thành công (F-4) 24ms

 FAIL  ... > khi cartStore.add không ghi được ...
TestingLibraryElementError: Unable to find an element with the text: Không lưu được giỏ hàng
trên trình duyệt này.. This could be because the text is broken up by multiple elements.
```
(This RED run captures F-1 and F-4 together — both required the same `AddResult` union change
in `cartStore.ts` before either test could pass; see F-4 below for the isolated store-level RED.)

**GREEN** — `cd apps/storefront && npx vitest run src/components/AddToCartButton.test.tsx src/cart/cartStore.test.ts`:
```
 Test Files  2 passed (2)
      Tests  23 passed (23)
```
The visibility test asserts via `screen.getAllByText(...)` that at least one matched element's
inline `style.position !== "absolute"` (i.e. is not the clipped live-region span).

## F-2 — status result bound to lines only indirectly

**What changed**: `CartPage.tsx` replaced the separate `lineStatuses`/`checkError`/`isChecking`
state trio with one `checkResult: { forKey, kind, map? }` state plus a `currentKey =
computeLinesKey(lines)` (an ordered `productId:quantity` string). `isChecking`, `checkError`
and the effective `lineStatuses` used for rendering are now **derived during render** by
comparing `checkResult.forKey` to `currentKey` — not set via a separate `setIsChecking(true)`
call inside the effect. When `isChecking` is true (key mismatch — including the very first
render) or the last completed check for the current key failed, `lineStatuses` used for
rendering is an empty map, so `computeLineSubtotal` correctly reports no price / no Tổng tiền
hàng. This also removes the previously-duplicated `setIsChecking(false)` in both effect
branches (a deferred minor from the T016 review, now resolved as a side effect).

**RED** — `cd apps/storefront && npx vitest run src/pages/CartPage.test.tsx -t "F-2"` (new
tests added, before the `CartPage.tsx` change):
```
 ❯ CartPage — kết quả kiểm tra gắn chặt với đúng bộ dòng hiện tại (F-2, ledger Ruling R2) (2)
     × một thay đổi giỏ hàng đến từ BÊN NGOÀI React (...) không bao giờ để Đặt đơn bật ...
     × kiểm tra lại thất bại sau một lần kiểm tra thành công trước đó: không còn hiện giá cũ ...

FAIL ... > một thay đổi giỏ hàng đến từ BÊN NGOÀI React ...
TestingLibraryElementError: Found multiple elements with the text: /₫/
Here are the matching elements:
<div style="color: rgb(75, 85, 99); font-size: 14px; margin: 0px 0px 8px;">25.000₫</div>
  (— the STALE price for the old quantity=2 check was still on screen while a check for the
  new quantity=50 was pending — exactly the Ruling R2 violation the finding describes)

FAIL ... > kiểm tra lại thất bại sau một lần kiểm tra thành công trước đó ...
AssertionError: expected <span>Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang.</span>
                          ...
expected null but got <div style="font-weight: 600; font-size: 16px;">75.000₫</div>
  (queryByText(/₫/) found the OLD successful check's price still rendered after the re-check
  failed)

 Test Files  1 failed (1)
      Tests  2 failed | 21 skipped (23)
```

**GREEN** — same command after the `CartPage.tsx` change:
```
 Test Files  1 passed (1)
      Tests  23 passed (23)
```
Full file: `cd apps/storefront && npx vitest run src/pages/CartPage.test.tsx` → 23/23.

**Note on test technique** (documented honestly per instructions): the brief's literal
description — "renders Đặt đơn disabled on the very first render" for a non-`act()` external
update — describes a one-frame race between React's commit (of the new `lines`) and the
passive effect that used to flip `isChecking`. I instrumented this directly (temporary
debug test, removed before commit) and found jsdom/RTL does not expose that window: a raw
`dispatchEvent` outside `act()` shows **no** re-render at all for up to 20 chained
microtasks (nothing flushes until a macrotask), and by the first `setTimeout(0)`/`act()`
tick that does flush a render, the passive effect has **already run in the same flush** —
so old and new code are indistinguishable at that exact race. What **is** genuinely
distinguishable, and is what the committed test exercises with `waitFor` (eventually-consistent,
matching this file's existing async-assertion style), is that the OLD code, once settled,
still showed the **stale price** for the superseded quantity while the new check was pending —
a real, independently-reproduced Ruling R2 violation, now fixed by deriving `lineStatuses`
from the same key comparison.

## F-3 — FR-017 e2e cannot catch a client-side redirect

**What changed**: `e2e/cart-journey.e2e-spec.ts`, FR-017 test — kept the existing
`page.request.get(path, { maxRedirects: 0 })` loop (server-side check) and added a second loop
over the same 8 `preWallPaths` that does a real `page.goto(path)` followed by
`expect(page).toHaveURL(path)`. The test's own `page` fixture never authenticates anywhere in
this test, so it is already a session-less context; `toHaveURL` with a relative string resolves
to an exact-match anchored regex against `baseURL`, so e.g. a redirect to
`/login?returnTo=/cart` (which contains `/cart` as a substring) correctly does **not** satisfy
`toHaveURL("/cart")`.

**No RED for this one, stated plainly**: this finding is a **test-coverage gap**, not a
demonstrated application defect (`PlaceOrderPage.tsx`/`RegisterPage`/etc. render the
Registration Wall in place, never `navigate()`/redirect client-side for these routes). I did
not fabricate a defect to force a red run; the new assertions were exercised directly against
the current, correct app behaviour and are GREEN on the first e2e run (see below). If a future
change introduces a client-side redirect on any of these 8 routes, this loop will now catch it
— which is exactly the coverage gap the finding named.

## F-4 — `cartStore.add` false conflates invalid input with storage failure

**What changed**: `cartStore.ts`'s `add()` now returns a 3-value union `AddResult = "added" |
"invalid" | "unavailable"` instead of `boolean`. `useCart.ts`'s `UseCartResult.add` type
updated to match. `AddToCartButton.tsx`'s `handleAdd` now short-circuits on `"invalid"` (no
announcement, no storage-failure message — it's a caller-side data bug, not a user-visible
storage condition) and only treats `"unavailable"` as the storage-failure case.

**RED** — `cd apps/storefront && npx vitest run src/cart/cartStore.test.ts` (temporarily
reverted `cartStore.ts` to the pre-fix `boolean`-returning version to capture this in
isolation):
```
 FAIL  src/cart/cartStore.test.ts > cartStore (T003) > add báo cáo 'added' khi ghi thành công, và 'unavailable' khi storage không dùng được (T017)
AssertionError: expected true to be 'added' // Object.is equality

 FAIL  src/cart/cartStore.test.ts > cartStore (T003) > add báo cáo 'invalid' cho productId/quantity không hợp lệ — KHÔNG lẫn với 'unavailable' (F-4)
AssertionError: expected false to be 'invalid' // Object.is equality

 Test Files  1 failed (1)
      Tests  2 failed | 15 passed (17)
```
Component-level RED is the same run captured under F-1 above (the
"khi productId không hợp lệ..." test), since both fixes landed together in `AddToCartButton.tsx`.

**GREEN** — `cd apps/storefront && npx vitest run src/cart/cartStore.test.ts`:
```
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

## Full-suite results

`cd apps/storefront && npm run --silent test`:
```
 Test Files  20 passed (20)
      Tests  142 passed (142)
```
(137 baseline + 5 new: 1 in `cartStore.test.ts`, 1 in `AddToCartButton.test.tsx`, 2 in
`CartPage.test.tsx` under the new F-2 describe block, 1 more in `AddToCartButton.test.tsx` for
the visibility assertion — 5 total net new passing tests across 3 files.)

`npm run lint` (root): PASS — `glue`, `apps/api`, `apps/storefront`, `packages/shared`,
`packages/ui`, `e2e` all pass, including `tsc --noEmit` on the changed `AddResult` union type
plumbing through `useCart.ts`/`AddToCartButton.tsx` and the new `CheckResult`/`computeLinesKey`
types in `CartPage.tsx`.

`npm run build` (root): PASS — `apps/api`, `apps/storefront` (`vite build`, 151 modules,
`dist/index.html` + one JS chunk), `packages/shared`, `packages/ui`.

`npm test` (root):
```
PASS  glue · unit tests
FAIL  apps/api · test
PASS  apps/storefront · test   (142/142)
PASS  packages/shared · test   (69/69)
PASS  packages/ui · test       (14/14)
```
`apps/api` failure is the pre-existing, environmental Nest-bootstrap failure named in the
ledger (Environment gate table) and in every prior task report (T016–T019):
```
DATABASE_URL chưa được đặt. Test bất biến tồn kho cần PostgreSQL THẬT (AD-27) — đặt biến này
(xem ops/.env.example) rồi chạy: docker compose -f ops/compose.yaml up -d postgres ...
```
`apps/api/**` was not touched (forbidden scope) and this failure is unrelated to any of F-1..F-4.

## e2e — command line and raw per-spec results

Followed `task-019-brief.md` §"How to run e2e against THIS worktree" exactly:
1. `npm run build` (root) — already run above as part of verification, rebuilt
   `apps/storefront/dist` from this worktree (with the F-1/F-2/F-4 fixes).
2. Started the throwaway proxy:
   ```
   docker run -d --rm --name e2e-proxy-003conv --network shop-online_default -p 8080:80 \
     -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" \
     -v "$PWD/apps/storefront/dist:/srv/storefront:ro" caddy:2.11.4
   ```
   Confirmed `shop-online-proxy-1`'s network is `shop-online_default` before starting; the
   `shop-online-{api,proxy,postgres}-1` containers were never stopped/restarted (checked
   `docker ps` before and after — all "Up 2 hours" throughout, unaffected).
3. Ran:
   ```
   E2E_BASE_URL=http://localhost:8080 DATABASE_URL=postgres://app:app@localhost:5432/shop npm run test:e2e
   ```
   Result — **33 passed (19.6s)**, all specs green, including the modified FR-017 test:
   ```
   ✓ 11 [chromium] › cart-journey.e2e-spec.ts:499:3 › E2E Cart Journey (T010, T014) ›
     Mọi route trước Tường đăng ký trả về HTTP 200, không redirect, khi chưa đăng nhập (FR-017) (2.1s)
   ```
   Per-file breakdown: `auth-journey` 2/2, `cart-journey` 11/11 (incl. the FR-017 test with the
   new `page.goto`+`toHaveURL` loop and the pre-existing WCAG-with-flags test), `performance`
   6/6 (SC-007 20-line p95 = 1487ms against a ≤1500ms threshold — pre-existing T019 test,
   untouched, close to threshold but green), `security-headers` 7/7, `storefront-journey` 7/7.
   Full summary line: `33 passed (19.6s)`.
4. Stopped the proxy: `docker stop e2e-proxy-003conv` — confirmed removed (`--rm`), and
   `shop-online-{api,proxy,postgres}-1` confirmed still running afterward (`docker ps`).

## Files changed

- `apps/storefront/src/cart/cartStore.ts` — F-4: `add()` returns `AddResult` union.
- `apps/storefront/src/cart/cartStore.test.ts` — F-4: updated existing return-value assertions
  to the new union values; added 1 test for `"invalid"`.
- `apps/storefront/src/cart/useCart.ts` — F-4: `UseCartResult.add` type updated.
- `apps/storefront/src/components/AddToCartButton.tsx` — F-1: visible storage-failure span;
  F-4: short-circuit on `"invalid"`.
- `apps/storefront/src/components/AddToCartButton.test.tsx` — F-1: 1 new visibility test,
  updated the existing storage-failure test's mock/assertion for the union type; F-4: 1 new
  invalid-productId test.
- `apps/storefront/src/pages/CartPage.tsx` — F-2: `computeLinesKey`, `CheckResult` union,
  derived `isChecking`/`checkError`/`lineStatuses`.
- `apps/storefront/src/pages/CartPage.test.tsx` — F-2: 2 new tests in a new describe block.
- `e2e/cart-journey.e2e-spec.ts` — F-3: added the `page.goto`+`toHaveURL` loop to the FR-017 test.
- `.sdd/003-cart-and-wall/final-review-fixwave-report.md` — this report.

No file outside the brief's allowed list was touched. `apps/storefront/src/cart/useCart.ts`,
`apps/storefront/src/cart/lineSubtotal.ts` were read; `lineSubtotal.ts` needed no change (its
`computeLineSubtotal(lines, lineStatuses)` contract is unchanged — `CartPage.tsx` now just
passes it an empty map instead of a stale one when appropriate). `PlaceOrderPage.tsx` was
**not** touched — none of F-1..F-4 required it (F-2's `forKey`/derived-state fix is local to
`CartPage.tsx`'s own effect; `PlaceOrderPage.tsx` has no Đặt đơn button to gate and was out of
scope per the brief's explicit forbidden-list note).

## Self-review

- Every finding's fix is minimal and localized to the file(s) the brief named; no
  "while I was in there" changes. The one incidental improvement (removing the
  previously-deferred duplicated `setIsChecking(false)`) fell directly out of the F-2 rewrite
  of the same lines, not a separate detour.
- Exact required strings preserved verbatim: "Không lưu được giỏ hàng trên trình duyệt này.",
  "Đang kiểm tra tình trạng hàng.", "Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại
  trang.", "Các dòng giỏ hàng đã hợp lệ, bạn có thể đặt đơn." — none renamed, no new glossary
  synonym invented.
- `AddResult`/`CheckResult`/`computeLinesKey` are internal, non-user-facing technical names —
  not glossary terms, so no glossary conflict.
- Comments added are in Vietnamese, matching each file's existing style and referencing the
  finding IDs / Ruling numbers the way T016–T019 reports already do.
- Verified via `git diff` that only the 8 files listed in "Files changed" differ from
  `feat/003-convergence`'s prior tip.
- The F-2 fix changes observable behaviour slightly beyond the two bugs named: prices/Tổng
  tiền hàng are now hidden during **any** pending re-check (not just after a failed one),
  because `lineStatuses` is blanked whenever `isChecking` is true. I judged this correct and
  required by Ruling R2's own wording ("no price for a line without a successful status" —
  success must be for the *current* lines) rather than scope creep; all pre-existing T016/T017
  tests (which never asserted a price during a pending quantity-change re-check) still pass
  unchanged, so this was already latent, untested behavior space, not a covered contract I
  broke.

## Concerns

- The F-2 "cross-tab, before-the-effect-runs" one-frame race described in the brief could not
  be forced into a RED/GREEN pair with jsdom/RTL (see the note under F-2) — I judged writing a
  test that would pass or fail identically on old and new code to be worse than an honest gap,
  so I substituted a `waitFor`-based test that independently reproduces a real, related Ruling
  R2 violation (stale price during any pending re-check) instead. The structural code fix the
  brief asked for (derive `isChecking` from a render-time key comparison, not an effect-set
  boolean) is implemented regardless.
- `e2e/performance.e2e-spec.ts`'s SC-007 20-line test measured p95 = 1487ms against its
  ≤1500ms threshold this run — pre-existing (T019), untouched, currently green, but close to
  the ceiling; not in this wave's scope to address.
- `apps/api` Jest pre-existing environmental failure (`DATABASE_URL chưa được đặt`) reproduced
  again — named, not fixed, per instructions.

## Confirmation

`e2e-proxy-003conv` was stopped (`docker stop e2e-proxy-003conv`) and removed (started with
`--rm`) after the e2e run. `shop-online-api-1`, `shop-online-proxy-1`, `shop-online-postgres-1`
were never stopped, restarted, or recreated at any point (verified via `docker ps` before
starting the throwaway proxy and again after stopping it — all three show unbroken uptime).
