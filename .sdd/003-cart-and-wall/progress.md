# SDD ledger — plan: specs/003-cart-and-wall/tasks.md (Phase 10: Convergence, T016–T019)

**Feature**: `003-cart-and-wall` · **Track**: B · **Engine**: superpowers / subagent-driven-development
**Handoff**: `.sdd/003-cart-and-wall/handoff.yaml` — `/sdd-validate` PASS (2026-09-25, b1ab9ea)
**Worktree**: `.claude/worktrees/003-convergence` · **Branch**: `feat/003-convergence` (from local `main` b1ab9ea)
**Spec** (binding authority): `specs/003-cart-and-wall/spec.md` · **Plan**: `plan.md` + `tasks.md`

Artifact locations: CLAUDE.md §2 overrides the skill default — briefs/reports/ledger live in
`.sdd/003-cart-and-wall/`; review packages are scratch under `.superpowers/sdd/` (gitignored).
T001–T015 ran before this ledger existed (commits ca9a377..5215481); only Phase 10 is tracked here.

## Environment gate (2026-09-25)

| Gate | Result |
|---|---|
| `npm install` in worktree | ✅ |
| `packages/shared`, `packages/ui` dist | ⚠️ absent in a fresh worktree (dist is gitignored) → `npm run build` in both; storefront then 121/121 |
| Vitest storefront / ui / shared | ✅ 121 / 14 / 69 |
| glue tests | ✅ 30/30 |
| `npm run lint` | ✅ |
| `apps/api` Jest | ❌ Nest bootstrap exits 1 — pre-existing, reproduced on unmodified `main` (see SDD-004 report). Not a task gate; each report must name it. |

## Pre-flight scan

| Pair / task | Shared surface | Finding |
|---|---|---|
| T016 ↔ T017 | `CartPage.tsx`, `CartPage.test.tsx` | T016 changes status state + Đặt đơn gating; T017 changes price/subtotal rendering for unchecked lines. Same file → **sequential T016 → T017**; T017 builds on T016's status binding. |
| T016 ↔ T018 | `CartPage.tsx` ("Đơn giá" label) | Disjoint lines; sequential anyway. |
| T017 ↔ T018 | `PlaceOrderPage.tsx` (+ test) | T017 adds failure branch / no-0₫; T018 renames heading. **Sequential T017 → T018.** |
| T016/T017/T018 ↔ T019 | e2e selectors (heading text, Đặt đơn state) | T019 must run last and target the post-T018 copy. |
| T016 self | pending reason copy not in spec | Ruling R1 below. |
| T017 self | "never render 0 ₫" does not say what to render | Ruling R2 below. |
| T018 self | consistent | — |
| T019 self | e2e needs the running stack; containers serve `main`'s build, not the worktree | Implementer must run e2e against a stack built from the worktree, or report exactly what could not run. |

Ruling R1: While a line-status check for the current Cart lines is pending (including the first check), Đặt đơn is disabled with the visible reason "Đang kiểm tra tình trạng hàng." — FR-010 requires *a* visible reason and none is specified for this state; the phrase uses only glossary-neutral words — if wrong, a one-string copy change.
Ruling R2: A line with no successful status check shows its name placeholder but NO price and NO price × quantity, and the Tổng tiền hàng is not rendered until every line has a successful status; PlaceOrderPage reuses the Giỏ hàng failure message "Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang." — FR-006 forbids showing non-current prices and `0 ₫` is a false price — if wrong, a rendering tweak on two pages.
Ruling R3: Execution order T016 → T017 → T018 → T019, strictly sequential — shared files — costs only wall-clock.

---
Ruling R4: T019 runs e2e against a throwaway Caddy container (`e2e-proxy-003conv`, port 8080, network `shop-online_default`) serving this worktree's `apps/storefront/dist`; the user's `shop-online_*` stack is never stopped or recreated — the running proxy bind-mounts the main checkout's dist, so testing through it would test `main`, and restarting it is a side effect outside the worktree — if wrong, e2e evidence came from a side proxy that differs from `ops/compose.yaml`, re-run through compose after merge.

Task T016: implementer done 1d7c3ff (BASE 10543b1); review dispatched
Task T016: minor (deferred): setIsChecking(false) duplicated in success/error branches (CartPage.tsx:60,77)
Task T016: minor (deferred): no test for unmount while a status check is pending
Task T016: minor (deferred): pre-existing dead `lines.length === 0` branch in disabledReason (CartPage.tsx:189-190)
Task T016: complete (commits 10543b1..1d7c3ff, review clean)
Task T017: implementer done 1665067 (BASE 15abcef); review dispatched (flake concern named)
Ruling R5: T017 allowed scope is extended with `apps/storefront/src/cart/lineSubtotal.ts` + `lineSubtotal.test.ts` so the R2 gate + Tổng tiền hàng computation lives once for CartPage and PlaceOrderPage — the task review's Important finding (verbatim duplicated logic block) cannot be fixed inside the original file list without coupling one page to the other — if wrong, one small helper file to inline back.
Task T017: minor (deferred): redundant per-line `status?.product` check inside `if (allLinesPriced)` (disappears with the helper)
Task T017: minor (deferred): pre-existing `resolveFirst` capture in CartPage.test.tsx:491-528 is timing-sensitive; one unreproduced transient failure reported
Task T017: minor (deferred): PlaceOrderPage failure paragraph has no live region (CartPage's disabledReason has none either)
Task T017: fix round 1/5 (1 addressed, 0 open — duplicated allLinesPriced/subtotal block → computeLineSubtotal; commits 1665067..38d8361)
Task T017: complete (commits 15abcef..38d8361, review clean)
Task T018: minor (deferred): unlabelled per-line price relies on reading order + "₫"; a stricter AA audit may want an aria-label with a glossary term
Task T018: minor (deferred): RED evidence in task-018-report.md is paraphrased, not raw output
Task T018: complete (commits 20ad477..d41d3c8, review clean)
Task T019: implementer done 5d59afc (BASE ac7c24f); e2e 33/33 via e2e-proxy-003conv (stopped); review dispatched
Task T019: minor (deferred): third vacuous SC-005 field-name check (`quantity":`) dropped without mention in report
Task T019: minor (deferred): response-body capture awaits ≥1 body, not all pending `.text()` promises — theoretical race
Task T019: minor (deferred): FR-017 uses hardcoded categoryId=1 / search term (existing convention)
Task T019: complete (commits ac7c24f..5d59afc, review clean)
