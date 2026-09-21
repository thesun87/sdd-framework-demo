# Quickstart — Catalog Browse

This guide validates feature `001-catalog-browse` end-to-end after implementation. It is a run/verification guide, not an implementation guide.

Related artifacts:

- [spec.md](./spec.md)
- [data-model.md](./data-model.md)
- [contracts/storefront-http.md](./contracts/storefront-http.md)
- [impact-analysis.md](./impact-analysis.md)

## Prerequisites

Use the same prerequisites and host environment conventions as feature `000`:

- Node ≥ 24.15; current recorded version is 24.21.0.
- Docker + Docker Compose available.
- PostgreSQL 18.6 service from `ops/compose.yaml` running.
- `npx playwright install` completed once for E2E/regression.
- Host commands have the required environment exported:

```bash
export DATABASE_URL=postgres://app:app@localhost:5432/shop
export API_PORT=3000
export NODE_ENV=development
export PRODUCT_IMAGE_PATH=/data/product-images
```

## Setup from a clean clone

```bash
npm install
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate
npm run build --workspace=packages/shared
npm run build --workspace=packages/ui
```

Seed data must include at least:

- At least three Categories.
- A Category with more than 24 Products.
- A Category with zero Products.
- At least one Product without Category.
- Products with Vietnamese accented names, including a Product whose name should match an accentless query such as `binh giu nhiet`.
- At least one out-of-stock Product.

Use the repository's seed/test-fixture path defined by tasks. Do not hand-edit database state as the only validation path.

## Run the verification contract

Run the four commands from `docs/baseline/verification.md` verbatim:

```bash
npm test
npm run lint
npm run build
docker compose -f ops/compose.yaml up -d --build
npm run test:regression
```

`docker compose ... up -d --build` is an infrastructure prerequisite for regression, not a fifth verification command.

Passing means:

- Product workspaces ran, not skipped.
- Existing feature `000` catalog, Product detail, Stock status, no-store, exact-Stock guard, Stock invariant, security header, and WCAG tests still pass.
- New catalog browse/search/pagination tests pass.

## Manual acceptance scenarios

Run after the app stack is alive and seeded with the feature data above.

| # | Scenario | Expected result |
|---|---|---|
| 1 | Open `/` as a Guest | Category list is visible; **Tất cả sản phẩm** is selected; Product grid shows page 1 with at most 24 Products |
| 2 | Choose a Category with Products | Product grid contains only Products in that Category; page resets to 1 |
| 3 | Choose an empty Category | Page shows `Danh mục này chưa có sản phẩm nào.` and no system error |
| 4 | Browse all Products | Product without Category appears in all Products |
| 5 | Search `binh giu nhiet` | Product named `Bình giữ nhiệt` appears even though the query omits accents |
| 6 | Search with different casing | Result set is unchanged by case |
| 7 | Search text that appears only in Product description | Product is not returned from Product-name search |
| 8 | Search with no matching Product name | Page shows `Không có sản phẩm nào khớp với «{từ khoá}».` and no system error |
| 9 | Request page size above 100 | Effective page size is 100 and request does not fail for that reason |
| 10 | Navigate to a page beyond the current result set | Empty page state preserves Category/search context |
| 11 | Open Product detail from all Products, Category result, and search result | Detail shows the same Product with name, description, price, image list, and Stock status |
| 12 | Change Stock before reloading a list/detail page | Newly loaded page shows updated Stock status |
| 13 | Inspect raw Product list/detail responses | Stock status is present; exact Stock number is absent |
| 14 | Use browser back/forward over Category/search/page/detail navigation | Deep links reload and route announcements remain accessible |

## HTTP smoke checks

```bash
curl -i 'http://localhost/api/categories'
curl -i 'http://localhost/api/products'
curl -i 'http://localhost/api/products?page=1&pageSize=24'
curl -i 'http://localhost/api/products?pageSize=101'
curl -i 'http://localhost/api/products?categoryId=1'
curl -i 'http://localhost/api/products?q=binh%20giu%20nhiet'
curl -i 'http://localhost/api/products/1'
```

Expected:

- Product-list responses include only one page of `items` and `pagination` metadata.
- Responses containing `stockStatus` have `Cache-Control: no-store`.
- `pageSize=101` returns an effective page size of 100.
- Empty result sets return 200 with `items: []`.
- Product detail for a missing Product returns 404 with the shared error envelope.

## Non-goals to verify by absence

During review, confirm the implementation did not add:

- Product/Category/Stock back-office CRUD.
- Cart, authentication, Customer account, Order, payment, or shipping flows.
- Product variants or hierarchical Category.
- Description search, fuzzy search, search suggestions, relevance ranking, or external search/cache services.
- Exact Stock disclosure to Guest or Customer.
