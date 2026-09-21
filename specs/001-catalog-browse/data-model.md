# Phase 1 — Data Model: Catalog Browse

**Feature**: `001-catalog-browse`
**Source**: `spec.md`, `impact-analysis.md`, PRD FR-1…FR-5, AD-11/AD-19/AD-20.

Feature `001` primarily extends read models and storefront contracts over existing `catalog` and `stock` data. It must not add Product/Category/Stock management flows.

## Existing persisted entities used by this feature

### Product

| Field | Rule |
|---|---|
| `id` | Internal positive integer identity; used by Product detail links |
| `category_id` | Nullable relation to `Category`; `NULL` means the Product appears in all Products and search, but in no specific Category |
| `name` | Required display name |
| `name_normalized` | Required normalized Product name for accent-insensitive search; populated at write/backfill time, not derived on the stored-column side during reads |
| `description` | Required Product detail text; not searched by this feature |
| `price` | Nonnegative integer VND, VAT inclusive |
| `created_at` | Existing creation timestamp; not user-visible in this feature |

Relationships:

- Product belongs to 0..1 Category.
- Product has 0..n Product images; Product summary uses the first image by display position, Product detail returns the ordered image list.
- Product has exactly one Stock row; Stock status is derived from current Stock through the public Stock status seam.

Validation and behaviour:

- Product list views include Product summary fields only: id, name, price, image path, Stock status.
- Product detail includes id, name, description, price, image list, and Stock status.
- Exact Stock is never part of Product list/detail data visible to Guest or Customer.
- Out-of-stock Products remain visible.

### Category

| Field | Rule |
|---|---|
| `id` | Internal positive integer identity |
| `name` | Required display name |
| `name_normalized` | Existing normalized Category name; not searched by this feature |
| `created_at` | Existing creation timestamp; not user-visible in this feature |

Relationships:

- Category contains 0..n Products.
- Category has no parent or child Category in v1.

Validation and behaviour:

- Category list is flat.
- Empty Categories remain selectable.
- Category count reflects Products visible in that Category regardless of Stock status.
- `Tất cả sản phẩm` is a storefront navigation root, not a persisted Category.

### Product image

| Field | Rule |
|---|---|
| `id` | Internal positive integer identity |
| `product_id` | Required Product relation |
| `path` | Required image path |
| `position` | Nonnegative display ordering; lowest position is summary image |

### Stock

| Field | Rule |
|---|---|
| `product_id` | Product relation |
| `quantity` | Nonnegative integer Stock; exact value never visible to Guest or Customer |
| `updated_at` | Updated when Stock changes |

Derived field:

- **Stock status**: `in_stock` / "Còn hàng" when Stock > 0; `out_of_stock` / "Hết hàng" when Stock = 0.

Behaviour:

- Stock status is derived fresh for newly loaded Product lists and Product detail.
- Stock write invariants, Stock ledger, and race tests from feature `000` remain unchanged.

## New/extended read models

### CategorySummary

Purpose: render the flat Category sidebar.

| Field | Type | Rule |
|---|---|---|
| `id` | positive integer | Existing Category id |
| `name` | non-empty string | Category display name |
| `productCount` | nonnegative integer | Number of Products visible in the storefront for this Category, independent of Stock status |

### ProductListQuery

Purpose: describe a Product-list request from all Products, one Category, or search.

| Field | Rule |
|---|---|
| `categoryId` | Optional positive integer; when present without nonblank search, scope is one Category |
| `q` | Optional string; blank/whitespace behaves like no search; nonblank search runs across all Products visible in the storefront and clears Category scope |
| `page` | Optional positive integer; values below 1 behave as page 1 |
| `pageSize` | Optional positive integer; default 24; maximum 100 with clamp |

### Pagination

Purpose: tell the storefront and Guest where they are in a Product list.

| Field | Rule |
|---|---|
| `page` | Effective current page, minimum 1 |
| `pageSize` | Effective page size after default/clamp |
| `totalItems` | Count of Products in the current all-products, Category, or search result set |
| `totalPages` | Number of pages for current result set; may be 0 when there are no results |

### ProductsListResponse

Purpose: Product list response for all Products, Category browse, and search.

| Field | Rule |
|---|---|
| `items` | Array of ProductSummary for the requested page only |
| `pagination` | Pagination metadata for the same scope/query |

Rules:

- `items.length` ≤ `pagination.pageSize`.
- Default request returns page 1 with page size 24.
- Requesting page size > 100 returns page size 100, not an error.
- Empty result sets are valid responses.
- The response never contains the whole catalog unless the whole matching set has at most the effective page size.

## State transitions

No persisted state transition is introduced by this feature.

UI/navigation state transitions:

- Choosing a Category clears search and resets page to 1.
- Submitting nonblank search clears Category and resets page to 1.
- Blank/whitespace search returns to all Products and page 1.
- Changing page keeps the current all-products, Category, or search scope.
- Opening Product detail does not change Product, Category, or Stock state.

## Validation rules tied to requirements

| Requirement | Data-model implication |
|---|---|
| FR-001…FR-005 | CategorySummary and Category-scoped ProductListQuery must preserve flat Category and uncategorized Product semantics |
| FR-006…FR-010 | Product search uses Product.name/name_normalized only, not description or Category name |
| FR-011…FR-015 | ProductsListResponse carries only one requested page and enough pagination context |
| FR-016…FR-018 | ProductDetail keeps existing Product detail fields and not-found semantics |
| FR-019…FR-023 | Stock status is derived from current Stock, text-visible, and exact Stock is absent |
| FR-024 | Existing `000` Product detail, Stock invariant, security, and no-store behaviours remain protected |
