# Tasks: Catalog Browse

**Input**: Design documents from `specs/001-catalog-browse/`
**Traceability**: Implements requirements `FR-001` through `FR-024` from `spec.md`.

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/storefront-http.md`, `quickstart.md`

**Tests**: Required. The constitution requires TDD for post-`000` features: write tests first, verify they fail for the missing behaviour, then implement.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent increment. Track B execution later uses task briefs for exact allowed/forbidden scope.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because it touches different files and has no dependency on incomplete tasks
- **[Story]**: User story label for traceability (`US1`, `US2`, `US3`, `US4`)
- Every task includes concrete file paths

---

## Phase 1: Setup (Shared Test Data and Fixtures)

**Purpose**: Prepare reusable fixture data and test helpers used by all Product browse/search/pagination stories.

- [x] T001 [P] Extend feature seed data in `db/seed.ts` to include at least three Categories, one Category with more than 24 Products, one Category with zero Products, at least one Product without Category, Vietnamese accented Product names including `Bình giữ nhiệt`, and at least one out-of-stock Product.
- [x] T002 [P] Add catalog browse API fixture helpers in `apps/api/src/modules/catalog/catalog-test-support.ts` for Product, Category, Product image, and Stock rows where Product `category_id` follows `Nullable relation to Category; NULL means the Product appears in all Products and search, but in no specific Category`.
- [x] T003 [P] Create storefront catalog fixture factories in `apps/storefront/src/test/catalogFixtures.ts` for Product summaries, Category summaries, pagination metadata, and Product detail responses.
- [x] T004 [P] Extend E2E seed assumptions in `e2e/storefront-journey.e2e-spec.ts` so scenarios can address all Products, a populated Category, an empty Category, uncategorized Products, accent-insensitive search, and out-of-stock Products.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contract, parsing, and storage support that MUST be complete before any user story implementation.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T005 [P] Add failing shared schema tests in `packages/shared/src/storefront/product.test.ts` for `CategorySummary`, `ProductListQuery`, `Pagination`, and paginated `ProductsListResponse`, quoting constraints: `id` is `Existing Category id`, `name` is `Category display name`, `productCount` is `Number of Products visible in the storefront for this Category, independent of Stock status`, `pageSize` is `Effective page size after default/clamp`, and `items` is `Array of ProductSummary for the requested page only`.
- [x] T006 Extend storefront shared schemas and exports in `packages/shared/src/storefront/product.ts` and `packages/shared/src/storefront/index.ts` with `CategorySummary`, `CategoriesListResponse`, `ProductListQuery`, `Pagination`, and paginated `ProductsListResponse`; enforce `Default request returns page 1 with page size 24`, `Requesting page size > 100 returns page size 100, not an error`, and strict rejection of exact Stock disclosure fields.
- [x] T007 [P] Add append-only Product browse/search index support in `db/schema/catalog.ts` and generated files under `db/migrations/` for deterministic Product list reads by `category_id` and Product-name search by `name_normalized`, without adding Product variants, hierarchical Category, or Product discontinuation state.
- [x] T008 [P] Add failing Product list query parsing tests in `apps/api/src/modules/catalog/catalog-query.spec.ts` for `categoryId` as `Optional positive integer; when present without nonblank search, scope is one Category`, `q` as `Optional string; blank/whitespace behaves like no search; nonblank search runs across all Products visible in the storefront and clears Category scope`, `page` as `Optional positive integer; values below 1 behave as page 1`, and `pageSize` as `Optional positive integer; default 24; maximum 100 with clamp`.
- [x] T009 Implement Product list query parsing in `apps/api/src/modules/catalog/catalog-query.ts` with effective defaults and clamp rules from `data-model.md` and `contracts/storefront-http.md`.
- [x] T010 [P] Add failing router tests in `apps/storefront/src/router/router.test.ts` for reloadable deep links that preserve Category, search, page, and Product detail navigation without caching Product or Stock status data.

**Checkpoint**: Foundation ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 — Guest browses all Products and flat Categories (Priority: P1) 🎯 First Increment

**Goal**: A Guest opens the storefront, sees **Tất cả sản phẩm** plus flat Categories, chooses a Category, and sees the correct Product grid including uncategorized Products only in all Products.

**Independent Test**: Seed multiple Categories and Products, including uncategorized and out-of-stock Products. Verify `GET /api/categories`, `GET /api/products`, `GET /api/products?categoryId=...`, and the storefront Category UI without relying on search or page navigation.

### Tests for User Story 1

> Write these tests FIRST and verify they fail before implementation.

- [ ] T011 [P] [US1] Add failing API contract tests for `GET /api/categories` in `apps/api/src/modules/catalog/catalog-categories.int-spec.ts`, covering flat `items[]`, `productCount` including out-of-stock Products, empty Categories with `productCount: 0`, no persisted **Tất cả sản phẩm** Category, public Guest access, and no exact Stock fields.
- [ ] T012 [P] [US1] Add failing API tests for Category-scoped Product lists in `apps/api/src/modules/catalog/catalog-products-list.int-spec.ts`, covering all Products, one Category, uncategorized Products appearing in all Products and search but not in a specific Category, out-of-stock Products visible, `Cache-Control: no-store`, and strict absence of exact Stock.
- [ ] T013 [P] [US1] Add failing storefront browse tests in `apps/storefront/src/pages/HomePage.test.tsx` for initial **Tất cả sản phẩm**, flat Category list, Category counts, Category selection clearing search state, empty Category copy `Danh mục này chưa có sản phẩm nào.`, and text-visible Stock status.
- [ ] T014 [P] [US1] Add failing E2E browse scenario in `e2e/storefront-journey.e2e-spec.ts` for Guest access to all Products, populated Category, empty Category, uncategorized Product visibility, and out-of-stock Product visibility.

### Implementation for User Story 1

- [ ] T015 [US1] Implement Category read queries in `apps/api/src/modules/catalog/catalog.repository.ts` for flat Categories where Category `id` is `Internal positive integer identity`, Category `name` is `Required display name`, Category has `no parent or child Category in v1`, and Category count reflects Products visible in that Category regardless of Stock status.
- [ ] T016 [US1] Extend catalog service browse behaviour in `apps/api/src/modules/catalog/catalog.service.ts` so all Products, one Category, Product `imagePath`, and Stock status are composed without direct `stock` or Stock ledger table reads.
- [ ] T017 [US1] Add public `GET /api/categories` handling in `apps/api/src/modules/catalog/categories.controller.ts` and register it in `apps/api/src/modules/catalog/catalog.module.ts`, with no login redirect and no exact Stock fields.
- [ ] T018 [US1] Extend storefront API calls in `apps/storefront/src/api/client.ts` to fetch Categories and Product lists with optional `categoryId`, validating responses through `packages/shared` schemas and using `cache: "no-store"`.
- [ ] T019 [US1] Create accessible Category navigation in `apps/storefront/src/components/CategorySidebar.tsx` with **Tất cả sản phẩm** as a UI root, flat Category entries, product counts, selected state, and text that does not introduce non-canonical Category synonyms.
- [ ] T020 [US1] Integrate Category navigation and scoped Product grid rendering in `apps/storefront/src/pages/HomePage.tsx`, preserving Guest access, out-of-stock Product visibility, uncategorized Product semantics, and the empty Category copy.

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 — Guest searches Product names accent-insensitively (Priority: P1)

**Goal**: A Guest searches Product names with Vietnamese accents omitted or present, with case-insensitive matching across all storefront Products and no description/Category/fuzzy matching.

**Independent Test**: Seed Products with accented names, description-only matches, unrelated names, and out-of-stock Products. Verify API and UI search results for accented, accentless, mixed-case, blank, and no-match queries.

### Tests for User Story 2

> Write these tests FIRST and verify they fail before implementation.

- [ ] T021 [P] [US2] Add failing Product-name normalization tests in `packages/shared/src/storefront/product-name-normalization.test.ts` proving `Bình giữ nhiệt` matches `binh giu nhiet`, `Đồ uống` normalizes consistently, mixed casing does not change matches, and blank/whitespace search is treated as no search.
- [ ] T022 [P] [US2] Add failing API search tests in `apps/api/src/modules/catalog/catalog-products-search.int-spec.ts` covering `q`, accent-insensitive Vietnamese Product-name matching, case-insensitive matching, description-only and Category-name non-matches, empty search copy conditions, cross-Category search clearing Category scope, out-of-stock Products visible, no exact Stock, and `Cache-Control: no-store`.
- [ ] T023 [P] [US2] Add failing storefront search tests in `apps/storefront/src/pages/HomePage.test.tsx` for search input, nonblank search clearing Category scope and resetting page 1, blank search returning to all Products page 1, no-match copy `Không có sản phẩm nào khớp với «{từ khoá}».`, and no system error.
- [ ] T024 [P] [US2] Add failing E2E search scenarios in `e2e/storefront-journey.e2e-spec.ts` for `binh giu nhiet`, different casing, description-only non-match, no-match copy, out-of-stock search result visibility, and browser back/forward over search state.

### Implementation for User Story 2

- [ ] T025 [US2] Extract and export a single Product-name normalization helper in `packages/shared/src/storefront/product-name-normalization.ts` and `packages/shared/src/storefront/index.ts` using the existing write/backfill rule: lowercase, replace `đ` with `d`, Unicode NFD, remove combining marks, trim.
- [ ] T026 [US2] Update `db/seed.ts` to use the shared Product-name normalization helper when populating `name_normalized`, avoiding a second inconsistent Vietnamese normalization rule.
- [ ] T027 [US2] Implement Product-name search in `apps/api/src/modules/catalog/catalog.repository.ts` using stored `product.name_normalized` compared to a normalized query parameter; do not normalize the stored Product name on the left side of the read predicate, and do not search Product description or Category name.
- [ ] T028 [US2] Integrate Product-name search state in `apps/storefront/src/pages/HomePage.tsx`, including search submission, blank search reset, no-match copy, Category clearing, and Product grid reuse without exact Stock disclosure.

**Checkpoint**: User Story 2 is independently functional and testable with User Story 1 preserved.

---

## Phase 5: User Story 3 — Guest pages through large Product lists (Priority: P1)

**Goal**: A Guest receives and navigates only one Product-list page at a time for all Products, Category browse, and search results.

**Independent Test**: Seed more than 24 Products in all Products, a Category, and a search result set. Verify default page size 24, page size clamp 100, pagination metadata, empty out-of-range pages, deterministic ordering, deep links, and no full-catalog response.

### Tests for User Story 3

> Write these tests FIRST and verify they fail before implementation.

- [ ] T029 [P] [US3] Add failing API pagination tests in `apps/api/src/modules/catalog/catalog-products-pagination.int-spec.ts` covering `page`, `pageSize`, default page size 24, clamp above 100, values below 1 as page 1, `items.length` ≤ `pagination.pageSize`, `totalItems`, `totalPages`, empty out-of-range pages, deterministic ordering, and no full catalog response.
- [ ] T030 [P] [US3] Add failing storefront pagination tests in `apps/storefront/src/pages/HomePage.test.tsx` for page controls, current page and total pages context, page reset on Category/search changes, preserving current scope while paging, and empty out-of-range state.
- [ ] T031 [P] [US3] Add failing E2E pagination and performance coverage in `e2e/performance.e2e-spec.ts` for a large Product list, default 24 Products, max 100 Products, no duplicate/missing Products across pages, and usable page at the Baseline p95 target.

### Implementation for User Story 3

- [ ] T032 [US3] Extend Product list repository reads in `apps/api/src/modules/catalog/catalog.repository.ts` to return only the requested page plus matching count for all-products, Category, and search scopes, with stable deterministic ordering by Product id and no full-catalog response.
- [ ] T033 [US3] Extend Product list service and controller response assembly in `apps/api/src/modules/catalog/catalog.service.ts` and `apps/api/src/modules/catalog/catalog.controller.ts` to return `pagination.page` as `Effective current page, minimum 1`, `pagination.pageSize` as `Effective page size after default/clamp`, `pagination.totalItems` as `Count of Products in the current all-products, Category, or search result set`, and `pagination.totalPages` as `Number of pages for current result set; may be 0 when there are no results`.
- [ ] T034 [US3] Implement URL query-string support for Category/search/page deep links in `apps/storefront/src/router/router.ts` and `apps/storefront/src/router/usePathname.ts`, preserving browser back/forward behaviour and route announcements.
- [ ] T035 [US3] Create accessible Product list pagination controls in `apps/storefront/src/components/PaginationControls.tsx` with current page, total pages, disabled bounds, and text-visible navigation state.
- [ ] T036 [US3] Integrate pagination metadata, page changes, page reset rules, and URL state in `apps/storefront/src/pages/HomePage.tsx` for all-products, Category, and search scopes.
- [ ] T037 [US3] Update storefront API request encoding in `apps/storefront/src/api/client.ts` so `fetchProducts` sends `categoryId`, `q`, `page`, and `pageSize`, while preserving `cache: "no-store"` and schema validation.

**Checkpoint**: User Story 3 is independently functional and testable with User Stories 1 and 2 preserved.

---

## Phase 6: User Story 4 — Guest opens Product detail from browse or search (Priority: P2)

**Goal**: A Guest opens Product detail from all Products, Category results, or search results and sees the existing Product detail contract with fresh Stock status and no exact Stock disclosure.

**Independent Test**: From all-products, Category, and search results, open Product detail and verify name, description, price, images, Stock status, no exact Stock, no-store behaviour, and not-found handling.

### Tests for User Story 4

> Write these tests FIRST and verify they fail before implementation.

- [ ] T038 [P] [US4] Extend Product detail API regression tests in `apps/api/src/modules/catalog/catalog-product-detail.int-spec.ts` for detail opened after browse/search, `Cache-Control: no-store`, no exact Stock fields, fresh Stock status after Stock changes, and 404 shared error envelope without stack traces.
- [ ] T039 [P] [US4] Extend storefront detail tests in `apps/storefront/src/pages/ProductDetailPage.test.tsx` for Product name, description, integer VND price, ordered image list, text-visible Stock status, no exact Stock display, and not-found rendering.
- [ ] T040 [P] [US4] Extend E2E Product detail journeys in `e2e/storefront-journey.e2e-spec.ts` for opening the same Product from all Products, Category result, and search result, then navigating back/forward without stale Stock status.

### Implementation for User Story 4

- [ ] T041 [US4] Preserve Product card detail links and accessible Product summary rendering in `apps/storefront/src/components/ProductCard.tsx` for Products reached from all-products, Category, and search results, without adding Cart, Order, or exact Stock UI.
- [ ] T042 [US4] Preserve Product detail fetch/render behaviour in `apps/storefront/src/pages/ProductDetailPage.tsx` so Product detail includes name, description, price, images, and Stock status, while missing Product remains not found and exact Stock remains absent.

**Checkpoint**: User Story 4 is independently functional and testable with User Stories 1–3 preserved.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Regression guards and final verification across the completed feature.

- [ ] T043 [P] Strengthen shared response guard assertions in `apps/api/src/modules/catalog/catalog-response-assertions.ts` so Product list, Category list, and Product detail tests fail if `quantity`, `stock`, or any numeric exact Stock disclosure appears in Guest/Customer-visible responses.
- [ ] T044 [P] Extend security header and cache regression coverage in `e2e/security-headers.e2e-spec.ts` for `GET /api/categories`, paginated `GET /api/products`, searched Product lists, and Product detail responses containing `stockStatus`.
- [ ] T045 [P] Update route announcement and Stock status accessibility tests in `packages/ui/src/RouteAnnouncer.test.tsx` and `packages/ui/src/StockStatusLabel.test.tsx` for Category/search/page navigation and text-visible `Còn hàng` / `Hết hàng` status.
- [ ] T046 Run the four-command verification contract from `docs/baseline/verification.md` and validate `specs/001-catalog-browse/quickstart.md`: `npm test`, `npm run lint`, `npm run test:regression`, and `npm run build`, confirming Product workspaces ran and were not skipped.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — blocks all user stories.
- **User Stories (Phases 3–6)**: Depend on Foundational completion.
  - US1, US2, and US3 are all P1 requirements. They may be worked in parallel after Foundation, but release readiness for feature `001` requires all three.
  - US4 is P2 and depends on the browse/search surfaces only for journey coverage; the Product detail contract itself remains independently testable.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundation. Provides Category list and scoped browse MVP increment.
- **US2 (P1)**: Starts after Foundation. Integrates with Product list contract and can proceed in parallel with US1 if file conflicts are coordinated.
- **US3 (P1)**: Starts after Foundation. Completes pagination required by FR-3 and should be validated before release even if implemented after US1/US2.
- **US4 (P2)**: Starts after Foundation and may be validated after any Product list path exists; full journey coverage depends on US1 and US2.

### Within Each User Story

- Tests MUST be written and fail before implementation.
- Shared schemas and query parsing before API endpoints.
- Repository reads before service/controller assembly.
- API contract before storefront integration.
- Storefront unit tests before E2E journey finalization.
- Story checkpoint validation before moving to the next priority when working sequentially.

---

## Parallel Opportunities

- **Setup**: T001, T002, T003, and T004 can run in parallel.
- **Foundation**: T005, T007, T008, and T010 can run in parallel; T006 depends on T005; T009 depends on T008.
- **US1 tests**: T011, T012, T013, and T014 can run in parallel.
- **US2 tests**: T021, T022, T023, and T024 can run in parallel.
- **US3 tests**: T029, T030, and T031 can run in parallel.
- **US4 tests**: T038, T039, and T040 can run in parallel.
- **Polish**: T043, T044, and T045 can run in parallel after story implementation.

---

## Parallel Example: User Story 1

```bash
Task: "Add failing API contract tests for GET /api/categories in apps/api/src/modules/catalog/catalog-categories.int-spec.ts"
Task: "Add failing storefront browse tests in apps/storefront/src/pages/HomePage.test.tsx"
Task: "Add failing E2E browse scenario in e2e/storefront-journey.e2e-spec.ts"
```

After tests fail, implement sequentially where files overlap:

```bash
Task: "Implement Category read queries in apps/api/src/modules/catalog/catalog.repository.ts"
Task: "Add public GET /api/categories handling in apps/api/src/modules/catalog/categories.controller.ts"
Task: "Create accessible Category navigation in apps/storefront/src/components/CategorySidebar.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Add failing Product-name normalization tests in packages/shared/src/storefront/product-name-normalization.test.ts"
Task: "Add failing API search tests in apps/api/src/modules/catalog/catalog-products-search.int-spec.ts"
Task: "Add failing storefront search tests in apps/storefront/src/pages/HomePage.test.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "Add failing API pagination tests in apps/api/src/modules/catalog/catalog-products-pagination.int-spec.ts"
Task: "Add failing storefront pagination tests in apps/storefront/src/pages/HomePage.test.tsx"
Task: "Add failing E2E pagination and performance coverage in e2e/performance.e2e-spec.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Extend Product detail API regression tests in apps/api/src/modules/catalog/catalog-product-detail.int-spec.ts"
Task: "Extend storefront detail tests in apps/storefront/src/pages/ProductDetailPage.test.tsx"
Task: "Extend E2E Product detail journeys in e2e/storefront-journey.e2e-spec.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: US1 Category/all-Products browse as the first independently demonstrable increment.
4. Stop and validate US1 independently.

### Feature Release Scope

Because US1, US2, and US3 are all Priority P1 in `spec.md`, production readiness for `001-catalog-browse` requires:

1. US1 flat Category/all-Products browse.
2. US2 accent-insensitive Product-name search.
3. US3 pagination default 24 / max 100 with no full-catalog response.
4. US4 Product detail preservation before final regression, because it protects existing `000` behaviour across new journeys.

### Incremental Delivery

1. Setup + Foundation → shared schemas, query parsing, fixture data, and indexes ready.
2. US1 → browse Categories and all Products → validate independently.
3. US2 → add Product-name search → validate independently and with US1.
4. US3 → add full pagination/deep-link behaviour → validate independently and with US1/US2.
5. US4 → preserve Product detail journey → validate full storefront flow.
6. Polish → security/cache/accessibility regression and four-command verification.

### Parallel Team Strategy

After Foundation:

- Developer A: US1 API and Category UI.
- Developer B: US2 normalization/search.
- Developer C: US3 pagination and deep links.
- Developer D: US4 detail regression once at least one Product list journey is available.

Coordinate modifications to shared files (`apps/api/src/modules/catalog/catalog.repository.ts`, `apps/api/src/modules/catalog/catalog.service.ts`, `apps/storefront/src/pages/HomePage.tsx`, and `apps/storefront/src/api/client.ts`) to avoid merge conflicts.

---

## Notes

- `[P]` tasks touch different files or can be completed before overlapping implementation begins.
- Each user story has tests before implementation to satisfy the Test-First constitution principle.
- No task may modify `docs/baseline/**`, `.specify/memory/constitution.md`, `specs/001-catalog-browse/spec.md`, or `specs/001-catalog-browse/plan.md`.
- Do not add Product/Category/Stock back-office CRUD, Cart/Auth/Order/Payment/Shipping flows, Product variants, hierarchical Category, external search/cache services, or Product discontinuation lifecycle changes.
- Do not bypass the public Stock status seam from catalog code; exact Stock must not leave back office.
