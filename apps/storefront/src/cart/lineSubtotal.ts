// apps/storefront/src/cart/lineSubtotal.ts
//
// Một nguồn sự thật DUY NHẤT cho điều kiện "mọi dòng đã có giá hiện tại" và cho Tổng tiền
// hàng (Line subtotal) — dùng chung bởi CartPage và PlaceOrderPage (T017 fix round 1,
// ledger Ruling R5) để tránh lặp lại logic ở hai nơi. Trước bản sửa này, mỗi trang tự tính
// riêng, giống hệt nhau, có nguy cơ lệch nhau nếu điều kiện Ruling R2 thay đổi sau này.
//
// Ruling R2 (FR-006): một dòng chưa có trạng thái kiểm tra thành công (đang chờ, kiểm tra
// thất bại, hoặc not_found) không được coi là đã có giá; Tổng tiền hàng không được tính
// hay hiển thị cho tới khi MỌI dòng hiện tại đều có giá hiện tại. Không bao giờ trả về một
// Tổng tiền hàng dựa trên giá 0 ₫ giả.

import type { storefront } from "shared";
import type { CartLine } from "./cartStore.js";

export interface LineSubtotalResult {
  /** true khi và chỉ khi mọi dòng trong `lines` có một `product` hiện tại trong `lineStatuses`. */
  readonly allLinesPriced: boolean;
  /** Tổng tiền hàng (Line subtotal); luôn là 0 khi `allLinesPriced` là false. */
  readonly lineSubtotal: number;
}

export function computeLineSubtotal(
  lines: readonly CartLine[],
  lineStatuses: ReadonlyMap<number, storefront.CartLineStatusResponseItem>,
): LineSubtotalResult {
  let lineSubtotal = 0;

  for (const line of lines) {
    const product = lineStatuses.get(line.productId)?.product;
    if (!product) {
      // Còn ít nhất một dòng chưa có giá hiện tại (chưa kiểm tra xong, kiểm tra thất bại,
      // hoặc not_found) — không tính, không hiện Tổng tiền hàng.
      return { allLinesPriced: false, lineSubtotal: 0 };
    }
    lineSubtotal += product.price * line.quantity;
  }

  return { allLinesPriced: true, lineSubtotal };
}
