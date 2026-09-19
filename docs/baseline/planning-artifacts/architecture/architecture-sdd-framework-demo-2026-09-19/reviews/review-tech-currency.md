# Review — Technology Currency & Reality-Check

**Artifact under review:** `ARCHITECTURE-SPINE.md` (Shop Online, `status: draft`, 2026-09-19)
**Pass type:** REVIEW LENS — was every committed technology decision web-researched or
reality-checked, or was it asserted from training data?
**Branch:** `baseline/0001-ecommerce`
**Review date:** 2026-09-19 (all web lookups performed today)
**Also read as evidence:** `.memlog.md` (lines 26–34, 47, 50), `package.json`,
`docs/baseline/verification.md`, `docs/tooling-versions.md`

**Verdict:** the spine's *strategy* — conservative pins, no external infrastructure, one
origin — is sound and mostly was researched. Its *numbers* are not safe to freeze. The
`Stack` table carries the line "Kiểm chứng trên web ngày 2026-09-19", and the memlog does
record a real version sweep on that date. But the sweep missed three things: it read the
NestJS 11 line as frozen when it is actively shipping, it never checked the pinned version
against any vulnerability database, and it never checked a single *pairing*. The result is a
baseline that would freeze a NestJS release with two published CVEs, under a Deferred note
that asserts no CVE exists.

This report changes no file other than itself.

---

## Version table — pinned vs. verified today (2026-09-19)

| Component | Spine pins | Actual today | Status |
|---|---|---|---|
| Node.js | 24 LTS «Krypton» | 24.x Active LTS **until 2026-10-20**, then Maintenance; EOL 2028-04-30 | **RISK** (F3) |
| TypeScript | 5.x | 7.0.2 stable (2026-07-08); 6.0 shipped ~03/2026 | **STALE / UNVERIFIED** (F4) |
| NestJS | 11.1.9 | 11.2.5 (2026-09-15) on the 11 line; 12.0.3 latest overall | **STALE + VULNERABLE** (F1, F2) |
| PostgreSQL | 18.6 | 18.6 (2026-08-13) is the current minor of the current major | OK (F8) |
| drizzle-orm | 0.45.2 | 0.45.2 (2026-03-27) — is latest stable | OK, but **RISK** (F6) |
| drizzle-kit | 0.31.10 | 0.31.10 — is latest stable | **RISK vs PG 18** (F5) |
| React | 19.3.0 | 19.3.0 (2026-09-09) | OK |
| Vite | 8.3.0 | 8.3.0 (~2026-09-11) | OK |
| @vitejs/plugin-react | 6.x | 6.1.1; peer `vite ^8.0.0` | OK |
| @nestjs/schedule | *"tương thích Nest 11"* — no number | 6.1.3 pairs with Nest 11; 12.0.2 is `latest` and pairs with Nest 12 | **UNPINNED** (F7) |
| Caddy | 2.x | 2.11.4 (2026-06-03) — 2 is the current major | OK, minor unpinned (F9) |
| Docker / Compose | unversioned | n/a | not assessed |

---

## F1 — [CRITICAL] NestJS 11.1.9 has published, unpatched CVEs, and the spine asserts it does not

The spine's Deferred section says:

> **Nâng NestJS lên dòng 12.** Dòng 11 cố ý được chọn để code do agent viết không lệch bản.
> *Xem lại khi:* **có CVE cho dòng 11** — lúc đó nâng cấp là bắt buộc, không còn là lựa chọn.

That trigger condition was already met, twice, five months before this spine was written:

| CVE | Severity | Published | Affects | Fixed in |
|---|---|---|---|---|
| **CVE-2026-40879** — DoS via buffer overflow in `handleData()`, reachable with ~47 KB of small JSON messages in one TCP frame | **HIGH, CVSS 7.5** | 2026-04-23 | `@nestjs/core`, `@nestjs/microservices` < 11.1.19 | **11.1.19** |
| **CVE-2026-35515** — SSE injection: `SseStream._transform()` interpolates `message.type` / `message.id` into the SSE wire protocol without stripping `\r\n`; can spoof event types and reach client-side XSS | MEDIUM, CVSS 6.3 | 2026-04-10 | `@nestjs/core` < 11.1.18 | **11.1.18** |
| Snyk: *Always-Incorrect Control Flow Implementation* | **HIGH** | — | `@nestjs/core` < 11.1.17 | **11.1.17** |

`11.1.9 < 11.1.17 < 11.1.18 < 11.1.19`. All three apply.

(For precision: Snyk's fourth entry, *Incorrect Authorization*, affects `>= 11.1.13 < 11.1.14`
and does **not** apply to 11.1.9.)

**Why this is CRITICAL and not just "bump a patch":** `baseline-freeze.yaml` makes this table
binding. `CLAUDE.md §3` forbids an implementing agent from changing a frozen baseline decision.
So freezing 11.1.9 does not merely start the project on a vulnerable dependency — it makes the
vulnerable version the *governed* one, and the only documented escape hatch is a Deferred note
whose trigger the author believed had not fired. Every downstream `npm audit` will be red from
task 001, and the first agent to see it has no authority to fix it.

Mitigating note on exposure: CVE-2026-35515 needs an SSE endpoint and CVE-2026-40879 needs the
microservices transport — neither is in this architecture's surface as drawn (`PRD §6` bans
external services, and the spine has no SSE). That lowers *practical* risk. It does not lower
the governance problem, and the Snyk HIGH < 11.1.17 is not scoped away by either condition.

**Recommendation:** pin **`11.2.5`** (2026-09-15), the current head of the 11 line. Rewrite the
Deferred note to say the trigger has fired and the response is "move within line 11", not
"move to line 12".

---

## F2 — [CRITICAL] The factual premise for the 11.1.9 pin is wrong: line 11 is actively shipping

Memlog line 29 and line 33:

> NestJS 11.1.9 phát hành 14/11/2025, đã nằm yên 10 tháng.
> 11.1.9 là patch cuối của dòng 11 và đã 10 tháng tuổi. Ổn định là đúng ý muốn,
> nhưng **bản vá và bảo mật mới sẽ chỉ về dòng 12**.

Every clause after the release date is false. `nestjs/nest` releases, verified on GitHub today:

```
v12.0.3   2026-09-15
v11.2.5   2026-09-15   ← four days before this spine
v12.0.2   2026-09-14
v11.2.4   2026-09-14
v12.0.0   2026-08-27
v11.2.3   2026-08-25
v11.2.2   2026-08-25
v11.2.1   2026-08-14
v11.2.0   2026-08-14
v11.1.29  2026-08-10
v11.1.28  2026-07-08
```

Both majors are maintained in parallel, and 11.x patches ship on the *same day* as 12.x
patches. 11.1.9 is roughly twenty releases behind the head of its own line.

This is the clearest "asserted from training data, not checked" signal in the artifact. The
stated release date (2025-11-14) is accurate; everything that would have required reading a
release feed *past* that date is wrong. The memlog's version sweep (line 28) recorded
"NestJS 12.0.3 và NestJS 11.1.9" — it looked up the `latest` dist-tag and a remembered 11.x
number, and never enumerated the 11 line.

**The conservative strategy survives this correction intact, and that matters.** The real
reason for staying off 12 (memlog line 29 — Nest 12 moved to ESM-first, Vitest over Jest,
oxlint over ESLint, Rspack over Webpack, and agent-written code will be generated in the
Nest 10/11 CJS+Jest idiom) is **correct and confirmed**: NestJS 12 is ESM-only, loaded from
CJS callers through `require(esm)`. Moving 11.1.9 → 11.2.5 stays entirely inside that idiom.

**Recommendation:** correct the number to `11.2.5` and correct the memlog rationale. Verify
once that 11.2.0's minor-version changes do not disturb the CJS+Jest default, then treat the
11 line as live, not frozen.

---

## F3 — [HIGH] Node 24 stops being Active LTS in 31 days, and the table does not say so

Verified schedule for Node.js 24 "Krypton": initial release 2025-05-06, Active LTS from
2025-10-28, **Maintenance from 2026-10-20**, EOL 2028-04-30. Node 26 becomes Active LTS on
2026-10-28.

So "Node.js 24 LTS «Krypton»" is *true today* and false in a month. A baseline frozen this
week will spend essentially the whole of its v1 lifetime on a Maintenance-LTS runtime — which
receives critical fixes only, not the ongoing stream an Active LTS gets.

This is not necessarily the wrong call: Node 26 will be four days old when it becomes Active
LTS, and picking a freshly-promoted LTS contradicts the conservatism the spine applies
everywhere else. The defect is that the table states a status with a one-month shelf life as
if it were a property of the choice. `docs/tooling-versions.md` has an "Upgrade owner" and an
"Upgrade policy" column for exactly this; the stack table has neither.

**Recommendation:** annotate as "Node 24 «Krypton» — Active LTS until 2026-10-20, Maintenance
LTS thereafter, EOL 2028-04-30", and add a Deferred entry for the Node 26 step with a real
review date (e.g. after Node 26 reaches its first few LTS patches, ~Q1 2027).

**Related, and confirmed:** the spine's own catch in Deferred — `Node ≥ 20.12` in both
`docs/baseline/verification.md` and `package.json` is below NestJS 11's `≥ 20.19` floor — is
accurate. Two refinements when that commit is made:
- Vite 8 requires `^20.19.0 || ^22.12.0` (unchanged from Vite 7). Node 24 satisfies it.
- `@nestjs/schematics` (the CLI generators, inherited from Angular devkit) declares
  `^22.22.3 || ^24.15.0 || >=26` on its current line. **`docs/tooling-versions.md` records the
  machine's Node as 24.13.0**, which is below `24.15.0`. The runtime will be fine; `nest g`
  may refuse. Confirm the exact engines range of the *11-line* schematics before writing the
  `engines` field, and consider `>=24.15.0` rather than a bare `>=24`.

---

## F4 — [HIGH] "TypeScript 5.x" is the one stack entry that was never web-checked — and it is two majors behind

The memlog's version sweep (line 28) enumerates React, Vite, NestJS, PostgreSQL, Node and
Drizzle. **TypeScript is not in it.** It is also the only row in the stack table with no
supporting memlog entry of any kind.

Verified today: **TypeScript 7.0.2 is stable** (2026-07-08), the native-port compiler.
TypeScript 6.0 shipped around March 2026 as the stepping-stone release. "5.x" is two majors
behind, and "5.x" is precisely the value a model would emit from training data.

The choice may well be *right*, but for a reason the spine never states. NestJS 10 and 11
require **legacy** decorators plus `reflect-metadata` and `emitDecoratorMetadata`; the Stage-3
decorators do not emit `design:type` / `design:paramtypes` / `design:returntype`. The native
port did land legacy-decorator emit (`typescript-go#2343`, merged 2025-12-12, with fixes
through June 2026) and emits the same `__decorate` / `__metadata` / `__param` helpers, but
**NestJS has published no position or timeline on `tsgo`** (issue #15620 open, no `-b tsgo`
builder), and nobody has published a metadata-output diff across a real Nest app.

So the defensible statement is "TypeScript 5.9 / 6.x, pinned to a *specific minor*, because
Nest 11's DI reads legacy decorator metadata and the NestJS project has not validated the
native compiler." The spine instead states a bare unbounded `5.x` — which, for a repo where
`packages/shared` forces **one** TypeScript version across the NestJS back end and both Vite
front ends, is not a pin at all.

**Recommendation:** pin an exact minor, and record the decorator-metadata rationale. Do not
adopt TS 7 for the API while Nest 11 is the target.

---

## F5 — [HIGH] drizzle-kit 0.31.10 + PostgreSQL 18 is a pairing with a known, open defect — and nobody checked it

The spine pins PostgreSQL **18.6** and drizzle-kit **0.31.10**. That exact combination has an
open upstream bug:

- `drizzle-team/drizzle-orm` **#4944** — *"Drizzle Kit push to Postgres 18 produces unnecessary
  DROP SQL when the schema was NOT changed"*. On PG 18, a second `drizzle-kit push` against an
  unchanged schema emits `ALTER TABLE "tests" DROP CONSTRAINT "tests_id_not_null";`, which
  PostgreSQL rejects because the column is in a primary key. Reported against drizzle-orm
  0.44.5 / drizzle-kit 0.31.5; **opened 2025-09-30, still open**, no fix version documented.
- Related: **#5156** — repeated `DROP CONSTRAINT NOT NULL` on unchanged columns, PostgreSQL.

The root cause is a PostgreSQL 18 change: NOT NULL constraints are now represented as named
entries in the catalog, and drizzle-kit's differ misreads them as drift.

**Why this is HIGH for this architecture specifically.** AD-1 puts the product's central
invariant *at the data layer* — a `CHECK (stock >= 0)` plus a conditional `UPDATE`. The memlog
(line 31) chose Drizzle over Prisma precisely so that invariant is written and read as plain
SQL. That makes the **schema-migration tool part of the critical path of FR-14**, the feature
the whole PRD turns on. A differ that cannot tell "unchanged" from "drop the not-null on the
PK" is a bad neighbour for a constraint-carrying schema.

**Scope caveat, stated honestly:** the reports are against `drizzle-kit push`. A
`generate` + `migrate` workflow — the appropriate one for a governed baseline anyway — may not
hit this path. But the spine does not say which workflow it uses, so neither the exposure nor
the safety has been established by anyone.

**Recommendation:** before freeze, run the ten-minute reality check — `drizzle-kit generate`
and `migrate` against a real PostgreSQL 18.6 container with one table carrying a PK, a
`CHECK (stock >= 0)` and a `.notNull()` column, then run it a second time with no schema
change, and confirm the diff is empty. Record the result in the spine. Also state explicitly
that this project uses `generate`/`migrate`, not `push`.

---

## F6 — [MEDIUM] The Drizzle pins are current, but the *line* has been silent for six months

Confirmed: drizzle-orm **0.45.2** and drizzle-kit **0.31.10** (2026-03-27) are genuinely the
latest stable releases. The spine's numbers are right, and the memlog's characterisation
("pre-1.0, six months old, 1.0 at beta.4") is accurate.

What the Deferred note understates: the 1.0 beta line is **also** at `1.0.0-beta.4` from
March 2026. So in six months the project has shipped neither a 0.x patch nor a beta increment.
The spine's review trigger — *"Xem lại khi: Drizzle 1.0 ổn định"* — describes an event with no
current evidence of approaching, which makes it a review trigger that may never fire.

The correct framing is not "we are on a pre-1.0 library" (which the spine says) but "we are on
a library that has published nothing, stable or beta, for six months, while the database major
we pinned shipped a change its migration tool still mishandles" (F5). That is a
maintenance-velocity risk, and it lands on the component carrying FR-14.

**Recommendation:** keep the pins — they are the correct current versions — but restate the
Deferred entry with a calendar review date rather than an event trigger, and name the fallback
(raw SQL migrations via `node-postgres`, which the AD-1 style already reads as) if the project
stays dormant.

---

## F7 — [MEDIUM] `@nestjs/schedule` is not pinned at all, and `latest` resolves to the wrong major

The stack table row reads `@nestjs/schedule | tương thích Nest 11` — a prose placeholder in a
table whose entire purpose is to remove ambiguity. Verified today:

- `@nestjs/schedule` **12.0.2** is the `latest` dist-tag. Its 12.0.0 notes state the major "is
  aligned with the Nest 12 release line."
- The Nest-11-compatible line is **6.x**; the head is **6.1.3** (adds an `initialDelay` option
  to defer first execution). Its devDependencies track `@nestjs/common|core|platform-express`
  at 11.1.x.

An implementing agent reading this row will run `npm i @nestjs/schedule`, get 12.0.2 against
Nest 11, and hit a peer-dependency conflict — or worse, resolve it with `--legacy-peer-deps`
and ship a mismatched pair. This is not a hypothetical: AD-20 and the stock-reconciliation cron
in the `stock` section both depend on this package, and the reconciliation job is the mechanism
that detects a write bypassing AD-2.

**Recommendation:** pin `^6.1.3`. While there, note that `6.1.3`'s `initialDelay` is directly
useful for the reconciliation cron — it avoids running the ledger-vs-quantity comparison during
container start before the pool is warm.

---

## F8 — [LOW] PostgreSQL is correct, but the stated *reason* expires within weeks

Verified: **PostgreSQL 18.6** (2026-08-13) is the current minor of the current major — it fixes
28 security issues and 110+ bugs, and the 18 line skipped 18.5 due to a regression. Correct pin.

The footnote — *"PostgreSQL 19 cố ý không được chọn (đang beta)"* — is true today and has a
very short shelf life. **PostgreSQL 19 Beta 3** was released on the same day as 18.6
(2026-08-13), and the project's stated plan is release candidates and then **final release
around September/October 2026** — possibly within days of this spine.

The durable justification is not "19 is beta" but "18 is the current major, supported to
~2030, and a governed baseline does not adopt a database major in its first months."

**Recommendation:** restate the footnote on that basis so it does not become factually stale
the week PG 19.0 ships.

---

## F9 — [LOW] Caddy "2.x" is the right major but an unpinned one

Verified: Caddy **2.11.4** (2026-06-03) is current stable; 2 is the current major. "2.x" is not
stale.

For a deployment whose whole reproducibility story is one `compose.yaml` on one VPS, an
unpinned major-range image tag is the one place where a silent upstream change can break the
single-origin contract (AD-8) between a working local dev and a broken prod. Note that 2.11
changed reverse-proxy behaviour — it now rewrites the `Host` header to the upstream address
when the upstream is HTTPS. Harmless here (the NestJS upstream is plain HTTP inside the compose
network), but it is exactly the class of change that a floating tag delivers unannounced.

**Recommendation:** pin the image to `caddy:2.11` or an exact digest in `compose.yaml`.

---

## What was verified and is correct

Recorded so the reviewer gate does not re-litigate these:

- **React 19.3.0** — released 2026-09-09. Current. ✓
- **Vite 8.3.0** — current (~2026-09-11), Rolldown-based. ✓
- **@vitejs/plugin-react 6.x** — 6.1.1, peer `vite ^8.0.0`. **Compatible with the pinned Vite.** ✓
- **Vite 8 on Node 24** — Vite 8 requires `^20.19.0 || ^22.12.0`; Node 24 satisfies. ✓
- **NestJS 11 on Node 24** — explicitly supported; Nest 11 targets the Node 24 ecosystem
  including top-level await. Runtime floor `>= 20.19`. ✓ (CLI floor: see F3.)
- **NestJS 11 = CJS + Jest, NestJS 12 = ESM-first** — the memlog's reason for staying on line 11
  is confirmed, and is the reason F2's correction should go to 11.2.5 rather than 12.0.3. ✓
- **Drizzle + NestJS + Node 24 module interop** — no current blocking issue. drizzle-kit moved
  from `esbuild-register` to the `tsx` loader and works from both ESM and CJS; the 2023
  `"module": "Node16"` breakage is historical. The Nest+Drizzle integration ecosystem builds and
  tests on Node 22 and 24. ✓
- **The `Node ≥ 20.12` vs NestJS `≥ 20.19` conflict** already flagged in the spine's Deferred
  section is real and correctly diagnosed. ✓

---

## Pattern: where the research stopped

The memlog proves a genuine web sweep happened on 2026-09-19 — this is not an artifact written
from memory. The failures are specific and worth naming so the same gap does not recur:

1. **`latest` was read; lines were not enumerated.** The sweep captured the `latest` dist-tag
   for each package. For NestJS that returned 12.0.3, and the *second* number (11.1.9) came
   from memory rather than from the 11.x release feed. Any pin that deliberately sits off
   `latest` needs the line enumerated, not recalled. (F2)
2. **No vulnerability database was consulted** — for any pinned version, even though the spine
   makes "a CVE in line 11" a load-bearing governance trigger. One `npm audit` or one Snyk
   lookup would have caught F1. (F1)
3. **Items absent from the sweep list are exactly the stale ones.** TypeScript and Caddy are
   the two stack rows with no memlog entry; TypeScript is two majors behind (F4) and Caddy was
   right by luck. `@nestjs/schedule` was never resolved to a number at all (F7).
4. **Currency was checked; compatibility was not.** Not one *pairing* appears in the memlog.
   Three pairings mattered here: Nest 11 ↔ Node 24 (holds), plugin-react 6 ↔ Vite 8 (holds),
   drizzle-kit 0.31.10 ↔ PostgreSQL 18 (**does not hold cleanly** — F5). Two out of three is
   not a method.
5. **Status was recorded without its expiry.** "Node 24 = Active LTS" and "PG 19 = beta" are
   both true on 2026-09-19 and both change within weeks. A frozen baseline should record the
   date a status lapses, not just the status. (F3, F8)

---

## Blocking vs. non-blocking, for the gate

**Must be resolved before `baseline-freeze.yaml`:**
- F1 — pin `@nestjs/core` ≥ 11.1.19 (recommend 11.2.5); correct the Deferred CVE note.
- F2 — correct the "last patch of line 11" premise in the spine and the memlog.
- F5 — run the drizzle-kit ↔ PG 18.6 reality check and record the result; state
  `generate`/`migrate`, not `push`.

**Should be resolved before freeze (cheap, and each is a wrong number in a binding table):**
- F3 — annotate Node 24's LTS expiry; refine the `engines` range including the CLI floor.
- F4 — replace `TypeScript 5.x` with an exact minor plus the decorator-metadata rationale.
- F7 — pin `@nestjs/schedule@^6.1.3`.

**Can ride into `/speckit-plan`:**
- F6 — restate the Drizzle review trigger as a date.
- F8 — restate the PostgreSQL 19 footnote on support-window grounds.
- F9 — pin the Caddy image tag.

---

## Sources

All retrieved 2026-09-19.

- Node.js EOL / LTS schedule — https://endoflife.date/nodejs · https://endoflife.ai/article-nodejs-eol
- NestJS releases (11.x and 12.x feed) — https://github.com/nestjs/nest/releases
- `@nestjs/core` releases — https://newreleases.io/project/npm/@nestjs/core/release/11.1.28 · https://github.com/nestjs/nest/releases/tag/v11.1.28
- `@nestjs/core` vulnerability list — https://security.snyk.io/package/npm/@nestjs%2Fcore
- CVE-2026-35515 (SSE injection) — https://www.sentinelone.com/vulnerability-database/cve-2026-35515/
- CVE-2026-40879 (DoS) — https://www.sentinelone.com/vulnerability-database/cve-2026-40879/
- CVE-2026-3304 (multer via `@nestjs/platform-express`) — https://github.com/nestjs/nest/issues/16484
- NestJS migration guide (v12 ESM, Node floors, `nest upgrade`) — https://docs.nestjs.com/migration-guide
- `@nestjs/schedule` releases — https://github.com/nestjs/schedule/releases · https://www.npmjs.com/package/@nestjs/schedule
- PostgreSQL 18.6 + 19 Beta 3 announcement — https://www.postgresql.org/about/news/postgresql-186-1711-1615-1519-1424-and-19-beta-3-released-3365/
- PostgreSQL 19 Beta 1 — https://www.postgresql.org/about/news/postgresql-19-beta-1-released-3313/
- PostgreSQL 18.6 release notes — https://www.postgresql.org/docs/release/18.6/
- drizzle-kit push vs PostgreSQL 18 — https://github.com/drizzle-team/drizzle-orm/issues/4944 · https://github.com/drizzle-team/drizzle-orm/issues/5156
- drizzle PG18 `RETURNING OLD/NEW` feature request — https://github.com/drizzle-team/drizzle-orm/issues/5109
- drizzle-orm npm / releases — https://www.npmjs.com/package/drizzle-orm · https://orm.drizzle.team/docs/latest-releases
- React 19.3.0 — https://github.com/react/react/releases/tag/v19.3.0
- Vite 8.0 announcement / Node requirement — https://vite.dev/blog/announcing-vite8 · https://www.npmjs.com/package/vite
- `@vitejs/plugin-react` — https://www.npmjs.com/package/@vitejs/plugin-react · https://github.com/vitejs/vite-plugin-react/releases
- TypeScript 6.0 announcement — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ · https://www.npmjs.com/package/typescript
- NestJS on TypeScript 7 / tsgo decorator metadata — https://fernforge.github.io/devnotes/nestjs-typescript-7/
- `emitDecoratorMetadata` reference — https://www.typescriptlang.org/tsconfig/emitDecoratorMetadata.html
- Caddy releases / EOL — https://github.com/caddyserver/caddy/releases · https://endoflife.date/caddy
- `@nestjs/schematics` engines — https://newreleases.io/project/npm/@nestjs/schematics/release/12.0.0 · https://docs.nestjs.com/cli/overview
