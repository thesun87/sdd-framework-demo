# Contract — Storefront HTTP (feature 001)

**Feature**: `001-catalog-browse`

The source of truth for runtime shapes is `packages/shared`, namespace `storefront` (AD-10). This file documents the intended public storefront HTTP contract for review and task generation.

All endpoints are public storefront reads. They require no login and must not redirect Guest access to authentication.

Any response containing `stockStatus` carries:

```text
Cache-Control: no-store
```

Exact Stock is forbidden in all responses visible to Guest or Customer. The strings `quantity`, `stock`, or any numeric Stock amount must not appear as a Stock disclosure field.

---

## `GET /api/categories`

Flat Category list for the storefront sidebar.

### Response 200

```jsonc
{
  "items": [
    {
      "id": 1,
      "name": "Bình giữ nhiệt",
      "productCount": 12
    }
  ]
}
```

Rules:

- `items[]` is flat; no parent/child Category fields.
- `productCount` counts Products visible in that Category regardless of Stock status.
- Empty Categories may appear with `productCount: 0`.
- **Tất cả sản phẩm** is a storefront UI root and is not returned as a persisted Category.

---

## `GET /api/products`

Paginated Product list for all Products, one Category, or Product-name search.

### Query parameters

| Parameter | Rule |
|---|---|
| `categoryId` | Optional positive integer. When present without nonblank `q`, returns Products assigned to that Category. |
| `q` | Optional Product-name search string. Blank/whitespace behaves like no search. Nonblank search runs across all Products visible in the storefront and clears Category scope. |
| `page` | Optional positive integer. Missing or below 1 behaves as `1`. |
| `pageSize` | Optional positive integer. Missing defaults to `24`; values above `100` are treated as `100`. |

### Response 200

```jsonc
{
  "items": [
    {
      "id": 1,
      "name": "Bình giữ nhiệt",
      "price": 149000,
      "imagePath": "/images/binh-giu-nhiet.jpg",
      "stockStatus": "in_stock"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 24,
    "totalItems": 37,
    "totalPages": 2
  }
}
```

Rules:

- `items` contains only the requested page.
- Default request with no query parameters returns all Products, page 1, page size 24.
- Requests above page size 100 clamp to 100 and do not fail for that reason.
- Category result contains only Products assigned to that Category.
- Uncategorized Products appear in all Products and search, but not in a specific Category.
- Product-name search is case-insensitive and accent-insensitive for Vietnamese names.
- Search matches Product name only; it does not match Product description or Category name.
- Empty all-products/category/search/page result is a valid 200 with `items: []`.
- `stockStatus` is exactly `in_stock` or `out_of_stock`.
- Exact Stock is never included.

---

## `GET /api/products/:id`

Product detail. This preserves the feature `000` detail contract while remaining part of the catalog browse journey.

### Response 200

```jsonc
{
  "id": 1,
  "name": "Bình giữ nhiệt",
  "description": "…",
  "price": 149000,
  "images": [
    { "path": "/images/binh-giu-nhiet.jpg", "position": 0 }
  ],
  "stockStatus": "in_stock"
}
```

### Response 404

Product does not exist.

```jsonc
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Không tìm thấy sản phẩm."
  }
}
```

Rules:

- Response 200 includes Product name, description, price, image list, and Stock status.
- Price is integer VND, VAT inclusive, with no decimal amount and no separate tax line.
- `stockStatus` is exactly `in_stock` or `out_of_stock`.
- Exact Stock is never included.
- Error response uses the shared error envelope and does not expose stack traces.

---

## Storefront UI contract

- The initial storefront state is all Products, page 1, page size 24.
- Choosing a Category clears search and resets page to 1.
- Submitting nonblank search clears Category and resets page to 1.
- Blank search returns to all Products and page 1.
- Pagination changes preserve the current all-products, Category, or search scope.
- Empty Category copy: `Danh mục này chưa có sản phẩm nào.`
- Empty search copy: `Không có sản phẩm nào khớp với «{từ khoá}».`
- Stock status is shown as text: `Còn hàng` / `Hết hàng`; never color alone.
