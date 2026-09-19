# Contract — Storefront HTTP (feature 000)

**Nguồn sự thật duy nhất của những hình dạng này là `packages/shared`, không phải file này**
(AD-10). File này mô tả hợp đồng để review và sinh task; schema thật định nghĩa **một lần**
trong `packages/shared`, không gian tên `storefront`, và được validate ở **cả hai** phía bằng
chính schema đó. Front end **không khai lại** interface cho response.

Mọi đường dẫn đi qua một origin duy nhất (AD-8). `/api/*` **không bao giờ** rơi vào SPA
fallback.

---

## `GET /api/products`

Danh sách sản phẩm cho trang chủ. Ở `000` danh sách này không phân trang (FR-3 thuộc `001`).

**Response 200**

```jsonc
{
  "items": [
    {
      "id": 1,                       // bigint nội bộ, serialise dạng số nguyên
      "name": "…",
      "price": 149000,               // SỐ NGUYÊN VND, đã gồm VAT, không thập phân
      "imagePath": "/images/…",      // ảnh position nhỏ nhất; null nếu chưa có ảnh
      "stockStatus": "in_stock"      // "in_stock" | "out_of_stock" (chốt 2026-09-19)
    }
  ]
}
```

**Header bắt buộc**: `Cache-Control: no-store` — response chứa `stockStatus`, và AD-20 cấm
cache trường này ở **mọi** tầng.

**Cấm tuyệt đối**: trường `quantity` hoặc bất kỳ con số tồn kho nào. FR-007 + AD-19. Việc này
kiểm được bằng cách đọc **toàn bộ** thân response, không chỉ nhìn màn hình.

---

## `GET /api/products/:id`

Chi tiết một Sản phẩm.

**Response 200**

```jsonc
{
  "id": 1,
  "name": "…",
  "description": "…",
  "price": 149000,
  "images": [{ "path": "/images/…", "position": 0 }],
  "stockStatus": "in_stock"
}
```

**Response 404** — Sản phẩm không tồn tại (FR-004). Envelope lỗi dùng chung của
`packages/shared`; **không stack trace ra client** (§Consistency Conventions).

**Header bắt buộc**: `Cache-Control: no-store`.

---

## `GET /api/health`

Sức khoẻ hệ thống, cho `ops/compose.yaml` và cho định nghĩa "sự cố" ở §Quan sát và sự cố.

**Response 200** khi lành mạnh. **Chuyển sang không lành mạnh** khi một migration thất bại
hoặc `CHECK (quantity >= 0)` bị vi phạm — hệ thống tự nói nó đang sai, vì không có ai trực
để đọc biểu đồ.

---

## Hợp đồng của reverse proxy (`ops/Caddyfile`)

| Đường dẫn | Hành vi |
|---|---|
| `/api/*` | chuyển tới NestJS. **Không bao giờ** rơi vào SPA fallback |
| `/admin/*` | ở `000` **chưa có bundle**; vẫn phải trả về kèm đủ header an toàn |
| còn lại | tệp tĩnh của `storefront`, không khớp thì `index.html` của `storefront` |

**Header phát cho CẢ HAI đường dẫn bán hàng và quản trị** (AD-29):

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
                         base-uri 'self'; frame-ancestors 'none'; connect-src 'self';
                         style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
X-Content-Type-Options: nosniff
```

`'unsafe-inline'` được phép **chỉ ở `style-src`** — nhượng bộ đã ghi trong baseline cho style
nội tuyến của Vite. `script-src` **không** có `'unsafe-inline'`, **không** có `'unsafe-eval'`,
**không** có CDN. Nới lỏng bất kỳ directive nào là thay đổi trên nhánh `baseline/*`, không
phải một quyết định trong task.

---

## Không có ở `000`

Không endpoint ghi nào. Đặt đơn (FR-14), giỏ hàng (FR-6…8), đăng nhập (FR-9…11) và mọi
đường dẫn quản trị đều thuộc feature khác. Đường ghi tồn kho tồn tại ở **tầng service**, không
phơi ra HTTP — xem `research.md` D-2.
