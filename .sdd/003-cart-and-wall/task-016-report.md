# Task T016 report — Giỏ hàng: line statuses bound to current lines, Đặt đơn gating, flags-cleared announcement

## What I implemented

`apps/storefront/src/pages/CartPage.tsx`:

1. Added an `isChecking` state (`useState(true)` — pending by default, covering the very
   first render before any response). It is set to `true` synchronously at the start of
   every `useEffect` run that performs a status check (i.e. whenever `lines`, `role`, or
   `dropUnknown` change) and set to `false` only when a **non-stale** response for that
   exact effect run resolves (success or error branch).
2. `checkSucceeded` now requires `!isChecking` in addition to the existing `!checkError`
   and `lineStatuses.size > 0` checks, so `canPlaceOrder` can never be true while a check
   for the current lines is still in flight (or hasn't started yet).
3. `disabledReason` now checks `isChecking` **first**, before `checkError`, showing the
   exact string **"Đang kiểm tra tình trạng hàng."** (ledger Ruling R1) whenever a check is
   pending — including the very first check, where previously no reason was shown at all.
4. The existing out-of-order guard (`cancelled` flag set in the effect's cleanup) was kept
   as-is; because `setIsChecking(true)` runs synchronously at the top of each effect
   invocation, and `cancelled` is closed over per invocation, a response for an older set of
   lines is always discarded (`if (cancelled) return;`) before it can touch `lineStatuses`,
   `isChecking`, or the announcement — even if it arrives after a newer request's response.
5. Added a `wasFlaggedRef` (`useRef(false)`) that remembers whether the last applied
   successful check had any flagged line. When a successful re-check finds `hasAnyFlags ===
   false` and `wasFlaggedRef.current === true`, it announces through the existing
   `aria-live` region: **"Các dòng giỏ hàng đã hợp lệ, bạn có thể đặt đơn."** (the exact
   example sentence from the brief; only glossary terms — Dòng giỏ hàng / Giỏ hàng / Đặt
   đơn — no new noun invented) and resets the ref to `false`. The existing "Có dòng trong
   giỏ hàng cần xử lý." announcement text was left unchanged (not covered by any existing
   test, not in scope to rename).

No changes were made to the request/response contract, `cart-client.ts`, the cart store, or
any other page. `apps/storefront/src/test/cartFixtures.ts` needed no changes — the existing
factories were sufficient for all new tests.

## Tests and results

Added a new describe block to `apps/storefront/src/pages/CartPage.test.tsx`:
`"CartPage — trạng thái dòng gắn với giỏ hàng hiện tại và gating Đặt đơn (T016 -
FR-008/FR-010/US3-3/US3-4)"` with 5 tests:

1. First render before the first response → Đặt đơn disabled with "Đang kiểm tra tình
   trạng hàng."
2. Raising quantity on an `ok` line → Đặt đơn disabled with "Đang kiểm tra tình trạng
   hàng." until the new response resolves, then reflects the new (still `ok`) status and
   re-enables Đặt đơn.
3. Out-of-order (stale) response guard: two rapid quantity increases queue two controlled
   fetches; the **current** (second) request's response is resolved and applied first
   (Đặt đơn enabled); the **stale** (first) request's response — carrying an
   `exceeds_stock` flag — resolves afterward and must be discarded (Đặt đơn stays enabled,
   no flag text appears).
4. US3-4 (reduce): an `exceeds_stock` line's quantity is reduced, re-checked as `ok` → flag
   gone, Đặt đơn enabled, `aria-live` region contains exactly "Các dòng giỏ hàng đã hợp lệ,
   bạn có thể đặt đơn."
5. US3-4 (remove): the flagged line is removed instead of reduced → same outcome; the
   `aria-live` region ends up with the clearing sentence (overwriting the "Đã xoá..."
   removal announcement that was set synchronously first).

### Full suite

- `apps/storefront` (`npm run --silent test`): **126/126 passed** (19 test files) — up
  from the pre-existing 121 (5 new tests added), no regressions.
- `packages/shared`: 69/69 passed (unchanged baseline).
- `packages/ui`: 14/14 passed (unchanged baseline).
- `npm run lint` (root, all workspaces incl. `apps/api`, `e2e`): **PASS**.
- `npm run build` (root, all workspaces): **PASS**.
- `npm test` (root): `glue`, `apps/storefront`, `packages/shared`, `packages/ui` all
  **PASS**; `apps/api` **FAILS** — pre-existing environmental failure, not caused by this
  task (see "Issues or concerns" below).

## TDD Evidence

### RED

Command:
```
cd apps/storefront && npx vitest run src/pages/CartPage.test.tsx
```

Result (before implementation): **4 of the 5 new tests failed**, 15 passed (the other 15
were pre-existing tests plus the out-of-order test, which already passed against the
un-fixed code because the pre-existing `cancelled`-closure guard already discarded stale
responses at the effect level — a legitimate regression/characterization test, not a bug
demonstration).

Representative failure (first-render pending test):
```
FAIL  src/pages/CartPage.test.tsx > CartPage — trạng thái dòng gắn với giỏ hàng hiện tại và
gating Đặt đơn (T016 - FR-008/FR-010/US3-3/US3-4) > trước khi có phản hồi đầu tiên, Đặt đơn
bị vô hiệu hoá với lý do đang kiểm tra
TestingLibraryElementError: Unable to find an element with the text: Đang kiểm tra tình
trạng hàng..
```
Why expected: `isChecking` did not exist yet — the old code showed no reason at all before
the first response resolved.

Other failures (raise-quantity pending test, and the two US3-4 announcement tests) failed
for the analogous reasons: no pending state to gate on, and no "cleared" announcement
branch existed yet (`AssertionError: expected 'Đã cập nhật số lượng Cà phê sữa đá.' to be
'Các dòng giỏ hàng đã hợp lệ, bạn có thể đặt đơn.'` / `expected 'Đã xoá Cà phê sữa đá khỏi
giỏ hàng.' to be '...'`).

Total: `Test Files 1 failed (1)` / `Tests 4 failed | 15 passed (19)`.

### GREEN

Command:
```
cd apps/storefront && npx vitest run src/pages/CartPage.test.tsx
```
Result after implementing `isChecking`, the reordered `disabledReason` precedence, and
`wasFlaggedRef`:
```
Test Files  1 passed (1)
     Tests  19 passed (19)
```

Then the full storefront suite:
```
cd apps/storefront && npm run --silent test
Test Files  19 passed (19)
     Tests  126 passed (126)
```

## Files changed

- `apps/storefront/src/pages/CartPage.tsx` — `isChecking` state, gating/reason precedence,
  flags-cleared announcement (see diff summary above).
- `apps/storefront/src/pages/CartPage.test.tsx` — 5 new tests in a new describe block
  (T016).
- `.sdd/003-cart-and-wall/task-016-report.md` — this report.

`apps/storefront/src/test/cartFixtures.ts` was read but not modified (no new fixture shape
was needed).

## Self-review findings

- **Completeness**: all 4 brief requirements covered — (1) results bound to the current
  lines via the `isChecking` gate + existing `cancelled` closure guard, verified by a
  dedicated out-of-order test; (2) pending reason shown for first check and every
  subsequent re-check, existing reason strings untouched (verbatim); (3) flags-cleared
  announcement added, using the brief's exact example sentence; (4) no changes to the
  request/response contract, the store, or any other page — confirmed by `git diff
  --stat` (only `CartPage.tsx` and `CartPage.test.tsx` touched).
- **YAGNI**: considered adding a per-line `(productId, quantity)`-keyed cache instead of a
  single global `isChecking` flag. Rejected: because every `lines` change invalidates the
  *entire* pending check as a unit (one `fetchCartLineStatuses(lines)` call per effect
  run), a global flag is sufficient to guarantee no line's status is read as current while
  stale, and is simpler than per-entry quantity bookkeeping. Also considered adding a
  redundant sequence-number ref for the out-of-order guard; rejected because the existing
  `cancelled`-closure pattern (present before this task) already fully covers it, confirmed
  by the dedicated test passing without any extra plumbing.
- **Test quality**: the out-of-order test drives two overlapping in-flight requests via
  controlled (manually-resolved) promises and resolves the *newer* one first, the *stale*
  one second, so it genuinely exercises "response arrives late" rather than relying on
  natural `Promise` scheduling order. The US3-4 tests assert the exact final `aria-live`
  text via `status.textContent`, not a substring match, so they'd fail if the clearing
  announcement were dropped or worded differently.
- **No Stock numbers in DOM**: unaffected by this change — no new numeric stock/quantity
  values were introduced into rendered text; pre-existing AD-19 test in the T009 describe
  block still passes.
- **Glossary terms**: "Đang kiểm tra tình trạng hàng." matches the brief's required string
  verbatim (ledger Ruling R1). "Các dòng giỏ hàng đã hợp lệ, bạn có thể đặt đơn." uses only
  canonical terms (Dòng giỏ hàng / Giỏ hàng / Đặt đơn); no new noun was invented.
- Comments added to `CartPage.tsx` are in Vietnamese, matching the surrounding file's
  style.

## Issues or concerns

- `apps/api` Jest fails at Nest bootstrap on this machine: `DATABASE_URL chưa được đặt.`
  (real PostgreSQL required per AD-27) — this is a pre-existing environmental failure,
  reproduced on unmodified `main` per the ledger's Environment gate table, and is entirely
  unrelated to this task's scope (`apps/api/**` was not touched, and is explicitly
  forbidden scope for T016). Ran `npm test` as instructed; naming it here rather than
  attempting a fix.
- No other concerns. All allowed-scope verification commands pass; no forbidden paths were
  touched.
