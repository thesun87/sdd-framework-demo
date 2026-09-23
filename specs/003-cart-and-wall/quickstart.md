# Quickstart: Cart & Registration Wall

**Feature**: `003-cart-and-wall` · **Date**: 2026-09-23

Hướng dẫn kiểm chứng: làm theo trình tự dưới đây để chứng minh feature chạy đúng từ đầu tới cuối.
Hợp đồng ở [contracts/storefront-http.md](./contracts/storefront-http.md), luật dữ liệu ở
[data-model.md](./data-model.md).

## 1. Chuẩn bị

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate     # feature này không thêm migration nào, lệnh chỉ đảm bảo DB đúng bản
npm run db:seed        # 5 sản phẩm, trong đó có 1 hết hàng (stock = 0), và tài khoản Chủ shop
```

## 2. Bốn lệnh của hợp đồng kiểm chứng (bắt buộc, nguyên văn)

```bash
npm test
npm run lint
npm run test:regression
npm run build
```

Output của cả bốn lệnh phải cho thấy **nửa sản phẩm đã chạy**. Một dòng `SKIPPED` ở `apps/*`,
`packages/*` hoặc `e2e/` là thất bại (Constitution §III).

## 3. Kịch bản kiểm chứng bằng tay

Chạy qua proxy thật tại `baseURL` trong `e2e/playwright.config.ts`.

| # | Làm | Kỳ vọng | Spec |
|---|---|---|---|
| 1 | Là Guest, mở một sản phẩm còn hàng, bấm **Thêm vào giỏ hàng** hai lần | Trang không đổi. Biểu tượng giỏ hiện 2. Giỏ có **một** dòng với số lượng 2 | US1-1, US1-2 |
| 2 | Tải lại trang, mở `/cart` | Vẫn một dòng số lượng 2. Có tổng tiền hàng, không có dòng phí giao hàng | US1-4, US1-5 |
| 3 | Mở sản phẩm hết hàng | Nút bị vô hiệu hoá, cạnh nút có "Sản phẩm này đang hết hàng." | US1-3 |
| 4 | Đặt số lượng 9 999 cho một dòng | Dòng được chấp nhận và bị cờ `exceeds_stock`. **Không con số tồn kho nào** hiện ra. **Đặt đơn** tắt kèm lý do | US2-5, US3-1, US3-3 |
| 5 | Mở DevTools → Network, xem response của `POST /api/cart-lines/status` | Có `Cache-Control: no-store`. Không trường nào mang số lượng tồn kho | FR-007, FR-008 |
| 6 | Mở `/cart` ở tab thứ hai, rồi đổi số lượng ở tab thứ nhất | Tab thứ hai cập nhật ngay, không cần tải lại | FR-021 |
| 7 | Sửa về số lượng hợp lệ, bấm **Đặt đơn** | Hiện Tường đăng ký với câu "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên." cùng hai nút | US5-1 |
| 8 | Bấm **Đăng ký**, tạo tài khoản mới | Tới trang **Đặt đơn** tạm. Giỏ y nguyên | US5-2, US4-1 |
| 9 | Đăng xuất, mở `/cart` | Giỏ y nguyên | US4-3 |
| 10 | Từ Tường đăng ký bấm **Đăng nhập** và đăng nhập lại | Tới trang **Đặt đơn**. Giỏ y nguyên | US5-3, US4-2 |
| 11 | Mở `/login?returnTo=//evil.com` và đăng nhập | Về `/`, không rời origin | US5-6 |
| 12 | Đăng nhập bằng tài khoản Chủ shop | Không có biểu tượng giỏ, không có nút thêm giỏ. `/place-order` hiện "Tài khoản chủ shop không đặt đơn được." | US6 |
| 13 | Đặt `localStorage.shop_cart = "rác"` trong console rồi tải lại | Trang không sập, giỏ rỗng | Edge Cases |

## 4. Kiểm chứng FR-7: không giữ chỗ tồn kho

Test int-spec mang tên bất biến, nằm trong `apps/api`, chạy bằng `npm test`:

- Ghi lại `stock.quantity` và số dòng `stock_ledger` của một sản phẩm.
- Gọi `POST /api/cart-lines/status` nhiều lần với số lượng bất kỳ.
- Kiểm tra cả hai giá trị **không đổi**.

## 5. Hiệu năng (SC-007)

`e2e/performance.e2e-spec.ts` chạy trong `npm run test:regression`, với giỏ 20 dòng từ 20 sản phẩm
fixture:

- trang `/cart` hiển thị xong **≤ 1 500 ms p95**;
- `POST /api/cart-lines/status` trả lời **≤ 400 ms p95**.

Ngưỡng chép nguyên văn PRD §8, không nới.
