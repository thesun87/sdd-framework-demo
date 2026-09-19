---
title: "Product Brief: Shop Online"
status: draft
created: 2026-09-18
updated: 2026-09-18
---

# Product Brief: Shop Online

> Source of truth for all discovery input: `docs/discovery/README.md` (A0, accepted 2026-09-18).
> Items marked `[ASSUMPTION]` were inferred, not supplied. Correct them before the baseline is frozen.

## Executive Summary

Shop Online is a storefront that lets a customer of a single-owner retail shop browse the catalogue and complete an order without a human replying. That one capability is the whole point: it removes the owner from the critical path of taking an order, and in doing so produces the thing their spreadsheet never could — one accurate system of record, written by the transaction itself rather than re-keyed after the fact.

The first version deliberately stops short of the features that make e-commerce projects expensive. No payment gateway, no shipping-carrier integration, no promotions, no reviews. Payment is cash on delivery or a bank transfer the owner confirms by hand — exactly how this shop already gets paid.

## The Problem

The owner is the bottleneck in every order. A customer messages at 10pm; nothing happens until the owner reads it. Each order is transcribed by hand at least once, and every transcription is a chance to lose it.

Three consequences follow, and they compound:

- **Orders are lost.** An order exists as a chat message until someone copies it into the sheet. Messages scroll away; some are never copied.
- **Stock drifts.** The sheet is updated after the fact, so the number it holds is a claim about the past. The shop sells items it does not have, then apologises and refunds.
- **Nothing is measurable.** The record is incomplete and manually produced, so per-product profitability is an afternoon of reconciliation nobody does.

The cost is not only the lost order. It is the customer who was told, after ordering, that the item was gone. `[ASSUMPTION]` No churn or lost-revenue figure was supplied; the harm is described qualitatively and should be quantified before this brief is used to justify spend.

## The Solution

A public storefront plus a small admin back office.

A customer browses a catalogue organised by category, searches it, opens a product and sees the price and whether it is in stock, adds to a cart, and checks out with a delivery address. They register, log in, and see their own order history. No human is involved at any point.

The owner gets the other half: manage products and stock, watch orders arrive, move each one through its lifecycle — placed, confirmed, shipped, delivered, or cancelled — and confirm a bank transfer when the money lands.

The design commitment that matters most: **stock is accurate at the moment of order placement.** Not eventually, not after a nightly sync. The system must refuse to oversell, because overselling is the failure that costs the shop its customers today.

Payment is COD or manual bank transfer. This is not a placeholder for a gateway — it is how this shop is paid now, and shipping the real process beats shipping an integration nobody asked for.

## Build vs buy — unresolved

Honestly: nothing about the technology is novel. Hosted platforms already do all of this and more, and a shop with these requirements could plausibly be served by one.

`[ASSUMPTION]` No market research was run, and discovery never stated why the shop should build rather than buy. The plausible candidates: this is a reference implementation for the Agentic SDD protocol rather than a commercial product, or the owner needs control over data and workflow a hosted platform does not give. **Until the decision-maker answers this, the brief makes no competitive claim.** See `addendum.md` §1 Q1.

What the brief *can* honestly assert: the scope is unusually disciplined. Most first versions carry a payment gateway, vouchers, and reviews because those feel mandatory. This one carries none, which is why it can be built and verified end to end.

## Who This Serves

**The shop owner** — the primary user, and the one whose pain justifies the project. Runs the business alone. Needs order intake to happen without them, stock numbers they can trust, and a single place where every order lives. Success is an evening where orders arrive and nothing needs answering.

**The customer** — buys physical goods from a shop they already found on Facebook or Zalo. Needs to place an order at the hour that suits them without waiting for a reply, and to check later what they ordered.

**The guest** — has not registered yet. The registration wall sits between cart and checkout, deliberately late: browsing costs nothing, so nothing is asked for it.

No staff sub-accounts, no second seller, no marketplace roles. One owner, one shop. Full permission matrix in `addendum.md` §3.

## Success Criteria

**The capability itself**
- A customer completes an order start to finish with zero human intervention.
- Zero orders are re-keyed into a spreadsheet — the system is the only record.
- Zero oversells: no order is ever accepted for stock that is not on hand.

**Performance targets** (from discovery; full table in `addendum.md` §2)
- p95 catalogue browse ≤ 1.5 s; p95 read APIs ≤ 400 ms; p95 checkout ≤ 1.0 s.
- 200 concurrent users, and 5 orders/minute at peak.
- 99.5% monthly uptime; RPO 1 hour, RTO 4 hours.

**Business outcome**
`[ASSUMPTION]` No target was supplied for order volume, revenue, or owner time saved. The objective today is qualitative — remove the owner from order intake — and it needs a number attached before anyone can call the project successful or otherwise.

## Scope

**In — first version**

Catalogue with categories, browse and search · product detail with price and live stock · cart · checkout with delivery address · payment by COD and manual bank transfer with owner confirmation · order lifecycle placed → confirmed → shipped → delivered → cancelled · customer registration, login, own order history · admin product CRUD, stock adjustment, order list and status progression, bank-transfer confirmation.

**Out — explicitly, and each for a reason**

- Payment gateways (VNPay, MoMo, ZaloPay) and everything they drag in: webhooks, hung transactions, reconciliation
- Multi-vendor and marketplace features
- B2B pricing, credit limits, quotations, receivables
- Shipping-carrier APIs and live tracking — delivery is arranged manually
- Promotions, vouchers, discount codes, loyalty
- Reviews and ratings
- Recommendations and personalisation
- Multi-warehouse, multi-currency
- Returns and refunds workflow
- Mobile apps
- Email and SMS notifications — order status is visible in-app only
- Analytics dashboards
- Any language beyond Vietnamese

The out-list is the load-bearing half. Each item is a decision already made, not a gap to be filled opportunistically during implementation.

**Why the first version is this small.** Every deferred item above is a Track B feature against a frozen baseline — that is the architectural bet this brief makes. The first version is not small because the product is small. It is small because the baseline has to be right before anything is built on it.

## Constraints

- **Personal data.** Customer name, phone, and delivery address fall under Nghị định 13/2023/NĐ-CP. Collect only what fulfilment requires.
- **No card data, ever.** Guaranteed by construction — there is no gateway in scope. This is a reason the out-list must hold.
- **Prices in VND, VAT inclusive.**
- **No mandated stack.** The architecture phase chooses freely; there is no incumbent CI/CD standard to conform to.
- **No external integrations at all** in the first version. The system talks to nothing.

## Vision

`[ASSUMPTION]` No vision was supplied in discovery. What follows is an extrapolation, not a stated intention, and the decision-maker should confirm or replace it.

The natural next increments are the ones the out-list defers rather than rejects: online payment once transfer volume makes manual confirmation the new bottleneck; carrier integration once delivery coordination becomes the owner's largest remaining manual task; then notifications, so customers stop asking where their order is.
