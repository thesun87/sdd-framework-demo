# Task T019 report — Tighten the e2e suite: SC-007 timing, SC-005 DOM check, FR-017 routes, axe with flags

## What changed

### `e2e/performance.e2e-spec.ts`
- `describe.serial("SC-007 …")` → test `"30 lần điều hướng tới /cart với giỏ hàng 20 dòng đạt p95 ≤ 1500ms"`:
  - Old bug: `page.goto("/cart", { waitUntil: "load" })` recorded `Date.now() - startedAt`
    **before** asserting the `<h1>` was visible, so the measured duration was really just
    navigation-load time — the `<h1>` renders on CartPage's first paint, before
    `POST /api/cart-lines/status` ever resolves (`CartPage.tsx`: `isChecking` starts `true`
    but the `<h1>` sits outside that branch).
  - Fix: `waitUntil: "domcontentloaded"`, then two explicit DOM waits per iteration:
    1. `<h1 name="Giỏ hàng">` visible → recorded as `h1AtMs` (kept only as evidence, not the
       gate).
    2. `getByRole("link", { name: "Đặt đơn" })` visible → recorded as `fullRenderAtMs` and
       used for the real p95. This `<a role="link">` only exists when
       `CartPage.tsx`'s `canPlaceOrder` is `true`, which requires every one of the 20 lines
       to have `lineStatus === "ok"` — i.e. "every line's price visible **and** Đặt đơn
       enabled (all ok)" per the brief, in one DOM assertion.
  - Added a permanent per-iteration assertion `h1AtMs <= fullRenderAtMs` — encodes the gap
    the old test missed; also logs both p95s (`p95(đủ 20 dòng, phép đo MỚI)` vs.
    `p95(chỉ <h1>, phép đo CŨ)`) as evidence in stdout.
  - Threshold kept at 1500ms.

### `e2e/cart-journey.e2e-spec.ts`
- Added `import pg from "pg"` (already a root dependency, already used the same way in
  `performance.e2e-spec.ts`).
- **SC-005 test** ("Flags & Tồn kho …"): the old test only checked JSON *field names*
  (`"stockQuantity"`, `"quantity":`) on a single captured response — vacuous, because
  `packages/shared`'s `.strict()` schemas never emit those field names regardless of
  whether a number leaks under some other field name. Replaced with:
  - A dedicated fixture product/stock row inserted directly via `pg` (`Fixture SC005
    <timestamp>` name, price 137 000, stock 9187), added to the cart, quantity set to 9188
    (exactly 1 over stock, triggering `exceeds_stock`).
  - A `page.on("response", …)` listener registered **before** the first navigation, capturing
    every `/api/cart-lines/status` response body for the whole test (not just one
    `waitForResponse` after a single reload).
  - Assertion: the literal string `"9187"` is absent from every captured response body **and**
    from `page.locator("body").innerText()`.
  - Old field-name checks (`availableQuantity`, `stockQuantity`) kept as a cheap secondary
    guard.
  - `try/finally` deletes `stock` then `product` rows and calls `pool.end()` even on failure.
- **FR-017 test**: old test checked only `/`, `/cart`, `/products/1` via `page.request.get`
  (which follows redirects by default, so "no redirect" was never actually asserted).
  Replaced with all 8 routes named in the brief (`/`, `/?categoryId=1`, `/?q=binh%20giu%20nhiet`,
  `/products/<real id from GET /api/products>`, `/cart`, `/place-order`,
  `/login?returnTo=/place-order`, `/register?returnTo=/place-order`), each requested with
  `{ maxRedirects: 0 }`, asserting exactly `200`.
- **Accessibility test**: added a second `/cart` axe scan (`cartFlaggedAxe`) after setting
  quantity to 9999 on "Cà phê sữa đá" (exceeds its seeded stock of 50) so the scan runs while
  a line is flagged and Đặt đơn is disabled, per plan tasks T014/T015. Cart is returned to a
  clean (unflagged) state afterwards so it doesn't affect the later `/place-order` scans.
  Also added `expect(page.getByRole("heading", { level: 2, name: "Giỏ hàng" })).toBeVisible()`
  on the Customer `/place-order` scan, locking in T018's renamed section heading (was "Tóm
  tắt đơn hàng").

## Exact commands run and raw output

### Build
```
$ npm run build
✓ apps/api, apps/storefront (vite build, 351.20 kB / gzip 103.40 kB), packages/shared, packages/ui — all PASS
```

### Lint
```
$ npm run lint
PASS  glue · lint / apps/api · lint / apps/storefront · lint / packages/shared · lint / packages/ui · lint / e2e · lint
```

### e2e TypeScript check
```
$ (cd e2e && npx tsc --noEmit -p .)
(no output — clean)
```

### Throwaway proxy (per brief, T019 / ledger Ruling R4)
```
$ docker run -d --rm --name e2e-proxy-003conv --network shop-online_default -p 8080:80 \
    -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" \
    -v "$PWD/apps/storefront/dist:/srv/storefront:ro" caddy:2.11.4
b85d519028af...
```
Confirmed reachable: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/` → `200`;
`.../api/products` → `200` (Caddyfile's `reverse_proxy api:{$API_PORT:3000}` resolved the
compose service `api` fine because this container joined the same `shop-online_default`
network — no env vars needed on the `proxy` side per `ops/compose.yaml`, matching the real
service). The `shop-online_*` containers (`shop-online-api-1`, `shop-online-proxy-1`,
`shop-online-postgres-1`) were never touched — verified with `docker ps` before and after.

### Full e2e run (final, all 5 spec files, must-not-break list)
```
$ E2E_BASE_URL=http://localhost:8080 DATABASE_URL=postgres://app:app@localhost:5432/shop npm run test:e2e
Running 33 tests using 6 workers
  33 passed (13.0s)
PASS  e2e · test:e2e
```
Per-file breakdown (all green): `auth-journey.e2e-spec.ts` (2), `cart-journey.e2e-spec.ts` (11,
incl. the 4 tightened tests), `performance.e2e-spec.ts` (5, incl. the tightened SC-007 test),
`security-headers.e2e-spec.ts` (7), `storefront-journey.e2e-spec.ts` (8).

Evidence line from the tightened SC-007 test (this run):
```
[SC-007][trang giỏ hàng 20 dòng] n=30 p95(đủ 20 dòng, phép đo MỚI)=252.0ms p95(chỉ <h1>, phép đo CŨ)=205.0ms min=85.0ms max=301.0ms
```
(A second full run earlier in the session logged `252.0ms`/`205.0ms` and `399.0ms`/`369.0ms`
on different runs — both well under the 1500ms threshold, and the "MỚI" (new, full-render)
number is consistently ≥ the "CŨ" (old, h1-only) number, confirming the old stop condition
measured something strictly earlier/less.)

### Vitest (`npm test`)
```
$ npm test
PASS  glue · unit tests
FAIL  apps/api · test        ← pre-existing, see below
PASS  apps/storefront · test   (20 files, 137 tests)
PASS  packages/shared · test   (6 files, 69 tests)
PASS  packages/ui · test       (3 files, 14 tests)
```
`apps/api` failure: every integration spec that calls `createTestApp()` /
`createTestPool()` throws at Nest bootstrap because `DATABASE_URL` is not set in the Jest
process environment on this machine — e.g. `catalog-health.int-spec.ts` fails at
`NestFactory.create(AppModule, …)` → `NestFactoryStatic.initialize` →
`process.exit(1)`, and every DB-backed int-spec throws `DATABASE_URL chưa được đặt.` from
`stock-test-support.ts:42`. This is the same pre-existing, environment-only failure named in
`.sdd/003-cart-and-wall/progress.md`'s environment gate table ("`apps/api` Jest fails at Nest
bootstrap on this machine (pre-existing)... reproduced on unmodified `main`") — not caused by
this task, not fixed by this task per the brief's instruction to name it, not fix it.

## Evidence the new assertions fail when their guarded condition is violated (TDD RED/GREEN)

All three done as temporary, reverted-in-place edits against the running throwaway proxy +
DB, immediately followed by a GREEN re-run. No app code was touched; each RED was produced by
making the *assertion itself* check something known to be false, to prove the check mechanism
is real and not vacuous (the genuine "old bug" can't be reintroduced without editing
`apps/storefront` — out of scope).

1. **SC-005** — asserted `expect(body).not.toContain(String(PRICE))` (137000) instead of the
   stock value. RED:
   ```
   Error: expect(received).not.toContain(expected)
   Expected substring: not "137000"
   Received string: {"lines":[{"productId":51,"lineStatus":"ok","product":{"name":"Fixture SC005 1790350898115","price":137000,"imagePath":null}}]}
   ```
   Reverted → GREEN (`1 passed`). This proves the substring check inspects real response
   content, not a no-op — and, since the real stock number never appears, that the app truly
   doesn't leak it.

2. **FR-017** — added `"/admin"` (known 404 per `ops/Caddyfile`) to the route list. RED:
   ```
   Error: route /admin phải trả 200, không redirect
   Expected: 200
   Received: 404
   ```
   Reverted → GREEN (`1 passed`). Proves the loop's per-route assertion actually
   distinguishes non-200 responses.

3. **SC-007** — two separate RED proofs, each reverted before the next:
   - Lowered the p95 threshold to `1`: `Error: … Expected: <= 1, Received: 90` → RED.
     Reverted to `1500` → GREEN.
   - Inverted the gap assertion to `toBeGreaterThan(fullRenderAtMs)`:
     `Error: lần lặp #0: <h1> xuất hiện lúc 104ms, muộn hơn cả mốc đủ 20 dòng 113ms —
     Expected: > 113, Received: 104` → RED. Reverted to `toBeLessThanOrEqual` → GREEN.
   Both prove the timing assertions gate on the real measured values taken from the DOM
   checkpoints, not on the loop merely running.

After each RED/GREEN pair the file was restored to the exact tightened version described
above; `grep -n "TEMP RED-PROOF" e2e/*.e2e-spec.ts` returns nothing in the final state, and
`git diff --stat` shows only the two allowed files changed.

## Why the seeded Stock value (9187) cannot collide with other numbers on the page

Only one cart line is shown in the SC-005 test (the dedicated fixture product), so the only
other numbers on `/cart` are: the fixture's price, the typed/committed quantity, the computed
line subtotal, the header cart-count badge (same value as quantity), and the fixture's
database id.
- Price = 137 000, quantity typed = 9188 (`SEEDED_STOCK + 1`, the minimum that guarantees
  `exceeds_stock`, and ≤ the `CartLineSchema`/`QuantityStepper` technical cap of 9999).
- Verified programmatically (`node -e …`, included in the test's own comment) that the string
  `"9187"` is not a substring of `"137000"`, `"9188"`, or `"1258756000"` (= 137000 × 9188).
- The fixture's database id is a freshly `IDENTITY`-generated `bigint` starting from a small
  number (seed data only has 28 products; other e2e tests also insert and clean up their own
  fixtures) — nowhere near 9187. The test does not just assume this: it asserts
  `String(fixtureProductId) !== "9187"` at runtime, so if id generation ever drifted that far,
  the test would fail loudly instead of silently passing.
- 9187 was deliberately chosen as an "unremarkable" 4-digit number, distinct from every round
  number used elsewhere in this suite (50, 9999, 100, 24) and from every price in
  `db/seed.ts` (25 000–189 000, all with trailing `000`).

## Files changed
- `e2e/performance.e2e-spec.ts` — SC-007 timing test only (allowed scope).
- `e2e/cart-journey.e2e-spec.ts` — SC-005, FR-017, axe/T018-heading tests (allowed scope).
- `.sdd/003-cart-and-wall/task-019-report.md` — this report (allowed scope).
No other files were touched. `apps/**`, `packages/**`, `specs/**`, `docs/**`, `scripts/**`,
`tests/**`, `ops/**`, `e2e/playwright.config.ts`, `e2e/global-setup.ts` were not modified.

## Self-review
- Re-read the full diff of both files after editing; confirmed no leftover debug output,
  no leftover `TEMP RED-PROOF` markers, no `.only`/`.skip`.
- Confirmed the SC-005 fixture's `finally` block runs on both success and failure paths and
  actually deletes rows — verified with a direct `SELECT … WHERE name LIKE 'Fixture SC005%'`
  against the real DB after the full suite ran: zero rows.
- Confirmed `fullyParallel: true` doesn't create cross-test interference: the SC-005 fixture
  uses a unique, timestamped product name and its own DB rows; the FR-017 test only reads
  (`GET`s), touching no shared state; the axe test's flag-then-unflag sequence is scoped to
  its own page/context.
- Considered whether `page.request.get(path, { maxRedirects: 0 })` in the FR-017 test could
  itself be a false negative if the SPA server ever added an actual 30x for these paths —
  confirmed via `ops/Caddyfile` that all non-`/api`, non-`/admin`, non-`/images` paths hit the
  `try_files … /index.html` SPA-fallback branch, which can only 200 or (for a genuinely
  missing static file) fall through to `index.html` — there is no redirect directive in the
  site block, so this test is a real regression guard against someone adding one.
- Did not touch `assertStorageClean`, other test bodies, or any file outside the two allowed
  spec files.

## Concerns
- SC-007's timing margin is comfortable (measured p95 ~90–400ms against a 1500ms threshold
  across three separate full runs in this session), but all runs were on localhost with a
  throwaway single-container proxy, not the real multi-host deployment target the PRD budget
  assumes — same caveat that already applies to the rest of the SC-003/SC-007 suite.
- The FR-017 test's `/?categoryId=1` and `/?q=binh%20giu%20nhiet` reuse hardcoded values also
  used in `storefront-journey.e2e-spec.ts` (category id 1, the same search term) rather than
  deriving them from a fresh API call; this mirrors existing convention in that file, so it's
  consistent, not a new risk, but flagging it since dedicated dynamic lookups (like the
  product id lookup added in this same test) would be marginally more robust to seed-data
  changes.
- Minor, deferred: the SC-005 test's `page.on("response", …)` handler silently drops a body it
  can't read (`.catch(() => {})`, typically because the response was aborted by the next
  navigation) — acceptable because the test only needs "at least one" body and polls for that,
  but a systematic bug that dropped *every* body would be a false pass, not a false fail; the
  `expect.poll(...).toBeGreaterThan(0)` guard mitigates this by failing loudly if zero bodies
  are ever captured.

## Throwaway container
`e2e-proxy-003conv` was started with `--rm` and stopped via `docker stop e2e-proxy-003conv`
after the final e2e run; confirmed removed (`docker ps` no longer lists it, only the original
three `shop-online-*` containers remain, none of which were stopped, restarted, or recreated
at any point in this task).
