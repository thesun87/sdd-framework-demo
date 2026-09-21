# Phase 0 — Research: Catalog Browse

**Feature**: `001-catalog-browse`
**Date**: 2026-09-21

## No unresolved Technical Context clarifications

All Technical Context values are pinned by the frozen Baseline, existing feature `000` implementation, workspace package files, and `docs/tooling-versions.md`. No `NEEDS CLARIFICATION` remains.

| Topic | Source |
|---|---|
| Runtime/framework versions | `.specify/memory/constitution.md`, `docs/tooling-versions.md`, workspace `package.json` files |
| Verification commands | `docs/baseline/verification.md` |
| Product/Category/Stock semantics | `docs/baseline/glossary.md`, PRD FR-1…FR-5 |
| Search normalization rule | Architecture AD-11 and existing seed normalization reference |
| Stock status disclosure/freshness | Architecture AD-19 and AD-20 |
| Track B impact | `specs/001-catalog-browse/impact-analysis.md` |

---

## D-1 — Product list contract becomes paginated, with compatible defaults

**Decision**: `GET /api/products` remains the Product-list entry point, but for feature `001` it returns the first page by default (`page=1`, `pageSize=24`) and includes pagination metadata. Requests above `pageSize=100` are clamped to 100. The previous omitted-parameter call remains valid and intentionally maps to the default first page.

**Rationale**: PRD FR-3 forbids returning the whole Product catalog in one response and sets default 24 / max 100. Keeping the same entry point with default pagination preserves the public browse URL while changing the list contract in a coordinated API/shared/client update.

**Alternatives considered**:

- Keep unpaginated `{items}` forever — violates FR-3 at 20,000 Products.
- Add a second Product-list endpoint and leave the old one unpaginated — creates two storefront list contracts and increases regression risk with no Baseline requirement.
- Error on `pageSize > 100` — contradicts PRD FR-3, which says to clamp to 100.

## D-2 — Public Category list is a storefront read contract

**Decision**: add a storefront Category list contract exposing flat Categories and counts of Products visible in each Category, plus an all-Products root option handled by the storefront UI. Category counts include out-of-stock Products because out-of-stock Products remain visible.

**Rationale**: PRD FR-1 and UX require a flat Category sidebar, all-products root, and counts. Category is already a flat entity in the existing schema (`Product` belongs to 0..1 `Category`), so the feature consumes existing catalog data rather than adding a hierarchy or management flow.

**Alternatives considered**:

- Encode Categories only in Product list responses — insufficient for rendering an initial sidebar and empty Categories.
- Add hierarchical Category data — explicitly out of scope for v1.
- Hide empty Categories — conflicts with empty Category behaviour in the spec and UX baseline.

## D-3 — Product-name search is cross-Category and name-only

**Decision**: nonblank search runs across all Products visible in the storefront catalog and clears Category scope. Search matches Product name only, is case-insensitive, and is accent-insensitive for Vietnamese names. Description search, Category-name search, fuzzy matching, suggestions, and relevance ranking remain out of scope.

**Rationale**: PRD FR-2 defines Product-name search and explicitly excludes richer search behaviours. UX specifies search in the storefront header and cross-Category results. Keeping the query name-only prevents accidental expansion into unsupported ranking/filter semantics.

**Alternatives considered**:

- Combine Category filter and search query — contradicts UX behaviour that search is cross-Category and resets Category/page context.
- Search descriptions too — explicitly excluded by PRD FR-2.
- Add fuzzy/relevance search — explicitly excluded and unnecessary for the required accent-insensitive exact-name behaviour.

## D-4 — Search normalization must not be computed on the query target at read time

**Decision**: Product-name search must use normalized stored Product names and compare against a normalized query value. If existing data needs normalization/index support, add it through append-only migration/backfill or write-path normalization support. Do not make the read predicate normalize the stored Product name on the left side.

**Rationale**: Architecture AD-11 exists to keep search indexable and performant at 20,000 Products. The current seed normalization rule is reusable as the behavioural reference, but this feature must avoid creating a second inconsistent Vietnamese normalization rule.

**Alternatives considered**:

- Normalize stored Product name inside the read predicate — violates AD-11 and risks p95 read performance.
- Depend only on seed-time normalization — insufficient once non-seed Product writes exist.
- Add an external search service — out of scope and prohibited by runtime dependency constraints.

## D-5 — Catalog keeps using the public Stock status seam

**Decision**: catalog reads continue obtaining Stock status through the public Stock module seam. Catalog must not query or join Stock/Stock ledger tables directly, and must not introduce any Stock write path.

**Rationale**: AD-5 says foreign keys are not permission to cross module data boundaries. AD-19/AD-20 require exact Stock non-disclosure and fresh Stock status. Existing `000` tests already prove these behaviours and must stay green.

**Alternatives considered**:

- Join Product pages directly to Stock for performance — breaks module boundary and raises exact Stock leakage risk.
- Cache Stock status in the Product-list layer — violates AD-20 and the feature spec.
- Add a catalog-owned Stock read model — unnecessary for this feature and would require a new consistency decision not present in the Baseline.

## D-6 — Stable deterministic ordering is required for pagination

**Decision**: Product list pagination uses deterministic ordering that remains stable across all-products, Category, and search views. If a later implementation needs a richer ordering rule, it must remain Baseline-compatible and test for no duplicate/missing Products across pages.

**Rationale**: Current `000` list orders by Product id. Pagination without deterministic ordering creates duplicates or gaps between pages, especially when list size exceeds the default page size. The spec does not introduce user-selected sorting, so a stable baseline-compatible default is enough.

**Alternatives considered**:

- Leave database natural order unspecified — unstable and untestable.
- Add user-facing sort controls — out of scope; filters/sorting beyond baseline default are not part of `001`.
- Use relevance ranking for search — explicitly out of scope.

## D-7 — Empty results are normal UI states, not errors

**Decision**: empty Category, empty search, and out-of-range page results all return successful empty-list states with Vietnamese explanatory copy. Product detail for a missing Product remains not found.

**Rationale**: PRD FR-2 and UX treat no-match search and empty lists as normal. Keeping list emptiness separate from Product-detail not found prevents false error handling and preserves existing `000` detail behaviour.

**Alternatives considered**:

- Redirect empty pages to page 1 — hides deep-link state and makes pagination harder to test.
- Return not found for empty Category/search — contradicts the spec and UX.
- Reuse the same copy for all empty states — loses required user context for empty Category vs no search match.
