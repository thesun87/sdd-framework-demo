# Storefront Contract: Cart & Registration Wall

**Feature**: `003-cart-and-wall` · **Date**: 2026-09-23

Mọi schema khai trong `packages/shared/src/storefront/cart.ts` và được export qua
`packages/shared/src/storefront/index.ts` (AD-10). Không nơi nào trong `apps/**` khai lại các hình
dạng này.

---

## 1. `POST /api/cart-lines/status`

Xác định trạng thái hiện tại của các dòng giỏ, gồm giá hiện tại và trạng thái dạng enum (D1, R1).

- **Access**: công khai. Guest, Customer và Shop owner đều gọi được, **không cần phiên**
  (FR-017).
- **Owner**: module `catalog`, controller `CartLinesController`. Tồn kho được đọc qua
  `stock.public.ts` → `getStockSufficiency` (R2).
- **Side effects**: **không có**. Không ghi dòng nào vào database, không đổi tồn kho, không tạo
  phiên (FR-011).

### Request

`CartLinesStatusRequestSchema`:

```json
{ "lines": [ { "productId": 12, "quantity": 2 }, { "productId": 7, "quantity": 5 } ] }
```

- `lines`: có từ 0 tới 100 phần tử. Mỗi phần tử là `CartLineSchema`:
  - `productId` là số nguyên > 0;
  - `quantity` là số nguyên từ 1 tới 9 999.
- Mỗi `productId` chỉ xuất hiện một lần. Trùng thì trả `400`.
- **Trường lạ bị bỏ qua (strip), không bị từ chối.** Cụ thể, `price` hay bất kỳ trường giá nào
  client gửi lên **không có tác dụng** (AD-17, FR-012). Đây là lựa chọn có chủ ý: request dùng strip,
  còn response dùng `.strict()`.

### Response `200 OK`

Headers: `Cache-Control: no-store` (AD-20) · `Content-Type: application/json`

`CartLinesStatusResponseSchema`, dùng `.strict()` và được `.parse()` trong controller trước khi trả
ra, theo cùng mẫu của `catalog.controller.ts`:

```json
{
  "lines": [
    { "productId": 12, "lineStatus": "ok",
      "product": { "name": "Bình giữ nhiệt 500ml", "price": 189000, "imagePath": "/images/binh.jpg" } },
    { "productId": 7, "lineStatus": "exceeds_stock",
      "product": { "name": "Cốc sứ", "price": 65000, "imagePath": null } },
    { "productId": 99, "lineStatus": "not_found", "product": null }
  ]
}
```

- `lines` có đúng số phần tử và **đúng thứ tự** của request.
- `lineStatus` là `CartLineStatusSchema = z.enum(["ok", "exceeds_stock", "out_of_stock", "not_found"])`.
  Đây là enum riêng, **không** mở rộng `StockStatusSchema`.
- `product` là `null` khi và chỉ khi `lineStatus = "not_found"`.
- `price` là **giá hiện tại** đọc từ database, số nguyên VND đã gồm VAT.
- **Không trường nào mang số lượng tồn kho**, ở bất kỳ tầng lồng nào (AD-19). `.strict()` là hàng rào
  kỹ thuật cho luật này.
- `lines: []` trong request thì trả `{ "lines": [] }`.

### Errors

Envelope lỗi chuẩn của `packages/shared/src/common/error.ts`:

| HTTP | Khi nào |
|---|---|
| `400` | Body không phải JSON; thiếu `lines`; hơn 100 phần tử; `productId` hoặc `quantity` không hợp lệ (âm, 0, không nguyên, > 9 999); `productId` trùng |
| `500` | Lỗi server. Không có stack trace trong response |

Không có `401`, `403` hay `404`. Một id không tồn tại là `lineStatus: "not_found"`, không phải
lỗi của cả request.

---

## 2. Hợp đồng lưu trữ trình duyệt

Khoá `localStorage` là `shop_cart`. Hình dạng và luật sửa dữ liệu ở
[data-model.md §1](../data-model.md). Đây là hợp đồng giữa các bản build storefront. `004` đọc
đúng hình dạng này, và đổi hình dạng thì phải tăng `v`.

---

## 3. Hợp đồng điều hướng (Trang bán hàng)

| Route | Guest | Customer | Shop owner |
|---|---|---|---|
| `/cart` | Giỏ hàng | Giỏ hàng | Không có liên kết nào dẫn tới. Mở trực tiếp thì trang hiện "Tài khoản chủ shop không đặt đơn được." |
| `/place-order` | **Tường đăng ký** | Trang Đặt đơn tạm (FR-019) | "Tài khoản chủ shop không đặt đơn được." |
| `/register?returnTo=<path>` | Đăng ký; xong thì đi tới `returnTo` hợp lệ, ngược lại về `/` | như `002` | như `002` |
| `/login?returnTo=<path>` | Đăng nhập; xong thì đi tới `returnTo` hợp lệ, ngược lại về `/` | như `002` | như `002` |

- Mọi route ở bảng trên trả **HTTP 200** khi không có phiên. SPA fallback qua Caddy **không có
  redirect** (FR-017).
- `returnTo` hợp lệ khi và chỉ khi qua `safeReturnPath` (research R5). Ví dụ bị từ chối:
  `//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:alert(1)`, chuỗi rỗng.
- Liên kết "Đăng nhập" trên trang Đăng ký và "Đăng ký" trên trang Đăng nhập **giữ nguyên**
  `returnTo` nếu có.

**Chuỗi hiển thị cố định** lấy từ `ux-spec.md`:

- Tường đăng ký: "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên."
- Chủ shop: "Tài khoản chủ shop không đặt đơn được."
- Giỏ rỗng: "Giỏ hàng của bạn đang trống."
- Hết hàng: "Sản phẩm này đang hết hàng."

**Đã chốt vào `ux-spec.md` ở `baseline-0002-ecommerce`:**

- cờ `exceeds_stock`: "Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn.";
- ba lý do vô hiệu hoá nút ở [data-model.md §3](../data-model.md).

**Chuỗi tạm duy nhất còn lại**, cố ý không vào baseline vì `004` thay nó: thông báo trên trang Đặt đơn
tạm, "Chức năng đặt đơn chưa sẵn sàng."
