# Task T019 — Tighten the e2e suite: SC-007 timing, SC-005 DOM check, FR-017 routes, axe with flags

## Source
- Feature: `003-cart-and-wall` (Track B) · Task **T019**, `tasks.md` §Phase 10: Convergence
- Convergence findings F2, F3, F9, F10
- Spec: **SC-007** (with up to 20 Cart lines the Giỏ hàng *finishes showing every line with its
  current price and status* in ≤ 1.5 s at p95) · **SC-005** (zero Stock numbers in any Trang bán
  hàng page or in any response it receives) · **FR-017** (home, Category, search, Product detail,
  Giỏ hàng reachable without a session and MUST NOT redirect to login) · plan tasks T014, T015
  (axe WCAG 2.1 AA on `/cart` "with lines and flags")

## Current gaps (verified)
- `e2e/performance.e2e-spec.ts` (≈ :226-232) stops the timer when `h1 "Giỏ hàng"` is visible — the
  page renders that heading before any line appears.
- `e2e/cart-journey.e2e-spec.ts` (≈ :273-320) checks only JSON key names in one response; never the
  DOM, never the seeded Stock value.
- `cart-journey.e2e-spec.ts` (≈ :411-422) checks only `/`, `/cart`, `/products/1`; `page.request.get`
  follows redirects, so "no redirect" is never asserted.
- `cart-journey.e2e-spec.ts` (≈ :424-436) runs axe on `/cart` with one normal line, never flagged.

## Requirements
1. **SC-007**: the 20-line `/cart` timer stops only when all 20 lines show their current price and
   status — e.g. every line's price visible **and** Đặt đơn enabled (all `ok`). Keep the threshold.
2. **SC-005**: in the flags test, assert the seeded Stock value of the flagged Product (as a
   number string) is absent from the page's text and from **every** `/api/cart-lines/status`
   response body observed during the test. Choose a seeded Stock value that cannot collide with
   other numbers on the page (quantities, prices, product ids) and say why in the report.
3. **FR-017**: request every pre-wall route — `/`, a Category (`/?categoryId=<id>`), a search
   (`/?q=<term>`), a Product detail, `/cart` — plus `/place-order`, `/login?returnTo=/place-order`,
   `/register?returnTo=/place-order`, each with `maxRedirects: 0`, asserting status 200.
4. **axe**: run the WCAG 2.1 AA scan on `/cart` while at least one line is flagged and Đặt đơn is
   disabled.
5. UI copy after T018: the Đặt đơn page's section heading is "Giỏ hàng" (not "Tóm tắt đơn hàng");
   the Giỏ hàng pending reason is "Đang kiểm tra tình trạng hàng." (T016).

## How to run e2e against THIS worktree (do not touch the user's running stack)
The running compose stack (`shop-online_*`) serves `apps/storefront/dist` from the **main
checkout**, not this worktree. Do NOT stop, restart or recreate those containers. Instead:
1. `npm run build` in this worktree (builds `apps/storefront/dist` here).
2. Start a throwaway proxy on the same network, serving this worktree's build on another port:
   ```bash
   docker run -d --rm --name e2e-proxy-003conv --network shop-online_default -p 8080:80 \
     -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" \
     -v "$PWD/apps/storefront/dist:/srv/storefront:ro" caddy:2.11.4
   ```
   (Check `ops/compose.yaml` for any env/volume the proxy service also needs, e.g. `API_PORT` or a
   backoffice dist mount, and mirror it.)
3. `E2E_BASE_URL=http://localhost:8080 DATABASE_URL=postgres://app:app@localhost:5432/shop npm run test:e2e`
   (see `e2e/global-setup.ts` for what seeding it does).
4. Always `docker stop e2e-proxy-003conv` when done, even on failure.
The API container runs `main`'s image; Phase 10 changes no API code, so that is acceptable.
If any step cannot run, report exactly what ran and what did not — never claim e2e passed.

## Scope
**Allowed**
```text
e2e/performance.e2e-spec.ts
e2e/cart-journey.e2e-spec.ts
.sdd/003-cart-and-wall/task-019-report.md
```
**Forbidden** — STOP and report
```text
apps/**  packages/**  specs/**  docs/**  scripts/**  tests/**  ops/**  e2e/playwright.config.ts  e2e/global-setup.ts
```

## Must not break
All Playwright e2e: `storefront-journey`, `auth-journey`, `security-headers`, `performance`,
`cart-journey`. All Vitest.

## Verification commands
```bash
npm run lint
(cd e2e && npx tsc --noEmit -p .)   # if the e2e workspace has a tsconfig
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```
`apps/api` Jest fails at Nest bootstrap on this machine (pre-existing): run `npm test` anyway and name it.
