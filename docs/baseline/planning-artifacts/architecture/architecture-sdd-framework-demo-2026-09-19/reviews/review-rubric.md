---
review: rubric-walk
target: ARCHITECTURE-SPINE.md
reviewer: Rubric Walker (Reviewer Gate, bmad-architecture)
date: 2026-09-19
verdict: 'REVISE BEFORE FREEZE — 2 CRITICAL, 5 HIGH, 5 MEDIUM, 1 LOW. The spine is
  excellent on its central invariant and genuinely enforceable across most of the
  business surface, but a whole dimension (schema evolution) and most of the
  operational envelope (observability, incident channel, uptime) are silent, and
  three ADs do not earn their place.'
checklist_results:
  1_divergence_points: WEAK
  2_rules_enforceable: WEAK
  3_deferred_clean: WEAK
  4_tech_verified: PASS (with caveats)
  5_coverage: PASS (with caveats)
  6_dimensions_decided: FAIL
  7_altitude: WEAK
ads_to_cut: [AD-7 (demote to spec AC), AD-19 (merge into AD-10), AD-11 (merge into Consistency Conventions)]
---

# Rubric Walk — ARCHITECTURE-SPINE.md (Shop Online)

This is the checklist review, not a reconcile pass. The three reconcile reports in
this folder (`reconcile-prd.md`, `reconcile-ux.md`, `reconcile-governance.md`)
already compared the spine line-by-line against its inputs, and most of what they
raised has landed. This review asks a different question: **is this a good spine** —
does it fix the right things, at the right altitude, with rules a reviewer can
actually enforce, and is it the right *length*?

Where a finding here is a carry-over that an earlier report raised and the spine did
not fully close, it is labelled as such.

---

## Part 1 — The checklist, one item at a time

### 1. Does it fix the real divergence points for the level below (features), and miss none?

**WEAK.**

The level below is `docs/baseline/feature-map.md` — features, each ≤ 15 tasks, each
one `specs/NNN-slug/`. The right test is: *two features built in separate worktrees
by separate agents — would they collide?*

**What it gets right, and these are the hard ones.** The spine correctly identifies
that the single most expensive collision in this product is "who owns the stock
number" and nails it three ways (AD-1 data-layer invariant, AD-2 sole-owner write
path, AD-4 column-is-truth). It identifies that a dependency graph declared as *law*
creates a deadlock for FR-24/FR-25/FR-27 and resolves it structurally (AD-22
`usecases`) rather than by exception. It identifies that the FE/BE split makes
contract drift the default (AD-10) and that a shared DTO turns an FR-5 violation
into the path of least resistance (AD-19). Those four are the divergence points a
weaker spine would have missed entirely.

**What it misses.** Six collisions that two features *will* have:

| Missed divergence point | Two units that collide | Finding |
|---|---|---|
| Database migrations: ownership, ordering, naming, forward-only, when they run | Any two features that touch schema — i.e. nearly all of them | **K1** |
| Where session state lives (signed cookie vs `session` table) | `identity` feature vs every feature that needs "revoke all sessions" (AD-7) | **K4** |
| Client-side data cache / FE data-layer convention | storefront browse feature vs storefront product-detail feature; and it punches a hole in AD-20 | **K5** |
| Pagination shape (offset vs cursor), list filter/sort params, route naming under `/api` | FR-3 product list vs FR-29 order list vs FR-31 order history | **K6** |
| `stock_ledger` column set and the three-value `reason` enum | the order-placement feature vs the manual-adjustment feature — both write this table | **K7** |
| Where the PRD §5 role matrix is enforced (guard? decorator? per-controller?) | every back-office feature | **K8** |

`stock_ledger` (K7) is the sharpest one, because the spine went to the trouble of
declaring `stock` the sole owner of that table and then did not say what a row
contains. PRD FR-27 fixes the column set and the enum
(`order_placed | order_cancelled | manual_adjustment`); the spine restates neither.
Two features will each invent a `reason` vocabulary, and the reconciliation cron of
AD-4 will be comparing a sum it cannot interpret.

### 2. Is every AD's Rule enforceable, and does it follow from its Prevents?

**WEAK.** Sixteen of twenty-two rules are mechanically checkable — genuinely good, and
better than most spines. Five are not, and one contradicts its own stated reason.

**Enforceable, and a reviewer could check them by grep or by reading one file:**
AD-1 (`CHECK`, conditional `UPDATE`, no read-then-write), AD-2 (no other module
touches two named tables), AD-3 (one transaction, ascending `product_id`), AD-5 (no
cross-boundary `JOIN`, no foreign-repository import), AD-6 (no mail library in any
`package.json` — this is the model of an enforceable rule: it is a grep), AD-9 (two
Vite configs, no cross-imports), AD-11 (no normalising function on the left side of
`WHERE`), AD-12, AD-13 (no repository method that reads an order without
`customer_id`; 404 not 403), AD-14 (one transition function, explicit table), AD-15,
AD-16, AD-17, AD-18, AD-19 (a type-shape constraint, correctly distinguished from a
runtime filter), AD-21 (N processes, M stock, exactly M successes — an
executable acceptance criterion).

**Not enforceable, or not following from Prevents:**

- **AD-4 — "chênh lệch được xử lý như một sự cố, không phải một cảnh báo."** This is
  the single least enforceable sentence in the document. There is no definition of
  "incident" anywhere in the spine, no channel it arrives on, no severity, no owner,
  and PRD §6 forbids the external services one would normally reach for. A reviewer
  cannot look at a diff and say whether it violates this. The same rule also says the
  cron runs "định kỳ" without saying how often — and the period *is* the RPO of the
  invariant. See **K2**.
- **AD-4 / AD-2 vs the ER note — the FK rule contradicts its own reason.** The spine
  says `stock_ledger.order_id` is a bare value, not a foreign key, because "`stock`
  không được biết `ordering` tồn tại." But `stock.product_id` and
  `stock_ledger.product_id` *are* drawn as relations to `catalog`'s `PRODUCT`, and the
  same dependency graph has `catalog --> stock`, not `stock --> catalog`. By the rule's
  own logic `stock` must not know `catalog` exists either. A reviewer handed a new
  cross-boundary column cannot mechanically decide whether it gets an FK or a bare
  value. See **K3**.
- **AD-7 — "Đặt lại huỷ mọi phiên đang mở của tài khoản đó."** Whether this is even
  implementable depends on a decision the spine never makes (AD-8 says "phiên bằng
  cookie" but not what is *in* the cookie or where session state lives). If sessions
  are stateless signed cookies, this rule cannot be satisfied without a token-version
  column that nothing in the spine mandates. A Rule that may be unimplementable under
  a sibling AD is worse than no rule. See **K4**.
- **AD-10 — "một type chỉ nằm ở không gian tên chung khi cả hai bề mặt thật sự cần
  nó ở cùng hình dạng."** "Thật sự cần" is a judgement call. Reviewable in
  conversation, not mechanically. Minor, and the AD-19 clause carries the load that
  matters.
- **AD-20 — the Rule does not fully prevent its Prevents.** It forbids in-process
  cache, proxy cache, and sets `Cache-Control: no-store`. It says nothing about the
  browser-side data cache, which in a React 19 SPA is the *most likely* place a stale
  "Còn hàng" comes from — a `staleTime` on a query client, or a store that keeps the
  list payload while the user navigates to detail and back. The stated Prevents
  ("khách thêm vào giỏ một món đã hết") is reached by that path and the Rule does not
  close it. See **K5**.
- **AD-22 — "không chứa luật nghiệp vụ của riêng miền nào."** Judgement-based, but it
  is backed by two hard sub-rules (owns no tables; no module imports `usecases`) that
  *are* checkable. Acceptable.

### 3. Could anything under Deferred let two units diverge?

**WEAK.** Most of Deferred is clean and unusually well-addressed: each item names a
recipient, and the four "conflicts a decision-maker must resolve" are exactly right to
push up rather than resolve in-document (`CLAUDE.md` §3 compliance is exemplary here —
the AD-17/FR-8 conflict in particular is reported, not interpreted away).

Three items are consistency decisions wearing a deferral costume:

1. **"Ngân sách kích thước bundle và ngưỡng hiệu năng cụ thể … cả hai cần một quyết
   định về index và phân trang. Thuộc `/speckit-plan`."** `/speckit-plan` runs
   **per feature**. Pagination shape is a cross-feature API contract: FR-3's product
   list, FR-29's order list and FR-31's order history will each get a plan of their
   own, and they will not agree on offset-vs-cursor or on parameter names. Index
   strategy can defer; the *shape* cannot. → **K6**
2. **"Chi tiết schema (kiểu từng cột, index …, ràng buộc cấp trường) — code sở hữu
   ngay khi nó tồn tại."** Column types mostly can defer, because money, time and
   primary keys are already fixed in Consistency Conventions. Two things inside this
   bucket cannot: how enums are stored (native PG enum vs `text` + `CHECK` — this hits
   `order_status`, `payment_method`, `role` and `stock_ledger.reason`, four columns
   across three modules), and the `stock_ledger` column set itself (**K7**). And the
   deferral is silent on the thing that actually breaks when schema is owned by code:
   **migrations** (**K1**).
3. **"Ẩn danh hoá `account.email` … Xem lại cùng Q3."** Deferring the *policy* to the
   decision-maker is correct. But the deferral also, silently, defers **ownership**:
   no module owns the §9.3 anonymisation job, it has no row in the Capability map, and
   AD-12 mentions it only as one of two write paths permitted on a frozen order.
   → **K10**

Genuinely deferrable and correctly framed: OG/share preview (with the cheapest known
fix recorded — good practice), the Drizzle 1.0 and NestJS 12 upgrades (both with
explicit revisit triggers), and the ADR/glossary/walking-skeleton items that belong to
the baseline curator.

### 4. Is the named tech verified-current?

**PASS, with caveats.** The spine claims web verification on 2026-09-19 and `.memlog.md`
corroborates it with per-item release dates: React 19.3.0 (2026-09-09), Vite 8.3.0
(Rolldown-based, stable since 2026-03-12), NestJS 11.1.9 (2025-11-14) and 12.0.3,
PostgreSQL 18.6 (2026-08-13), drizzle-orm 0.45.2 / drizzle-kit 0.31.10 (2026-03-27),
Node 24 "Krypton" as Active LTS. The two *non*-choices are the strongest evidence of
real verification, because both are reasoned and both cost something: PG 19 excluded
as beta, NestJS 12 excluded because it moved ESM-first + Vitest + oxlint + Rspack in
2026-08 and agent-written code will still emit Nest 10/11 CJS+Jest idioms. That second
argument is specific to *this* build substrate and could not have been copied.

Caveats:

- Four stack rows are not pins at all: `TypeScript 5.x`, `@vitejs/plugin-react 6.x`,
  `Caddy 2.x`, `@nestjs/schedule` "tương thích Nest 11". A spine whose job is
  cross-feature consistency should pin what two features could scaffold differently.
- Verification is asserted as one blanket sentence. The per-item dates live only in
  `.memlog.md`, which — as the PRD reconcile agent already noted about a different
  issue — is a session log, not a downstream artifact. A curator reading only the
  spine cannot re-check any claim. → **K13**
- The Node floor conflict (`verification.md` and `package.json` say ≥ 20.12; NestJS 11
  needs ≥ 20.19) is correctly caught and escalated in Deferred. Good.

### 5. Coverage — does every capability have a home?

**PASS, with caveats.** All 33 FRs appear in the Capability → Architecture Map, and
the mapping is specific rather than decorative (it names the governing ADs, and bolds
the load-bearing ones). All four PRD §8 invariants have an enforcing AD: #1 and #2 →
AD-1/AD-3/AD-18, #3 → AD-13/AD-8/AD-7, #4 → AD-12. Both counter-metrics are present
(SM-C1 inside AD-3, SM-C2 via the FR-14/FR-11 framing). The "Phương án đã bị loại"
section discharges addendum §4 properly.

Three capabilities in scope have no row:

- **§9.3 anonymisation.** In scope, blocked on Q3, and referenced only in passing
  inside AD-12. No owning module, no map row. → **K10**
- **Uptime 99,5% / RTO 4 h.** AD-15 covers backup content; nothing covers process
  supervision, restart policy, health check or restore rehearsal. Carry-over from
  `reconcile-prd.md` F-17, still open. → **K2**
- **FR-33's "có đúng một tài khoản chủ shop" and "không có API hay màn hình công khai
  nào tạo được tài khoản chủ shop."** The Vai trò convention row names the enum and
  says "không policy engine", but nothing enforces the uniqueness or the absent
  creation path. Carry-over from `reconcile-prd.md` F-13, still open. → **K11**

### 6. Is every dimension the altitude owns decided, deferred, or an open question?

**FAIL.** This is the item the spine loses on, and it loses on exactly the axis the
checklist calls out.

| Dimension | Status |
|---|---|
| Deployment | **Decided** — one VPS, Docker Compose, Caddy, one origin. Clear. |
| Environments | **Decided** — `local dev` + `prod`, no staging, stated as a choice. |
| Infra strategy | **Decided** — AD-16, with an explicit escalation path for adding anything. |
| Backup / RPO | **Decided** — AD-15, and it catches the non-obvious failure (image volume). |
| Migrations / schema evolution | **SILENT** — zero occurrences in the document. → **K1** |
| Observability / logging / incident channel | **SILENT** — zero occurrences, and AD-4 depends on one existing. → **K2** |
| Operations (supervision, restart, health, restore drill, RTO) | **SILENT** beyond the backup unit. → **K2** |
| Security posture | **PARTIAL** — AD-8 (cookie flags), AD-13 (isolation), AD-7 (reset) are there; password hashing algorithm, login rate limiting (FR-10 and a UX commitment), CSRF stance, secrets handling, and upload validation for FR-28 images served from the session-cookie origin are all absent. → **K12** |
| Data retention / anonymisation | **PARTIAL / mis-deferred** — policy correctly escalated, ownership silently dropped. → **K10** |

Migrations is the worst of these, because it is not a gap in depth — it is the absence
of a dimension. Drizzle Kit is pinned in the stack table and never mentioned again.
Nothing says migrations are forward-only, nothing says how two features' migration
files order against each other, nothing says whether migrations run at container start
or as a separate step, nothing says whether a destructive migration needs escalation,
and nothing says where the FR-33 seed row comes from. Every feature after `000` will
add migrations; they will collide on the first parallel pair.

Observability is the second worst, because AD-4 *already assumes it exists*. "Chênh
lệch được xử lý như một sự cố" is the spine's own escalation for the product's central
invariant being violated, and there is no mechanism behind it. Add that the NFR table
sets three p95 thresholds and a 99,5% uptime target, that PRD §10 opens with "Mọi chỉ
số đều đo được từ chính hệ thống", and that PRD §6 forbids reaching for a hosted APM —
and the conclusion is that nobody can tell whether this system is meeting its NFRs or
whether AD-1 has ever been breached in production.

### 7. Altitude discipline

**WEAK.** The centre of the document sits correctly at initiative altitude: AD-1
through AD-5, AD-8 through AD-10, AD-14, AD-16, AD-22 are all "features must agree on
this or they break each other," which is exactly the job.

**Too low (per-story detail that wandered up):**

- **AD-7 in its entirety.** Temporary password, display-once, forced change on next
  login, audit row, session revocation — that is the acceptance-criteria list of one
  story in one feature. See the cut list.
- **AD-12's `shipping_fee_updated_at` paragraph.** A single column's existence and the
  reason no `order_status_event` carries it. True, needed, and it belongs in that
  feature's spec, not in the spine's invariant on order immutability.
- **AD-3's UX paragraph** ("màn hình *'Đơn chưa đặt được'*… nêu **đủ** các dòng thiếu
  kèm số còn lại"). The architectural content is one clause: *after rollback, one
  separate non-transactional read, and the result is advisory not a commitment*. The
  screen copy is UX's.
- **Consistency Conventions: "Đếm sản phẩm theo danh mục."** A sidebar count's
  semantics. It earns half its place because "don't count by stock, that violates
  FR-5" is a genuine trap — but it should be one clause, not a row.

**Too high (too vague to constrain anything):** only AD-4's incident sentence, already
covered.

**Nothing is at the wrong altitude in the other direction** — there is no "we will
build a scalable, maintainable system" filler anywhere in this document, which is
rarer than it should be.

---

## Part 2 — Which of the 22 ADs earn their place

The spine's own test, applied to each: **(a)** would two features one level down choose
incompatibly, **(b)** is the call non-obvious, **(c)** is it a real trade-off?

| AD | (a) two units diverge | (b) non-obvious | (c) real trade-off | Verdict |
|---|:--:|:--:|:--:|---|
| AD-1 stock invariant at the data layer | ✓ | ✓ | ✓ | **Keep** — load-bearing |
| AD-2 `stock` sole owner of the write path | ✓ | ✓ | ✓ | **Keep** |
| AD-3 one transaction, fixed lock order, explainable failure | ✓ | ✓ | ✓ | **Keep** — trim the UX paragraph |
| AD-4 column is truth, ledger is audit | ✓ | ✓ | ✓ | **Keep** — but fix the unenforceable clause (K2) |
| AD-5 module boundary = data boundary | ✓ | ✓ | ✓ | **Keep** — the spine's backbone |
| AD-6 email is identity, never a send address | ✓ | ✓ | ✓ | **Keep** — grep-enforceable, guards PRD §6 |
| AD-7 password reset mechanics | ✗ | partly | ✗ | **CUT / demote** — see below |
| AD-8 one origin, cookie sessions | ✓ | ✓ | ✓ | **Keep** — but finish it (K4) |
| AD-9 two bundles, not lazy chunks | ✓ | ✓ | ✓ | **Keep** — the lazy-chunk refutation is the whole value |
| AD-10 one contract source, split by surface | ✓ | ✓ | ✓ | **Keep** |
| AD-11 normalise on write | ✓ | partly | ✓ | **Merge** into Consistency Conventions |
| AD-12 orders copy, never reference | ✓ | ✓ | ✓ | **Keep** — trim the `shipping_fee_updated_at` para |
| AD-13 isolation at the repository, 404 not 403 | ✓ | ✓ | ✓ | **Keep** |
| AD-14 one transition gate | ✓ | ✓ | ✓ | **Keep** |
| AD-15 backup is one unit incl. the image volume | ✓ | ✓ | ✓ | **Keep** — catches a silent RPO lie |
| AD-16 no out-of-process infrastructure | ✓ | ✓ | ✓ | **Keep** |
| AD-17 no server cart, never trust client prices | ✓ | ✓ | ✓ | **Keep** — and its unresolved conflict must stay visible |
| AD-18 idempotent order placement | ✓ | ✓ | ✓ | **Keep** — the best AD in the document |
| AD-19 exact stock number never leaves back office | ✓ | ✓ | ✓ | **Merge** into AD-10 as a named clause |
| AD-20 stock status is never cached | ✓ | ✓ | ✓ | **Keep** — but complete it (K5) |
| AD-21 an invariant is real only when a test proves it | ✓ | ✓ | ✓ | **Keep**, with a noted overlap |
| AD-22 cross-domain work lives in `usecases` | ✓ | ✓ | ✓ | **Keep** — resolves the graph deadlock |

### The cuts

**CUT AD-7 — "Chủ shop đặt lại được mật khẩu nhưng không mạo danh được khách."**
It fails test (a) outright: exactly one feature implements password reset, so there
are no two units to keep coherent. The rule is a story's acceptance criteria written
in architecture voice. It also contains the one clause in the document that may be
unimplementable under a sibling AD (K4).

*What to keep, and where:* one line in the Consistency Conventions "Vai trò" row or in
AD-8 — **"Đặt lại mật khẩu không bao giờ để chủ shop đọc được mật khẩu hiện tại, và
huỷ mọi phiên đang mở"** — plus the Q10 authorization row, which is already correctly
escalated in Deferred. Everything else moves to `specs/<feature>/spec.md`.
*Counter-argument, recorded:* Q10 was decided in this session and the impersonation
hole is real. That justifies the *constraint* surviving in the spine, not the
*mechanism*.

**MERGE AD-19 into AD-10.** AD-10 already says "Xem AD-19 cho trường hợp riêng của tồn
kho" — a cross-reference between two ADs where one is a clause of the other. AD-10's
Prevents (b) and AD-19's Prevents are the same sentence about the same DTO. Fold AD-19
in as a named, bolded clause of AD-10's Rule: the rule survives intact and one AD
disappears. *Note:* AD-19 was added by the reconcile pass precisely because this
leak was easy to miss — so if the merge would reduce its prominence, keep it separate.
This is a length recommendation, not a correctness one.

**MERGE AD-11 into Consistency Conventions.** "`product.name_normalized` (bỏ dấu, chữ
thường) ghi cùng thao tác với `name`, mang index; tìm kiếm chỉ đọc cột đã chuẩn hoá;
không hàm chuẩn hoá nào ở vế trái của `WHERE`" is three lines and belongs in the
conventions table next to the naming and money rows. It is a column contract, not a
trade-off — the addendum §3 had already prescribed it, so (b) is weak.

**Net: 22 → 19 ADs**, and roughly a quarter of the remaining prose is trimmable
(the UX paragraph in AD-3, the `shipping_fee_updated_at` paragraph in AD-12, the
Prevents narratives in AD-9 and AD-17 which are each about twice as long as they need
to be).

### On "the spine is too long"

Partly. But the honest reading is that **length is not the count problem here — it is
the prose problem.** Nineteen of twenty-two ADs pass all three tests, which is a high
hit rate. The document reads long because several ADs narrate their Prevents as a short
story rather than naming the failure. A Prevents clause earns its space when it names a
failure mode a reviewer would not otherwise think of (AD-18's "AD-3 bảo đảm nguyên tử
*bên trong* một request; nó không nói gì về hai request" is worth every word). It does
not earn space when it re-explains something the Rule already implies.

And the trade the spine should make is not "fewer ADs" — it is **spend the reclaimed
space on the dimensions that are currently silent** (K1, K2). An AD for migrations and
an AD for the incident/observability channel would each do more work than the three
being cut.

---

## Part 3 — Findings

### K1 — [CRITICAL] Schema evolution and migrations: the dimension does not exist

`grep -ci migrat ARCHITECTURE-SPINE.md` → 0. Drizzle Kit 0.31.10 is pinned in the stack
table and never mentioned again. Undecided, and therefore divergent across features:

- ownership and ordering of migration files when two features are built in parallel
  worktrees (the `superpowers:using-git-worktrees` flow in `CLAUDE.md` §2 makes this
  *certain*, not hypothetical);
- forward-only vs reversible; whether a destructive migration is a Track B task or a
  `baseline/*` escalation;
- when migrations run — container start, a Compose one-shot, or by hand — which is
  also an RTO-4h question;
- where the FR-33 shop-owner seed row comes from, and how it is kept idempotent
  across restores;
- how `CHECK (quantity >= 0)` (AD-1) is guaranteed to survive a later schema change.

This last one matters most: AD-1 places the product's central invariant in the
database, and nothing in the spine protects that constraint from being dropped by a
migration nobody reviewed.

**Suggested shape:** one AD — migrations are forward-only, generated into
`apps/api/src/db/migrations/` with a monotonic prefix, applied by a single command at
deploy before the API starts, never edited after merge; a migration that drops or
weakens a constraint named in an AD requires a `baseline/*` escalation.

### K2 — [CRITICAL] Observability, the incident channel, and the operational envelope

Zero occurrences of logging, metric, health, or observability. The consequences, in
order of severity:

1. **AD-4's Rule is not enforceable and its escalation does not exist.** "Chênh lệch
   được xử lý như một sự cố, không phải một cảnh báo" — there is no definition of an
   incident, no channel, no owner, no severity. A reviewer cannot detect a violation.
   The reconciliation period ("định kỳ") is also unspecified, and that period *is* the
   detection latency for a breach of the product's central promise.
2. **Three p95 NFRs and a 99,5% uptime target cannot be measured.** PRD §10 says every
   metric is measurable from the system itself. SM-1 and SM-3 are (order history +
   ledger), but the performance and availability targets are not — nothing records
   request latency, and PRD §6 rules out a hosted APM, so the answer has to be
   in-process and on-disk. That is an architectural decision, not a plan detail.
3. **No process supervision, restart policy, health check, or restore rehearsal.**
   AD-15 defines what a backup contains; nothing defines that it has ever been proven
   to restore, which is the whole content of RTO 4 h. Carry-over: `reconcile-prd.md`
   F-17.

**Suggested shape:** one AD covering structured request logs with a correlation id, a
liveness/readiness endpoint Caddy and Compose can use, and a named definition of
"incident" (at minimum: the reconciliation job writes a durable, queryable record and
the deployment runbook names who reads it). Plus a reconciliation period as a number.

### K3 — [HIGH] The foreign-key rule contradicts its own stated reason

The spine says `stock_ledger.order_id` must be a bare value because "`stock` không
được biết `ordering` tồn tại", while drawing `STOCK` and `STOCK_LEDGER` as related to
`catalog`'s `PRODUCT` and declaring that cross-boundary relations *are* foreign keys at
the data layer. The dependency graph has `catalog --> stock`, not the reverse — so by
the rule's own reasoning `stock` must not know `catalog` exists either.

Either the principle is "no FK crosses a module boundary" (and `stock.product_id`
becomes a bare value too, at real cost to referential integrity), or it is "FKs may
cross boundaries, but only in the direction the dependency graph allows" — which is a
defensible and *enforceable* rule, and which happens to give the same answer for
`order_id`. The spine must pick one and state it, because right now a task adding any
cross-boundary column has no rule to follow.

### K4 — [HIGH] The session mechanism is undecided, and AD-7 demands something AD-8 may not support

AD-8 fixes cookie flags (`httpOnly; Secure; SameSite=Lax`) and forbids
`localStorage`/`sessionStorage`. It never says what the cookie *contains* or where
session state lives. Under AD-16 (no Redis) the options are a signed stateless cookie
or a `session` table in Postgres, and they are not interchangeable:

- AD-7 requires "đặt lại **huỷ mọi phiên đang mở**" — impossible with a stateless
  signed cookie unless a token-version column exists, which nothing mandates;
- FR-10 requires 30-day idle and 90-day absolute expiry — two different clocks, which
  a stateless cookie can only express by re-issuing on every request;
- FR-10's logout requirement ("phiên hiện tại không còn dùng được") has the same
  problem.

Two features will choose differently and the second one will discover the first one's
choice at integration.

Related and also absent: the password hashing algorithm (AD-7 says only "chỉ lưu
hash"), and a CSRF stance. `SameSite=Lax` blocks cross-site POST cookies and the
single-origin decision removes most of the risk, so the exposure is small — but the
spine should *say* that Lax + same-origin is the CSRF answer, because otherwise one
feature will add tokens, another will not, and nobody can review either choice.

### K5 — [HIGH] AD-20 closes the server caches and leaves the client cache open — and the FE data layer is undecided

AD-20's Prevents is "khách thêm vào giỏ một món đã hết". Its Rule forbids the
in-process cache, the proxy cache, and sets `Cache-Control: no-store`. In a React 19
SPA the most probable source of a stale "Còn hàng" is none of those — it is the client
data cache (a query library's `staleTime`, or a store that retains the list response
across a navigate-away-and-back). The rule as written is satisfiable by code that
still produces the exact failure it names.

This is compounded by a second silence: **the spine names React 19 and Vite 8 and then
decides nothing about the front-end data layer or router.** Two storefront features
will pick different fetching and caching strategies, different route definitions and
different form/validation approaches, in two separate bundles that share only
`packages/ui` and `packages/shared`. That is a first-order divergence point for an
initiative spine that has chosen a two-SPA architecture.

**Suggested:** extend AD-20's Rule to "no layer may cache stock status, *including the
client*: the storefront re-reads it on mount and on window focus and never serves it
from a cached response," and add a short conventions row fixing the FE data-fetching
and routing libraries.

### K6 — [HIGH] The HTTP surface is fixed only for errors; pagination, filtering and routes are deferred to a per-feature step

The Consistency Conventions fix the error envelope and the 404 rule — good, and those
are the two most commonly divergent pieces. What is not fixed: pagination shape
(offset/limit vs cursor), the parameter names for filtering and sorting, the URL
pattern under `/api`, and whether list responses carry a total count. Three separate
features produce paginated lists (FR-3, FR-29, FR-31) and the spine sends all three to
`/speckit-plan`, which runs once per feature.

Note also that the spine pushes FR-3's page size back to `/speckit-plan` even though
PRD FR-3 already fixed 24/100 (carry-over: `reconcile-prd.md` F-11, still open).

Also unfixed: the public URL/slug scheme. The Deferred section refers to
`/san-pham/:slug` when discussing OG tags, but no rule anywhere establishes that
products have slugs, how they are generated from Vietnamese names, or whether they are
stable. FR-1's "URL danh mục trả 200" depends on an answer.

### K7 — [HIGH] `stock_ledger`'s column set and `reason` enum are not fixed

AD-2 declares `stock` the sole owner of `stock_ledger` and requires a row per change in
the same transaction — then never says what a row is. PRD FR-27 and addendum §2 fix it:
product, before-value, after-value, `reason ∈ {order_placed, order_cancelled,
manual_adjustment}`, order code if any, timestamp, acting account. The spine mentions
only `order_id`.

Two features write this table (order placement and manual adjustment) and will each
invent a `reason` vocabulary; AD-4's reconciliation cron then compares a sum whose
provenance it cannot interpret; and FR-27's "cộng dồn toàn bộ lịch sử cho ra đúng con
số hiện tại" becomes unverifiable. This is precisely the class of decision the spine
exists to make. Carry-over: `reconcile-prd.md` F-14, still open.

### K8 — [MEDIUM] No enforcement point for the PRD §5 role matrix

The Vai trò convention says `role ∈ {customer, shop_owner}` and "không policy engine",
which settles the *model* but not the *mechanism*. AD-13 fixes customer-to-customer
isolation at the repository layer — a strong, well-argued choice — and by the same
argument, role gating at the controller layer is the thing that leaks when a new
controller forgets. Sixteen matrix rows (fifteen plus Q10's new one) need one place
where they are declared and one place where they are checked. Two back-office features
will each choose a guard, a decorator, or an inline check.

### K9 — [MEDIUM] AD-5 plus AD-20 produce an N+1 stock read with no batch-read contract

Every storefront list page must show in/out-of-stock per product (FR-5). AD-5 forbids
joining `catalog` to `stock`. AD-20 forbids caching the answer and forbids the obvious
workaround of denormalising a flag onto `product` (that flag would be a second source
of truth, violating AD-4). So the only legal path is `catalog` calling `stock`'s public
service — and whether that is 24 calls or one batch call is undecided, against a p95 of
400 ms at 20.000 products.

One feature will loop; another will add a batch method with a different signature. The
spine should fix the batch-read shape on `stock.public.ts` as part of AD-2 or AD-20.

### K10 — [MEDIUM] §9.3 anonymisation has no owner and no map row

It is in scope, it is blocked on Q3, and the spine correctly refuses to decide the
policy. But ownership is a different question from policy, and the spine could fix the
shape without touching the 12-month number: which module runs it, that it is an
in-process scheduled job under AD-16 alongside the AD-4 cron, that it is irreversible,
that it leaves an audit trail, and that it is the second of exactly two write paths
permitted on a frozen order (AD-12 already implies this and should say it).

As written, whoever builds it will have to invent all of that, and AD-12's immutability
rule is the thing they will be working around.

### K11 — [MEDIUM] Audit obligations and FR-33 enforcement still open

- **Payment confirmation leaves no trail.** AD-14 writes `order_status_event` on every
  transition, and explicitly notes that confirming payment is *not* a transition. So
  "ai đã xác nhận và lúc nào" — which UJ-4 narrates and SM-3 measures — has no
  recorded source. The same is true of shipping-fee entry: the spine adds
  `shipping_fee_updated_at` (a timestamp) but no actor and no history.
  Carry-over: `reconcile-prd.md` F-15, partially closed.
- **FR-33.** "Có đúng một tài khoản chủ shop" and "không có API hay màn hình công khai
  nào tạo được tài khoản chủ shop" have no enforcement point — no partial unique index,
  no rule forbidding a registration path from accepting a role parameter.
  Carry-over: `reconcile-prd.md` F-13, still open.

### K12 — [MEDIUM] Security posture is partial

Beyond K4's session and CSRF questions: no password hashing algorithm; no login rate
limiting, although FR-10 fixes 10 attempts / 15 minutes per identity and the UX treats
it as a commitment (`reconcile-ux.md` R16, still open) — and under AD-16 it must be
in-process, which is an architectural constraint, not a detail; no rule on validating
FR-28 uploads (content-type sniffing, extension, the 5 MB limit, path construction)
for files that AD-8 causes to be served from the *same origin as the session cookie*;
and no statement on where secrets (DB password, cookie signing key) live, although the
Cấu hình convention gets close.

### K13 — [LOW] Stack pins are loose and verification evidence is not in the document

`TypeScript 5.x`, `@vitejs/plugin-react 6.x`, `Caddy 2.x` and "`@nestjs/schedule`
tương thích Nest 11" are ranges, not pins. Per-item release dates and the
NestJS-11-vs-12 reasoning exist only in `.memlog.md`; the spine asserts verification in
one sentence. The same argument the spine itself accepted for AD-6 applies here — the
memlog is a session log, and the curator reads the spine.

---

## Part 4 — What is already right, recorded so nobody undoes it

- **AD-18 is the strongest decision in the document.** It identifies a path to
  overselling that every other invariant misses, states exactly why AD-3 does not cover
  it, and puts the guarantee at the data layer with a client-generated key. Nothing to
  add.
- **AD-9's refutation of lazy chunks** is the kind of specificity that makes a rule
  enforceable instead of aspirational.
- **AD-22 fixing the dependency-graph deadlock structurally** — rather than by carving
  an exception into AD-5 — is the right resolution, and dropping the `payment` module
  in the same move was correct.
- **`CLAUDE.md` §3 discipline throughout Deferred.** The AD-17/FR-8 conflict, the
  `verification.md` finding, the Node floor, and the missing matrix row are all
  reported and escalated rather than resolved in-document. Several of them are
  uncomfortable for the author's own design, and they are stated anyway.
- **AD-6's conscious-deviation note about PRD §9.2** is in the AD body, where a curator
  will actually see it. Right call.
- **"Phương án đã bị loại"** — thirteen rejected options with reasons, which is what
  stops a reviewer re-proposing pessimistic locking in three weeks.

---

## Summary

| # | Sev | Finding |
|---|---|---|
| K1 | CRITICAL | Migrations / schema evolution: whole dimension silent; nothing protects AD-1's `CHECK` constraint |
| K2 | CRITICAL | Observability, incident channel and operational envelope silent; AD-4's Rule is therefore unenforceable and the NFRs are unmeasurable |
| K3 | HIGH | The FK-vs-bare-value rule contradicts its own stated reason (`stock` → `catalog`) |
| K4 | HIGH | Session mechanism undecided; AD-7's session revocation may be unimplementable under AD-8 |
| K5 | HIGH | AD-20 misses the client-side cache — the likeliest source of its own Prevents; FE data layer undecided |
| K6 | HIGH | Pagination shape, list params, route and slug conventions deferred to a per-feature step |
| K7 | HIGH | `stock_ledger` column set and three-value `reason` enum not fixed (carry-over F-14) |
| K8 | MEDIUM | No enforcement point for the PRD §5 role matrix |
| K9 | MEDIUM | AD-5 + AD-20 imply N+1 stock reads with no batch-read contract, against a 400 ms p95 |
| K10 | MEDIUM | §9.3 anonymisation: no owning module, no capability-map row |
| K11 | MEDIUM | Payment-confirmation and shipping-fee audit gaps; FR-33 uniqueness unenforced (carry-overs F-15, F-13) |
| K12 | MEDIUM | Security posture partial: hashing, rate limiting, upload validation, secrets, CSRF stance |
| K13 | LOW | Four stack rows unpinned; verification evidence lives only in `.memlog.md` |

**ADs to cut:** AD-7 (demote to `specs/<feature>/spec.md`, keep one constraint line),
AD-19 (merge as a clause of AD-10), AD-11 (merge into Consistency Conventions).
**22 → 19**, and the reclaimed space should go to the two silent dimensions, not be
saved.
