# Discovery — Track A, baseline 0001

**Status:** A0 complete (gate: scope-out exists, NFRs carry numbers, decision-maker named).
**Nature of this input:** DEMO. Collected in a single interactive session on 2026-09-18,
not from real customer interviews. Every number below is a stated target, not an
observed measurement. Treat as authoritative for this demo run only.

## Decision-maker

**Tuan Nguyen** (tuan.nguyen@finviet.com.vn) — answers clarification questions,
owns scope decisions, and is the only person who may freeze the baseline.
SLA for this demo: same session.

## Problem statement

A single-owner retail shop sells physical goods and currently takes orders through
chat (Facebook/Zalo) and a spreadsheet. Orders are lost, stock counts drift from
reality, and the owner cannot tell which products actually make money. There is no
place a customer can browse the catalogue and place an order without a human replying.

## Measurable business objective

- A customer can complete an order without any human intervention.
- Order data lands in one system of record — no spreadsheet re-entry.
- Stock on hand is accurate at the moment of order placement (no overselling).

## Business model

**B2C, single seller.** One shop, one owner. No seller onboarding, no per-shop cart
splitting, no commission calculation, no multi-party settlement.

## Personas and permissions

| Persona | Can do |
|---|---|
| Guest | Browse catalogue, search, view product detail, add to cart |
| Customer (registered) | Everything Guest can, plus place an order, view own order history |
| Shop owner (admin) | Manage products and stock, view and progress all orders, confirm bank transfers |

No other roles. No staff sub-accounts in MVP.

## MVP scope — IN

- Product catalogue with categories, browse and search
- Product detail with price and stock availability
- Cart
- Checkout with a delivery address
- Payment: **cash on delivery (COD)** and **manual bank transfer with owner confirmation**
- Order lifecycle: placed → confirmed → shipped → delivered → cancelled
- Customer registration, login, own order history
- Admin: product CRUD, stock adjustment, order list, order status progression,
  bank-transfer confirmation

## MVP scope — OUT (explicit)

- Online payment gateways (VNPay, MoMo, ZaloPay) and everything they imply:
  webhooks, hung-transaction handling, automated reconciliation
- Multi-vendor / marketplace features
- B2B pricing, credit limits, quotations, accounts receivable
- Shipping-carrier API integration and live tracking; delivery is manual
- Promotions, vouchers, discount codes, loyalty points
- Product reviews and ratings
- Recommendations and personalisation
- Multi-warehouse or multi-currency
- Returns and refunds workflow
- Mobile applications
- Email/SMS notification delivery (status is visible in-app only)
- Analytics and reporting dashboards
- Internationalisation beyond Vietnamese

## Non-functional targets (numbers)

| Target | Value |
|---|---|
| Concurrent active users (Y1) | 200 |
| Peak order rate | 5 orders/minute |
| p95 page load, catalogue browse | ≤ 1.5 s |
| p95 API response, read paths | ≤ 400 ms |
| p95 API response, checkout | ≤ 1.0 s |
| Catalogue size (Y1 / Y3) | 2,000 / 20,000 SKUs |
| Orders per year (Y1 / Y3) | 30,000 / 300,000 |
| Uptime target | 99.5% monthly |
| RPO / RTO | 1 hour / 4 hours |
| Data retention, orders | 5 years |

## Compliance and legal constraints

- Vietnamese personal data protection (Nghị định 13/2023/NĐ-CP): customer name,
  phone, and address are personal data; collect only what fulfilment requires.
- No card data is ever handled or stored — out of scope by construction, since
  MVP has no payment gateway.
- Prices displayed in VND, inclusive of VAT.

## Mandated technology constraints

None. The architecture phase chooses the stack freely. There is no existing
company CI/CD standard to conform to for this demo repository.

## As-is process

See `as-is-process/` — currently empty. The as-is flow is chat-based order taking
with a spreadsheet; it is described in the problem statement above and was not
documented in further detail for this demo.

## External contracts

None. `external-contracts/` is empty by design: the MVP integrates with no
external system.
