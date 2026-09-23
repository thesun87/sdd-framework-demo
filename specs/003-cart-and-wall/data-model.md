# Data Model: 003-cart-and-wall

**Date**: 2026-09-23 · **Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

**Không có thay đổi database.** AD-17 cấm mọi bảng giỏ hàng: không migration, không file mới trong
`db/schema/**`. Mọi thực thể dưới đây sống ở **trình duyệt**, hoặc được **dẫn xuất lúc đọc** rồi
không lưu lại.

## 1. Cart — lưu trong trình duyệt

Khoá `localStorage` là `shop_cart`. Chỉ `apps/storefront/src/cart/cartStore.ts` được đọc hoặc ghi
khoá này (R4).

```json
{ "v": 1, "lines": [ { "productId": 12, "quantity": 2 }, { "productId": 7, "quantity": 1 } ] }
```

| Trường | Kiểu | Luật |
|---|---|---|
| `v` | số nguyên, hằng `1` | Phiên bản hình dạng. Giá trị khác `1` thì coi là giỏ rỗng |
| `lines` | mảng `CartLine` | Mỗi `productId` xuất hiện tối đa một lần. Thứ tự là thứ tự thêm vào |

**Không bao giờ có** giá, tên, ảnh, tình trạng hay số lượng tồn kho, id tài khoản, email hay token
phiên (AD-17, FR-001, FR-020). Schema dùng `.strict()` khi **ghi**, để một trường lạ không bao giờ
được ghi ra.

### CartLine

Schema dùng chung: `packages/shared/src/storefront/cart.ts` → `CartLineSchema`.

| Trường | Kiểu | Luật |
|---|---|---|
| `productId` | số nguyên > 0 | Id `product` |
| `quantity` | số nguyên, 1 … 9 999 | Trần 9 999 là giới hạn kỹ thuật (R3), không phải luật sản phẩm |

### Thao tác và bất biến

Mọi thao tác đều theo một mẫu: đọc từ storage → sửa → ghi → thông báo (R4, FR-021).

| Thao tác | Hiệu ứng | Nguồn |
|---|---|---|
| `add(productId)` | Có dòng thì `quantity + 1`, kẹp ở 9 999. Chưa có thì thêm `{productId, 1}` | FR-002, FR-003 |
| `setQuantity(productId, q)` | `q = 0` thì xoá dòng. `q` từ 1 … 9 999 thì gán. `q` âm, không nguyên hoặc > 9 999 thì **từ chối** và giỏ giữ nguyên | FR-004, FR-005 |
| `remove(productId)` | Xoá dòng, không hỏi lại | FR-004 |
| `dropUnknown(productIds)` | Bỏ các dòng mà server trả `not_found` | Edge Cases |
| `totalQuantity()` | Σ `quantity`. Đây là số trên biểu tượng giỏ | FR-002 (Clarify Q3) |

**Không thao tác nào** tự sửa số lượng theo tồn kho hoặc tự xoá dòng bị cờ (FR-009). Đăng ký, đăng
nhập và đăng xuất **không gọi** thao tác nào ở trên (FR-013).

### Sửa dữ liệu khi đọc

Dữ liệu trong storage có thể hỏng hoặc bị sửa tay. Khi đọc, store sửa theo bảng sau.

| Tình trạng trong storage | Kết quả đọc |
|---|---|
| Không có khoá | Giỏ rỗng |
| JSON hỏng, sai hình dạng, `v ≠ 1` | Giỏ rỗng. Bản hỏng bị ghi đè ở lần ghi kế tiếp |
| Dòng có `productId` hoặc `quantity` không hợp lệ | Bỏ dòng đó, giữ các dòng khác |
| Hai dòng cùng `productId` | Gộp thành một, cộng số lượng, kẹp ở 9 999 |
| `localStorage` ném lỗi hoặc hết quota | Store ở trạng thái `unavailable` và UI báo không lưu được (R4) |

## 2. CartLineStatus — dẫn xuất, không lưu

Server tính lại **mỗi lần** được hỏi. Không tầng nào cache kết quả (AD-20, FR-008).

| Giá trị HTTP | Điều kiện, với Q là `quantity` của dòng và S là tồn kho hiện tại | Hiển thị ở Giỏ hàng |
|---|---|---|
| `ok` | Sản phẩm tồn tại, S ≥ Q | Bình thường |
| `exceeds_stock` | Sản phẩm tồn tại, 0 < S < Q | Cờ (a), không nêu con số (D1) |
| `out_of_stock` | Sản phẩm tồn tại, S = 0 hoặc chưa có dòng `stock` | Cờ (a): "Sản phẩm này đang hết hàng." |
| `not_found` | Không có `product` nào với id đó | Không hiển thị. Client bỏ dòng |

Tầng `stock` chỉ trả `sufficient | insufficient | out_of_stock` (R2). `catalog` ánh xạ ba giá trị
đó sang `ok | exceeds_stock | out_of_stock`, và tự thêm `not_found`. **S không bao giờ rời
`stock.public.ts`.**

## 3. Các giá trị UI dẫn xuất

- **Tiền một dòng**: `price` hiện tại × `quantity`, tính ở client từ response của R1. Glossary không có
  tên riêng cho giá trị này, nên code và UI không đặt tên mới cho nó.
- **Line subtotal** (glossary) = Σ (`price` × `quantity`) trên mọi dòng giỏ. Các dòng `not_found` đã bị
  client bỏ khỏi giỏ, nên chúng không được tính. Tiền là số nguyên VND và không có phí giao hàng (FR-006).
- **Khả năng Đặt đơn**: nút **Đặt đơn** bật khi **và chỉ khi** giỏ không rỗng, lần kiểm tra gần
  nhất thành công, và mọi dòng đều `ok` (FR-010). Có dòng hỏng thì nút tắt kèm lý do:

  | Tình trạng | Lý do hiện cạnh nút |
  |---|---|
  | Có dòng bị cờ | "Bạn sửa các dòng được đánh dấu để đặt đơn." |
  | Giỏ rỗng | "Giỏ hàng của bạn đang trống." |
  | Kiểm tra thất bại | "Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang." |

  Ba câu này đã được chốt trong `ux-spec.md` ở `baseline-0002-ecommerce`.

## 4. Không thay đổi

`account`, `session`, `failed_login_attempt`, `product`, `product_image`, `category`, `stock`,
`stock_ledger`: không cột mới, không ràng buộc mới, không dòng nào được ghi bởi feature này.
