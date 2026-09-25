# Task T018 — Glossary-true copy on the Đặt đơn page and the Giỏ hàng

## Source
- Feature: `003-cart-and-wall` (Track B) · Task **T018**, `tasks.md` §Phase 10: Convergence
- Convergence finding F5 · **Constitution §V** (canonical glossary terms; a missing term means STOP
  and ask) · glossary *Order* ("Đơn hàng" = an immutable placed record — none exists at this step)
  and *Cart* ("Giỏ hàng") · **FR-019** (the Đặt đơn page shows the Cart summary)
- Human decision (Tuan Nguyen, 2026-09-25): use existing terms only — no new glossary term.

## Requirements
1. `apps/storefront/src/pages/PlaceOrderPage.tsx`: the section heading "Tóm tắt đơn hàng" becomes
   exactly **"Giỏ hàng"**. Keep its heading level; the page title "Đặt đơn" stays the page's `h1`.
2. `apps/storefront/src/pages/CartPage.tsx`: remove the label text "Đơn giá: " — show the formatted
   current price on its own (no new noun). Keep the value, its formatting (`formatPriceVnd`), and
   whatever accessible name the element needs to stay unambiguous; if you believe an accessible
   label requires a noun that is not in `docs/baseline/glossary.md`, STOP and report.
3. No other copy changes.

## Tests (write/adjust first, watch them fail)
- `PlaceOrderPage.test.tsx`: the section heading "Giỏ hàng" is present; "Tóm tắt đơn hàng" is absent.
- `CartPage.test.tsx`: "Đơn giá" is absent; the current price is still shown per line.

## Scope
**Allowed**
```text
apps/storefront/src/pages/PlaceOrderPage.tsx
apps/storefront/src/pages/PlaceOrderPage.test.tsx
apps/storefront/src/pages/CartPage.tsx
apps/storefront/src/pages/CartPage.test.tsx
.sdd/003-cart-and-wall/task-018-report.md
```
**Forbidden** — STOP and report
```text
apps/api/**  packages/**  e2e/**  specs/**  docs/**  scripts/**  tests/**  apps/storefront/src/cart/**  apps/storefront/src/components/**
```

## Must not break
All Vitest in `apps/storefront`; T016/T017 behaviour on both pages (read their reports in
`.sdd/003-cart-and-wall/`).

## Verification commands
```bash
(cd apps/storefront && npm run --silent test)
npm run lint
npm run build
```
`apps/api` Jest fails at Nest bootstrap on this machine (pre-existing): run `npm test` anyway and name it.
