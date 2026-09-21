# Feature Specification: Catalog Browse

**Feature Branch**: `001-catalog-browse`

**Created**: 2026-09-21

**Status**: Draft

**Track**: B — brownfield feature. Baseline `baseline-0001-ecommerce` already exists, and this feature completes a user-visible capability listed in `docs/baseline/feature-map.md`: *"Khách duyệt danh mục phẳng, tìm sản phẩm theo tên có bỏ dấu, và phân trang"*.

**Input**: User description: "dùng Track B thực hiện feature 001-catalog-browse trong feature map"

**Baseline references**:

- `docs/baseline/feature-map.md`: `001-catalog-browse`, depends on `000`, owns PRD FR-1–FR-5, governed by AD-11, AD-19, AD-20.
- `docs/baseline/prd.md`: FR-1, FR-2, FR-3, FR-4, FR-5; NFR p95 page load ≤ 1.5 s; p95 read path ≤ 400 ms; Y3 scale 20,000 Products.
- `docs/baseline/architecture.md`: AD-11 accent-insensitive Product-name search, AD-19 exact Stock never leaves back office, AD-20 Stock status remains current and never stale.
- `docs/baseline/glossary.md`: Product, Category, Stock, Stock status, Guest, Customer, Shop owner.
- `docs/baseline/ux-spec.md`: flat Category sidebar, product grid, search box, Product detail surface, pagination, Vietnamese UI copy, WCAG 2.1 AA floor.

> **Derived artifact.** This specification refines PRD FR-1–FR-5 only. It does not add a Product requirement outside the frozen Baseline. If implementation needs Product variants, hierarchical Category, fuzzy search, recommendations, infinite scroll, or exact Stock disclosure to a Guest or Customer, that is a scope or baseline conflict, not a detail for this feature.

## Existing behaviour that must not change

Feature `000-walking-skeleton` established the first storefront slice. This feature extends that slice, and these behaviours remain protected:

- A Guest can open the storefront without being redirected to login.
- Product data shown on the homepage and Product detail comes from stored Product data, not hardcoded UI data.
- Product detail still returns not found for a Product that does not exist.
- Price remains VND, VAT inclusive, with no decimal amount and no separate tax line.
- Stock status remains exactly textual: **"Còn hàng"** or **"Hết hàng"**.
- A Product with Stock = 0 remains visible and openable; it is not hidden from browse or search.
- Exact Stock never appears in responses or UI visible to a Guest or Customer.
- Stock status is always read fresh; users never see stale Stock status after loading a new list page or Product detail.
- Security headers and storefront/back-office surface separation from feature `000` remain intact.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Guest browses all Products and flat Categories (Priority: P1)

A Guest opens the storefront, sees the flat Category list, chooses either **Tất cả sản phẩm** or one Category, and gets a paginated Product grid for that scope.

**Why this priority**: FR-1 is the base value of this feature. Search and Product detail are useful only after the browse surface reliably shows the right Product set.

**Independent Test**: Seed multiple Categories and Products, including Products with and without a Category, Products in different Categories, in-stock Products, and out-of-stock Products. Open the storefront as a Guest and verify each selected Category shows exactly the Products in that scope with pagination controls.

**Acceptance Scenarios**:

1. **Given** Categories exist, **When** a Guest opens the storefront, **Then** the Category list is visible without login and includes **Tất cả sản phẩm** for browsing all Products.
2. **Given** a Category contains Products, **When** the Guest chooses that Category, **Then** the Product grid shows Products from that Category and excludes Products from other Categories.
3. **Given** a Product has no Category, **When** the Guest browses all Products, **Then** that Product appears in the all-Products list.
4. **Given** a Category has no Products, **When** the Guest chooses it, **Then** the page shows the empty-list message "Danh mục này chưa có sản phẩm nào." rather than an error.
5. **Given** a Product is out of stock, **When** the Guest browses all Products or its Category, **Then** the Product remains visible with Stock status "Hết hàng".
6. **Given** a Shop owner opens the storefront, **When** the Product grid renders, **Then** browsing remains possible but cart and ordering actions remain absent for the Shop owner.
7. **Given** Categories contain different numbers of Products visible in the storefront, **When** the Category list renders, **Then** each Category count reflects Products in that Category regardless of Stock status.

---

### User Story 2 — Guest searches Product names accent-insensitively (Priority: P1)

A Guest types a Product-name query with or without Vietnamese accents and sees matching Products by name. The search is case-insensitive, works across all Products visible in the storefront, and does not search descriptions or other fields.

**Why this priority**: FR-2 is the feature-map differentiator: Vietnamese users expect "binh giu nhiet" to find "Bình giữ nhiệt". If this fails, the catalog is difficult to use even when browse works.

**Independent Test**: Seed Products with Vietnamese names, similar names, and unrelated names. Search with accented and unaccented queries, different casing, and no-match queries. Verify the result set and empty state.

**Acceptance Scenarios**:

1. **Given** a Product named "Bình giữ nhiệt" exists, **When** the Guest searches "bình giữ nhiệt", **Then** that Product appears in the results.
2. **Given** the same Product exists, **When** the Guest searches "binh giu nhiet", **Then** that Product appears in the results.
3. **Given** Products with mixed uppercase and lowercase names exist, **When** the Guest searches with different casing, **Then** casing does not change the result set.
4. **Given** a query matches only a Product description and not the Product name, **When** the Guest searches, **Then** that Product is not returned because this feature searches Product names only.
5. **Given** no Product name matches a query, **When** the Guest searches, **Then** the page shows "Không có sản phẩm nào khớp với «{từ khoá}»." and does not show an error.
6. **Given** search results include an out-of-stock Product, **When** results render, **Then** the Product remains visible with Stock status "Hết hàng".
7. **Given** a Category was selected before searching, **When** a Guest submits a search query, **Then** search runs across all Products in the storefront catalog and clears the Category scope.

---

### User Story 3 — Guest pages through large Product lists (Priority: P1)

A Guest navigates Product lists page by page instead of receiving the whole catalog at once. Pagination works for all Products, Category browse, and search results.

**Why this priority**: FR-3 protects performance at Y3 scale. Without pagination, FR-1 and FR-2 cannot satisfy the Baseline NFRs for 20,000 Products.

**Independent Test**: Seed more Products than the default page size in all Products, within a Category, and in a search result set. Verify default page size, upper page-size limit, page navigation, empty pages, and that no list response returns the full catalog at once.

**Acceptance Scenarios**:

1. **Given** more than 24 sellable Products exist, **When** the Guest opens all Products without choosing a page size, **Then** the first page contains at most 24 Products and pagination controls are visible.
2. **Given** a Category contains more than 24 Products, **When** the Guest chooses that Category, **Then** results are paginated within that Category.
3. **Given** a search query matches more than 24 Products, **When** the Guest searches, **Then** search results are paginated for that query.
4. **Given** a page size greater than 100 is requested, **When** the list is returned, **Then** the page size is treated as 100 and not as an error.
5. **Given** a requested page has no Products, **When** the page renders, **Then** the page shows an empty state and still preserves the current Category or search context.
6. **Given** a Guest changes Category, search query, or status of the current result set, **When** the new result set loads, **Then** pagination resets to page 1.
7. **Given** any Product list response, **When** the response is inspected, **Then** it contains only the requested page and never the entire Product catalog.

---

### User Story 4 — Guest opens Product detail from browse or search (Priority: P2)

A Guest opens a Product from a browse or search result and sees the full Product detail with fresh Stock status.

**Why this priority**: FR-4 and FR-5 already exist in thin form from feature `000`; this story ensures the richer browse/search flows preserve Product detail behaviour as the catalog grows.

**Independent Test**: From all Products, Category results, and search results, open a Product detail page and verify the Product information, images, price, and Stock status. Change Stock between requests and verify the detail page reflects the fresh value.

**Acceptance Scenarios**:

1. **Given** a Product appears in all Products, **When** the Guest opens it, **Then** the Product detail shows name, description, price, at least one image, and Stock status.
2. **Given** a Product appears in a Category result, **When** the Guest opens it, **Then** the Product detail is the same Product and not a Category summary.
3. **Given** a Product appears in search results, **When** the Guest opens it, **Then** the Product detail is the same Product and preserves no false Stock number disclosure.
4. **Given** a Product does not exist, **When** the Guest opens its detail path, **Then** the response is not found.
5. **Given** Stock changes from greater than 0 to 0 before Product detail is loaded, **When** the detail page renders, **Then** Stock status is "Hết hàng".
6. **Given** Stock changes from 0 to greater than 0 before Product detail is loaded, **When** the detail page renders, **Then** Stock status is "Còn hàng".

---

### Edge Cases

- Category list exists but every Category is empty: each empty Category remains selectable and shows the empty Category message.
- A Product has no Category: it appears in all Products and search results, but not in any specific Category.
- Product discontinuation lifecycle is outside this feature; this feature must not add, change, or depend on that lifecycle.
- A search query is blank or only whitespace: the storefront returns to all Products rather than treating it as an error.
- A search query contains Vietnamese accents, no accents, mixed case, or extra spaces: matching remains based on Product name.
- A search query has no matches: the result is an empty list with explanatory text, not an error.
- A requested page number is below 1: it is treated as page 1.
- A requested page number exceeds the available result set: the result is empty for that scope, with pagination context preserved.
- A requested page size exceeds 100: it is capped at 100 without error.
- Stock changes while a Guest browses: every newly loaded list page or detail page reflects current Stock status and never reuses stale Stock status.
- Exact Stock appears nowhere a Guest or Customer can receive it, including visible page content and data delivered to the browser.
- Deep links to Category, search, pagination, and Product detail are reloadable and do not fall into an unrelated fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(← PRD FR-1)*: The system MUST let a Guest, Customer, and Shop owner view the list of existing Categories from the storefront.
- **FR-002** *(← PRD FR-1)*: The system MUST let a Guest, Customer, and Shop owner view Products for one selected flat Category from the storefront.
- **FR-003** *(← PRD FR-1)*: The selected Category Product list MUST include only Products assigned to that Category and MUST exclude Products assigned to other Categories.
- **FR-004** *(← PRD FR-1)*: Products with no Category MUST appear in all Products and remain searchable.
- **FR-005** *(← UX Spec)*: Category counts MUST reflect Products visible in each Category regardless of Stock status.
- **FR-006** *(← PRD FR-2)*: The system MUST let a Guest, Customer, and Shop owner search Products by Product name.
- **FR-007** *(← PRD FR-2, AD-11)*: Product-name search MUST match Vietnamese names when the query omits accents.
- **FR-008** *(← PRD FR-2)*: Product-name search MUST be case-insensitive.
- **FR-009** *(← PRD FR-2)*: Product-name search MUST return an empty result with explanatory text when there are no matches, not an error.
- **FR-010** *(← PRD FR-2)*: Search MUST NOT include Product descriptions, Category names, fuzzy matches, suggestions, or relevance ranking in this feature.
- **FR-011** *(← PRD FR-3)*: Every Product list — all Products, Category Products, and search results — MUST be paginated.
- **FR-012** *(← PRD FR-3)*: The default page size MUST be 24 Products.
- **FR-013** *(← PRD FR-3)*: The maximum page size MUST be 100 Products; requests above 100 MUST be treated as 100 and MUST NOT fail for that reason.
- **FR-014** *(← PRD FR-3)*: No Product list view MUST deliver the whole Product catalog at once.
- **FR-015** *(← UX Spec)*: Product list pagination MUST show enough page context for a Guest to understand the current page and total pages.
- **FR-016** *(← PRD FR-4)*: Product detail MUST show Product name, description, price, at least one image, and Stock status.
- **FR-017** *(← PRD FR-4)*: Product price MUST display in VND, VAT inclusive, with no decimal amount and no separate tax line.
- **FR-018** *(← PRD FR-4)*: A Product that does not exist MUST return not found.
- **FR-019** *(← PRD FR-5)*: Stock status MUST have exactly two user-visible values: "Còn hàng" when Stock is greater than 0 and "Hết hàng" when Stock equals 0.
- **FR-020** *(← PRD FR-5, AD-19)*: The exact Stock number MUST NOT be visible to or received by a Guest or Customer; only Stock status may be visible.
- **FR-021** *(← PRD FR-5, AD-20)*: Stock status MUST reflect current Stock for every newly loaded list page and Product detail; a Guest or Customer MUST NOT see stale Stock status after reloading or navigating to a fresh Product list or Product detail.
- **FR-022** *(← PRD FR-5)*: Out-of-stock Products MUST remain visible in browse, search, and Product detail, with Stock status "Hết hàng".
- **FR-023** *(← UX Spec)*: The UI MUST communicate Stock status as text, not color alone, and remain usable at the WCAG 2.1 AA floor.
- **FR-024** *(← Existing behaviour)*: Existing feature `000` behaviours listed in "Existing behaviour that must not change" MUST remain true after this feature.

### Key Entities

- **Product**: A sellable item with exactly one price and one Stock number. It may belong to zero or one Category and has at least one image for display.
- **Category**: A flat group used to browse Products. A Category has no parent or child Category in v1 and can contain zero or more Products.
- **Stock**: Integer quantity attached to a Product; not shown directly to Guest or Customer.
- **Stock status**: The only stock-derived value visible to Guest and Customer. Exactly `in_stock` / "Còn hàng" or `out_of_stock` / "Hết hàng", derived from current Stock.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of seeded Categories and sellable Products appear in the correct browse scope: all Products, their assigned Category, or no specific Category, as applicable.
- **SC-002**: For a representative Vietnamese Product-name set, 100% of accentless queries that should match accented Product names return the expected Products, and 0% of description-only matches are returned.
- **SC-003**: Every all-Products, Category, and search result page returns at most 24 Products by default and at most 100 Products when a larger page size is requested.
- **SC-004**: At a 20,000 Product catalog size, 95% of browse, search, and Product detail interactions make the requested Product information available within 400 ms of the read request and the page is usable within 1.5 s.
- **SC-005**: 100% of Guest and Customer browse/search/detail responses expose Stock status and expose 0 exact Stock numbers.
- **SC-006**: After Stock changes, 100% of subsequent newly loaded list pages and Product detail pages show the updated Stock status without requiring cache clearing.
- **SC-007**: 100% of acceptance scenarios for preserved feature `000` behaviours still pass after catalog browse is added.
- **SC-008**: 100% of Product list empty states render a user-readable Vietnamese explanation and no system error page.

## Assumptions

- Feature `000-walking-skeleton` is complete and provides the existing Product, Stock, storefront, reverse-proxy, and verification foundation.
- Track B impact analysis remains read-only. It may refine planning and task scope, but it must not broaden this feature beyond PRD FR-1–FR-5.
- Product creation, Category management, Product images management, Product discontinuation, and exact Stock management are back-office capabilities owned by other features; this feature consumes existing Product/Category/Stock data.
- Product variants, hierarchical Category, fuzzy search, search suggestions, relevance ranking, filters beyond Category, sorting controls beyond the baseline default, infinite scroll, and recommendations are out of scope.
- The UX baseline's storefront navigation assumptions apply: Category list on the storefront, search in the storefront header, page reset on Category/search changes, and no infinite scroll.
- Vietnamese is the only UI language in v1.
- The feature preserves the one-origin and security-header decisions from feature `000`; changing those decisions would be an architecture conflict.
