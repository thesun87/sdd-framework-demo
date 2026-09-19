---
title: "Addendum — Shop Online Product Brief"
status: draft
created: 2026-09-18
updated: 2026-09-18
---

# Addendum — Shop Online

Two kinds of content. §1 is the decision-maker's open list — questions that should
be answered before the baseline is frozen. §§2–6 are depth that belongs to
downstream documents (PRD, UX spec, architecture baseline) rather than to the
brief. Audit and override information is not here; it lives in `.memlog.md`.

---

## 1. Open questions for the decision-maker

Carried from the brief's `[ASSUMPTION]` tags, plus what surfaced while writing
the sections below.

1. **Build vs buy.** Why build rather than use an existing hosted platform? The
   brief makes no competitive claim until this is answered. Blocked on market
   research — run `bmad-deep-recon` (market or competitive type) before this
   brief informs a real decision. (Blocks: brief §Build vs buy.)
2. **Business success metric.** What number tells us this worked — orders/month,
   owner hours saved, oversell incidents to zero? (Blocks: brief §Success Criteria.)
3. **Cost of the status quo.** Any figure for lost orders or churn today?
   (Blocks: the Problem section's justification.)
4. **Vision.** Is the deferred-features sequence in the brief the intended
   roadmap, or invented? (Blocks: brief §Vision.)
5. **Retention vs minimisation.** How are 5-year order records reconciled with
   personal-data minimisation? (§2.)
6. **Guest cart merge on registration.** (§3.)
7. **Can the shop owner place an order on a customer's behalf?** Discovery says
   no — the owner manages stock, progresses orders, and confirms transfers, but
   does not place orders. If phone orders need to be entered by the owner, that
   is a scope change, not an implementation detail. (§3.)
8. **Lifecycle edge cases** — cancellation restocking, delivered reversibility,
   payment-method-dependent transitions. (§4.)

Questions 1–4 are product questions for the decision-maker. Questions 5–8 are
design questions that `bmad-prd` and `speckit-clarify` can carry, but they must
not be answered silently by an implementer.

---

## 2. Non-functional targets — full table

Destination: PRD `nfr-catalog.md`, then architecture baseline.

| Dimension | Target | Notes |
|---|---|---|
| Concurrent active users (Y1) | 200 | Stated target, not measured |
| Peak order rate | 5 orders/minute | Drives the oversell-prevention design |
| p95 page load — catalogue browse | ≤ 1.5 s | |
| p95 API response — read paths | ≤ 400 ms | |
| p95 API response — checkout | ≤ 1.0 s | Includes the stock check |
| Catalogue size Y1 / Y3 | 2,000 / 20,000 SKUs | 10× growth; search must survive it |
| Orders Y1 / Y3 | 30,000 / 300,000 | ~82/day Y1, ~822/day Y3 |
| Uptime | 99.5% monthly | ≈ 3h39m downtime/month allowed |
| RPO / RTO | 1 hour / 4 hours | Sets backup cadence |
| Order data retention | 5 years | See the tension below |

**Tension to resolve in architecture (§1 Q5):** 5-year order retention and
Nghị định 13/2023/NĐ-CP data minimisation both apply to the same records. Orders
must be retained; the personal data attached to them arguably must not be, for
that long. A retention/anonymisation policy is needed — it was not decided at A0.
The rest of the compliance constraints are stated in the brief §Constraints and
are not duplicated here.

---

## 3. Persona permission matrix

Destination: PRD, and the authz section of the architecture baseline.

| Capability | Guest | Customer | Shop owner |
|---|:--:|:--:|:--:|
| Browse catalogue, search | ✓ | ✓ | ✓ |
| View product detail and stock | ✓ | ✓ | ✓ |
| Add to cart | ✓ | ✓ | ✓ |
| Place an order | — | ✓ | — |
| View own order history | — | ✓ | — |
| View all orders | — | — | ✓ |
| Progress order status | — | — | ✓ |
| Confirm bank transfer | — | — | ✓ |
| Product CRUD | — | — | ✓ |
| Adjust stock | — | — | ✓ |

Three roles, total. The matrix is deliberately small enough that authz needs no
policy engine.

This matrix is a strict transcription of `docs/discovery/README.md`. The shop
owner cannot place an order — see §1 Q7 if that turns out to be wrong.

**Open design question (§1 Q6):** a Guest may fill a cart but not check out.
Whether that cart survives registration (cart merge on signup) was not decided
at A0 and is a real UX and data-model decision.

---

## 4. Order lifecycle

Destination: PRD state model, architecture data model.

```
placed ──▶ confirmed ──▶ shipped ──▶ delivered
  │            │            │
  └────────────┴────────────┴──▶ cancelled
```

Three transitions were left undecided at A0. Each needs an answer before
`speckit-specify`:

- Does cancellation restore stock? (Almost certainly yes — confirm.)
- Can `delivered` be reversed? Returns are out of scope, which suggests no —
  but then a mis-click is permanent.
- For bank transfer, is `confirmed` gated on the owner confirming payment, while
  COD reaches `confirmed` immediately?

---

## 5. Payment methods — why gateways are out

Destination: architecture baseline (integration contracts section — which will
be empty, deliberately).

COD and manual bank transfer are how the shop is paid today. Adding a gateway to
the first version would introduce: an external integration contract, webhook
receipt and idempotency, hung-transaction reconciliation, a refund path, and
PCI-adjacent review. None of these exist in the current business process.

The consequence worth preserving: **with no gateway, no card data can ever enter
the system.** That is a security property obtained by scope, not by controls, and
it is lost the moment the out-list is breached.
