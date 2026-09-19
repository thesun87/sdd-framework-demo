# Reconcile — Governance Inputs vs Architecture Spine

**Artifact under review:** `ARCHITECTURE-SPINE.md` (Shop Online, `status: draft`, 2026-09-19)
**Pass type:** RECONCILE — what did not land, and what conflicts.
**Branch:** `baseline/0001-ecommerce`
**Reviewed against:** `CLAUDE.md`, `docs/baseline/glossary.md`, `docs/baseline/verification.md`,
`docs/baseline/feature-map.md`, `docs/baseline/baseline-freeze.yaml`, `docs/baseline/README.md`,
`docs/discovery/README.md`, `package.json`, `docs/tooling-versions.md`,
`docs/agentic-sdd-protocol-v2.md` (§A.2, A4, A5, A9).

**Verdict:** the spine is architecturally sound and process-disciplined — it stops where BMAD
phase 3 should stop and it routes every requirement conflict to the human instead of resolving
it. What did not land is the *governance-input side*: the verification contract cannot verify
this architecture, and two of the six module names use tokens the glossary forbids. Neither can
be fixed by an agent, and both block the baseline freeze.

This report changes no file other than itself.

---

## F1 — [CRITICAL] The verification contract cannot verify this architecture

The spine's Node/NestJS version conflict (F2) is the *visible* half of a larger problem. The
whole of `docs/baseline/verification.md` is scoped to the SDD glue layer, not to the product the
spine describes.

| Key | Command today | What the spine needs it to cover |
|---|---|---|
| `test` | `node --test "tests/**/*.test.mjs"` | TypeScript tests under `shop-online/apps/*`, `packages/shared` |
| `regression` | same command, same glob | same |
| `lint` | `node scripts/lint.mjs` (covers `scripts/`, `tests/`) | TS + ESLint over three apps and a shared package |
| `build` | documented as "a no-op today" | Nest build **plus two separate Vite builds** (AD-9) |

Consequences, in order of severity:

1. **The commands would pass while testing zero product code.** The glob is `.mjs`-only and
   rooted at the repo root. No file under `apps/api/src/modules/...` can ever match it.
   `verification.md` "Definition of done" #1 ("every command in the block above exits 0") and
   protocol §A9's exit gate ("every command in `verification.md` executes successfully on a
   clean clone") both become vacuously true.
2. **The prerequisite list omits every runtime the spine mandates.** `verification.md` says
   "Prerequisites: Node ≥ 20.12, Python ≥ 3.10, PyYAML. No network access needed." The spine
   mandates PostgreSQL 18.6, Docker + Docker Compose, and Caddy 2.x. This is not cosmetic:
   **AD-1 and AD-3 are database-level invariants.** The atomic
   `UPDATE ... WHERE quantity >= :n` semantics and the fixed `product_id`-ascending lock order
   cannot be tested against anything but a real PostgreSQL. A verification contract that does
   not require a database cannot test the spine's two most load-bearing rules.
3. **The spine closes the escape hatch itself.** Consistency Conventions, "Kiểm chứng" row:
   *"Các lệnh trong `docs/baseline/verification.md`, chạy nguyên văn. Task không tự đặt lệnh
   test riêng."* So no task, and no `/speckit-plan`, may add the missing coverage. The contract
   must be correct before the first product task exists, or it is never correct.
4. **The spine's own Deferred list understates this.** Line 276 flags only the *version number*.
   A curator who works the Deferred list to closure would still freeze a baseline whose
   `test`, `lint` and `build` commands touch nothing the architecture describes.

**What must change:** `verification.md`'s ` ```commands ` block, its "What each command covers"
table, and its "Thresholds and prerequisites" section, together with `package.json`'s `scripts`
(and workspace/`engines` config) so the commands resolve. Coverage threshold is still recorded
as "not enforced yet — set one before the first real product feature"; feature 000 *is* that
moment.

**Who owns it (CLAUDE.md §3):** `docs/baseline/verification.md` is under `docs/baseline/**` —
human-only, on a `baseline/*` branch. `docs/baseline/README.md` marks it **human only** in the
owner column; validator rules HV009/HV009b/BF003 read it. An agent must never edit it.
`package.json` is **not** in §3's protected list — it is an ordinary repo file editable on a
normal branch — but because `verification.md`'s commands resolve to its `scripts`, the two must
change in the same human-authored commit. The current branch, `baseline/0001-ecommerce`, is the
correct place for both.

---

## F2 — [HIGH] The Node conflict is real, and `engines` being a floor makes it worse

Confirmed, all three declarations read directly:

| Source | Statement |
|---|---|
| `ARCHITECTURE-SPINE.md` Stack table | `Node.js` = **24 LTS «Krypton»**; `NestJS` = **11.1.9** |
| `docs/baseline/verification.md` | "Prerequisites: Node ≥ 20.12, Python ≥ 3.10, PyYAML" |
| `package.json` | `"engines": { "node": ">=20.12" }` |
| `docs/tooling-versions.md` | `Node | system | 24.13.0 | 2026-09-18 | Tuan Nguyen` |

The conflict is real, and the spine's framing at line 276 is correct: NestJS 11's own floor is
Node ≥ 20.19, so `>=20.12` admits a range (20.12 – 20.18) that satisfies `engines`, satisfies
`verification.md`, and **cannot install the pinned framework**. The machine is already on
24.13.0 per `tooling-versions.md`; only the two declarations are stale, which is exactly the
failure mode that survives review — nothing breaks locally.

A second point the spine does not make: `engines.node` is a *floor*, not a pin. Changing it to
`">=24.13"` still permits Node 25 and 26. If "24 LTS" is meant as a pin, the range must say so.

**Precisely what must change:**

1. `docs/baseline/verification.md`, "Thresholds and prerequisites" — `Node ≥ 20.12` →
   `Node ≥ 24.13`, and add PostgreSQL 18.6 + Docker/Compose to the prerequisite list, and strike
   or qualify "No network access needed" (image pulls and `npm ci` need it).
2. `package.json` — `"engines": { "node": ">=20.12" }` → `">=24.13 <25"` if 24 LTS is a pin, or
   `">=24.13"` if it is a floor. The curator must state which.
3. `docs/tooling-versions.md` — no change needed to the Node row (already 24.13.0), but it has
   no rows for NestJS, PostgreSQL, Drizzle, React, Vite or Caddy. The spine pins exact versions
   and `tooling-versions.md` is the file that carries the "Upgrade owner" and the
   "one tool at a time, on a branch" policy. Those rows should be added at curation, or the
   spine's Stack table becomes an unowned pin.

**Who owns it:** `verification.md` — human only, `baseline/*` branch (CLAUDE.md §3,
`docs/baseline/README.md` owner column). `package.json` and `docs/tooling-versions.md` are not
§3-protected; `tooling-versions.md` names Tuan Nguyen as upgrade owner for every row.

---

## F3 — [HIGH] Naming: `inventory` is in the glossary's "Do NOT use" column

`docs/baseline/glossary.md`, Stock row:

```
| Stock | Tồn kho | Integer ≥ 0 attached to a product ... | "inventory", "quantity on hand", "số lượng", "hàng tồn" |
```

The spine names a bounded context, a NestJS module, and a source-tree directory `inventory`.
This is not one stray sentence — it is structural, at lines 32, 40, 44, 48, 58, 60, 62, 74, 230,
241, 259, 262, 266: the module list, the dependency graph (which the spine calls "**luật**, không
phải minh hoạ"), AD-2's title and rule, AD-4's rule, the entity-ownership paragraph, the source
tree, and three rows of the Capability → Architecture map.

It is a self-violation twice over. CLAUDE.md §4: *"Use the canonical terms in
`docs/baseline/glossary.md`. If a needed term is not there, stop and ask — do not invent a
synonym."* And the spine's own Consistency Conventions first row: *"Đặt tên — thực thể, bảng,
service: Cột *Canonical term (EN)* của `docs/baseline/glossary.md` ... Thuật ngữ không có trong
glossary thì **dừng và hỏi** ... (`CLAUDE.md §4`)."*

It matters beyond style because `apps/api/src/modules/<domain>/` **is** the `allowed scope` of a
task brief (spine line 160). The forbidden token would be frozen into every task brief, every
import path, and every commit message for the life of v1.

**Resolution is a human decision, not an agent edit. Two options, pick one — do not leave both:**

- **(a) Rename the module to `stock`.** The table is already canonically named `stock`, so this
  yields `modules/stock/{stock, stock_ledger}` with no glossary change at all.
- **(b) Add an `Inventory` row to the glossary** with a *distinct* definition (e.g. "the module
  that owns the stock write path", which is genuinely not the same concept as the integer
  `Stock`), and remove `"inventory"` from the Stock row's Do-NOT-use cell — otherwise the
  glossary contradicts itself.

Related, lower weight: AD-17 line 152 uses `số lượng` (also on Stock's Do-NOT-use list) for a
cart-line quantity, and AD-1/AD-4 use the column name `quantity` (`"quantity on hand"` is on the
same list). Both are defensible in context — they are cart/column vocabulary, not the Stock
concept — but the glossary gives a reader no way to tell. Worth one clarifying sentence in the
Stock row at curation.

---

## F4 — [HIGH] Naming: `admin`, "back office", and two UX surfaces that never reached the glossary

Glossary, Shop owner row, Do NOT use: `"admin", "seller", "merchant", "quản trị viên", "nhân viên"`.

The spine uses `admin` as: an app name (`apps/admin/`), an AD-9 `Binds` entry (`admin` app), a
URL route (`/admin` in AD-8 and in the deployment diagram), and a value in the Capability map's
"Lives in" column. It additionally uses **"back office"** three times (lines 103, 266, 267) as a
fourth name for the same surface — a term with no glossary row of any kind, i.e. exactly the
invented synonym §4 forbids.

The deeper gap: **`Trang bán hàng` and `Trang quản trị` — the two surface names the spine leans
on throughout — are not in `glossary.md` at all.** They come from the UX artifact
(`ux-designs/.../DESIGN.md`) and were never curated into the baseline. Under §4 the spine should
have stopped and asked for them.

There is a legitimate distinction available — `admin` naming a *surface/app* is not the same as
`admin` naming a *person* — but the glossary does not draw it, so today the spine simply uses a
banned token.

**Minimum fix at curation:** add glossary rows for `Trang bán hàng` (storefront) and
`Trang quản trị` (admin site); state explicitly whether `admin` is permitted as an app/route
token while remaining forbidden as a term for the Shop owner; delete "back office" from the
spine.

---

## F5 — [MEDIUM] Domain concepts the spine introduces with no glossary row

The spine creates first-class domain vocabulary that will appear in `spec.md` acceptance
criteria, task briefs, tests and commit messages, none of it in the glossary:

`stock_ledger` · `order_status_event` · `order_code` · `product_image` · `account` ·
`name_normalized` · `role` (with values `customer`, `shop_owner`) · and the six module names
`identity` · `catalog` · `inventory` · `ordering` · `payment` · `settings`.

Two of these are load-bearing and should get rows before freeze:

- **`order_code`** — the spine makes it *"thứ duy nhất hiện cho khách (UJ-1)"*, the only order
  identifier a Customer ever sees. A customer-facing identifier with no canonical name will be
  called "order number", "mã đơn", "order id" and "order code" across four artifacts.
- **`stock_ledger`** — the audit record AD-2 and AD-4 both depend on, and the thing a
  reconciliation discrepancy is measured against. "Sổ cái" appears in the spine prose with no
  canonical EN/VI pairing.

The glossary's stated target ("at least 20 canonical terms before the baseline is frozen") is
already met, so there is no budget reason not to add these.

Also flagged, minor: Consistency Conventions "Vai trò" row says *"Ba vai trò là mô hình đóng
băng"* while the same row defines `role ∈ {customer, shop_owner}` (two values) plus
*"`Guest` không phải một dòng nào cả"*. Consistent only to a reader who already knows Guest is
roleless; reads as a contradiction otherwise.

And one defect in a governance *input*, not the spine: `docs/discovery/README.md` states
catalogue size as "2,000 / 20,000 **SKUs**". `"SKU"` is on the Product row's Do-NOT-use list.
The spine correctly restates it as "20.000 sản phẩm" (line 114) — so the spine is clean here and
the input is not. [LOW]

---

## F6 — [MEDIUM] Track A sequencing: the spine stops correctly, with two soft strays

**It lands.** The spine is a BMAD phase-3 (A4) artifact and it does not cross into Spec Kit's or
Superpowers' territory:

- No epics, no stories, no task list, no `tasks.md`, no per-feature `spec.md`. CLAUDE.md §1
  (`bmad-create-epics-and-stories` FORBIDDEN, "Spec Kit owns the task list") is respected.
- It recommends no forbidden command anywhere. No `/speckit-implement`, no phase-4 BMAD skill.
- It actively hands work *down* the pipeline at the right seams: concrete NFR numbers and the
  test plan → `/speckit-plan` (lines 284, 288); unresolved product decisions Q3/Q4/Q5 → "phải
  chốt trước `/speckit-specify`" (line 279); per-column schema detail → "code sở hữu ngay khi nó
  tồn tại" (line 289).
- It refuses to resolve the FR-8 conflict itself, citing CLAUDE.md §3 verbatim
  (line 273: *"cấm gỡ bất đồng về yêu cầu bằng cách sửa tài liệu"*). This is the behaviour §3
  asks for.
- It writes to a §3-*protected* path in no place. It lives under
  `docs/baseline/planning-artifacts/`, which `docs/baseline/README.md` and CLAUDE.md §6
  designate as the BMAD draft area, on a `baseline/*` branch. Correct.
- Protocol §A4's exit gate — "the source tree layout is concrete enough that a task brief can
  express an *allowed scope* as real directory paths" — is met by the Cây nguồn section.

**Two soft strays, both wording rather than substance:**

1. Line 160, *"Ranh giới thư mục = `allowed scope` của task brief"*, and line 79's reference to
   `forbidden scope`, use handoff/Superpowers vocabulary in an architecture document. This is
   defensible — it is precisely what A4's exit gate is about — but it currently reads as an
   *instruction to task authors* rather than a statement of what the architecture *enables*.
   Reword to the latter at curation.
2. Line 288 says concrete thresholds belong *"thuộc `/speckit-plan` và
   `docs/baseline/verification.md`"* without noting that `verification.md` is human-only under
   §3. As written, a reader could take it as licence for a Spec Kit command to write a protected
   file. Add "(human-owned; a Spec Kit command never writes it)".

---

## F7 — [HIGH] A4 deliverables that did not land: no architecture shards, no ADRs

Protocol §A4 requires sharded architecture sections **and** `adr/ADR-*.md` "for each significant
decision". `docs/baseline/README.md` requires the sharded `architecture/` to contain at minimum
`tech-stack.md`, `source-tree.md`, `coding-standards.md`, `data-model.md`,
`integration-contracts.md`.

Current state: the spine's frontmatter says `companions: []` — a single file, no shards.
`docs/baseline/adr/` contains only `.gitkeep` and `0000-template.md`.

The spine carries the *content* for four of the five shards and they can be split out
mechanically at curation:

| Required shard | Source in the spine | Status |
|---|---|---|
| `tech-stack.md` | Stack table | content present |
| `source-tree.md` | Cây nguồn | content present |
| `data-model.md` | Thực thể lõi + ownership paragraph | content present |
| `integration-contracts.md` | "Mục hợp đồng tích hợp **rỗng, một cách có chủ ý**" | content present (deliberately empty) |
| `coding-standards.md` | Consistency Conventions | **partial** — no lint/format/tsconfig/test-layout statement, and §A8 feeds `coding-standards.md` straight into `/speckit-constitution` |

**ADRs are the bigger gap.** AD-1, AD-3, AD-8, AD-9, AD-16 and AD-17 are each a significant,
contested, reversible decision, and every one of them will be re-litigated by a future Track B.
AD-17 most of all: it is in open conflict with FR-8, and if that rationale exists only inside a
draft spine, the next person to touch the cart will not find it. `docs/baseline/adr/` is listed
in `baseline-freeze.yaml` `artifacts.adr_dir` and will be frozen empty.

Related freeze blockers, stated for completeness: `baseline-freeze.yaml` still has
`baseline_id: TODO-baseline-0001`, `status: draft`, `frozen_at: null`, `frozen_by: null`, and
points `architecture: docs/baseline/architecture.md` — a file that does not exist. BV001/BV002
will fail until curation creates it and a named human freezes.

---

## F8 — [MEDIUM] A5 has not passed, and the spine is right about that

The spine's `status: draft` plus its Deferred section list three blocking items it owns
(FR-8/AD-17 conflict; the Node floor; the 15→16 row permission matrix) and three it does not
(PRD §11.1 Q3, Q4, Q5). Protocol §A5's exit gate is "no unresolved blocking item", and its
failure clause is explicit: *"loop back to A3 or A4. **BMAD stops here. Phase 4 is never
run.**"*

So the correct reading of the current state is **A4-complete / A5-blocked**. Nobody should
proceed to Phase 2 freeze or `/speckit-constitution`. Surfacing these rather than silently
deciding them is the spine doing its job; this entry exists so the state is not mistaken for
"architecture done".

Note the coupling: Q4 (may the Shop owner place an order for a Customer?) and Q5 (may a Customer
cancel their own `placed` order?) both land directly on AD-13 and AD-14, and Q3 (the 12-month
anonymisation policy) lands on AD-12. Three glossary rows — Shop owner, Customer, Anonymisation
— already carry the warning that they encode a decision still open at PRD §11.1. Answering these
differently changes the spine, not just the spec.

---

## F9 — [HIGH] Unresolved: is `shop-online/` this repository, a subdirectory, or a sibling?

The spine's source tree is rooted at `shop-online/`. This repository already has `package.json`,
`tests/`, `scripts/` and `specs/` at its root — the SDD **glue layer**, not the product.

The spine never says which of three things `shop-online/` is:

1. a subdirectory of this repo (then every verification glob, npm workspace path and task-brief
   `allowed scope` needs a `shop-online/` prefix, and the root `package.json` becomes a
   workspace root);
2. a separate repository (then this repo's `verification.md` cannot gate the product at all, and
   §A9's "clean clone" gate means a different clone);
3. this repository, renamed.

Everything in F1 depends on the answer, as does every `allowed scope` string in every future task
brief. A curator must answer it before feature 000 is specified.

---

## F10 — Walking skeleton: does the spine give enough to define feature 000?

`feature-map.md` currently holds one placeholder row:
`000-walking-skeleton | _TODO: thinnest end-to-end slice that exercises the whole stack_`.

**Answer: yes for the *shape*, no for the *thinness*.** The spine is concrete enough to write the
slice, but four of its rules (AD-8, AD-9, AD-10, AD-16) force a substantial amount of structure
into task 1, so 000 will press against `feature-map.md`'s ≤ 15-task rule.

### What 000 must touch, forced by the spine

- **`ops/compose.yaml`** — Caddy 2.x + NestJS + PostgreSQL 18.6 + a *named* image volume
  (AD-15, AD-16). The single origin with all three routes (`/` → storefront, `/admin` → admin,
  `/api` → NestJS) has to exist on day one: **AD-8 cannot be deferred**, because deferring the
  proxy means dev runs cross-origin, and the `httpOnly; Secure; SameSite=Lax` cookie rule is then
  never exercised by anything.
- **`packages/shared`** — must exist from the first task. AD-10 forbids either side redeclaring a
  DTO, and per protocol §A9 *"the walking skeleton is the living architecture document. Agents
  imitate the slice far more reliably than they follow prose"*. If 000 declares a type twice,
  every later feature will too.
- **`apps/api`** — NestJS 11 bootstrap; Drizzle + drizzle-kit migration tooling; env schema read
  and validated once at startup from `packages/shared`; the single error envelope; the
  integer-VND and `timestamptz`-UTC conventions; a health endpoint (§A9 requires one).
- **Two Vite builds** — `apps/storefront` and `apps/admin`, two entry points, two output
  directories (AD-9). The spine explicitly rules out the cheap version: *"Lazy route chunk không
  thoả"*. A single-bundle skeleton is not an option.
- **One module built the canonical way** — `controller → service → repository` plus
  `<domain>.public.ts`, so that `allowed scope` has a real shape for later briefs to copy
  (§A4 exit gate).
- **A test harness that can run against a real PostgreSQL**, plus lint/format/TS config and
  migration tooling (§A9 output list). Per F1, `verification.md` must be rewritten by a human
  *before* 000 starts, because §A9's exit gate is defined entirely in terms of it.

### The thinnest honest slice

**`catalog` only:** one `product` + `category` + `product_image` table; `name_normalized` written
in the same operation as `name` and indexed (AD-11); a storefront list/detail page reading it;
one admin page behind a cookie session creating a product. That exercises
proxy → storefront → `/api` → controller → service → repository → PostgreSQL → migration → test,
and proves AD-5, AD-8, AD-9, AD-10 and AD-11.

**But** it deliberately leaves the spine's three most load-bearing invariants untested: AD-1
(data-layer stock guarantee), AD-2 (single stock writer), AD-3 (single transaction, fixed lock
order). Those are the rules the spine says will otherwise fail silently under concurrency.

**Recommendation:** make 000 `catalog` **plus** a minimal `inventory`/stock read-and-adjust path
— one `stock` row, one `stock_ledger` write in the same transaction, and one concurrency test
that asserts `affected rows = 0` means insufficient stock — and accept that 000 sits at the upper
end of the 15-task limit. Do **not** pull `ordering` into 000: placing an order drags in AD-3,
AD-12, AD-13 and AD-14 at once, plus the unresolved Q4/Q5 and the FR-8/AD-17 conflict.

### Blockers before 000 can even be specified

F1 (verification contract rewritten), F2 (Node floor), F3 and F4 (module and app naming — 000
creates the directories that freeze those names permanently), and F9 (the `shop-online/` root
question, which determines every path in every task brief).

---

## Summary table

| # | Sev | Finding | Owner of the fix |
|---|---|---|---|
| F1 | CRITICAL | Verification contract is scoped to the glue layer; commands would pass while testing zero product code; prerequisites omit PostgreSQL/Docker, so AD-1/AD-3 are untestable | human, `baseline/*` (verification.md) + package.json |
| F2 | HIGH | Node ≥ 20.12 in verification.md and package.json vs Node 24 LTS / NestJS 11.1.9 in the spine; `>=20.12` is below NestJS 11's own 20.19 floor | human, `baseline/*` + package.json + tooling-versions.md |
| F3 | HIGH | Module/context/directory named `inventory`, a token in the glossary's Do-NOT-use column for Stock | human — rename to `stock`, or add a distinct glossary row |
| F4 | HIGH | `admin` (Do-NOT-use for Shop owner) as app/route name; "back office" invented; `Trang bán hàng`/`Trang quản trị` absent from the glossary | human — glossary rows + one spine edit |
| F7 | HIGH | No architecture shards (`companions: []`) and no ADRs for AD-1/3/8/9/16/17; `adr_dir` would freeze empty; `docs/baseline/architecture.md` does not exist | human curation (A6/A7) |
| F9 | HIGH | `shop-online/` root is undefined relative to this repo; every verification path and `allowed scope` depends on it | human curation, before 000 |
| F5 | MEDIUM | `order_code`, `stock_ledger` and 10+ other domain terms have no glossary row | human, `baseline/*` |
| F6 | MEDIUM | Spine stops correctly at A4; two wording strays into task-brief / verification-ownership territory | spine edit at curation |
| F8 | MEDIUM | A5 gate not passed — 3 spine-owned + 3 PRD-owned blocking items open; Phase 2 must not start | decision-maker |
| F5b | LOW | `docs/discovery/README.md` uses "SKUs" (Do-NOT-use for Product); the spine itself is clean here | human, `baseline/*` |

**Nothing in the spine instructs a forbidden command, and nothing in it writes to a path
protected by CLAUDE.md §3.**
