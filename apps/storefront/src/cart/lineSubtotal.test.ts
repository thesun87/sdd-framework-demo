// apps/storefront/src/cart/lineSubtotal.test.ts
//
// computeLineSubtotal (T017 fix round 1 / Ruling R5) — một hàm thuần tuý duy nhất cho
// điều kiện "mọi dòng đã có giá hiện tại" (allLinesPriced) và Tổng tiền hàng (Line
// subtotal), dùng chung bởi CartPage và PlaceOrderPage để không lặp lại logic (ledger
// Ruling R2, FR-006 — không bao giờ tính hay hiện giá 0 ₫ giả).

import { describe, expect, it } from "vitest";
import { computeLineSubtotal } from "./lineSubtotal.js";
import type { CartLine } from "./cartStore.js";
import type { storefront } from "shared";
import {
  createCartLineFixture,
  createCartLineStatusOkFixture,
  createCartLineStatusExceedsStockFixture,
  createCartLineStatusNotFoundFixture,
} from "../test/cartFixtures.js";

function toMap(
  items: storefront.CartLineStatusResponseItem[],
): Map<number, storefront.CartLineStatusResponseItem> {
  return new Map(items.map((item) => [item.productId, item]));
}

describe("computeLineSubtotal (T017 - Ruling R2/R5)", () => {
  it("mọi dòng đã có trạng thái thành công: allLinesPriced=true và tính đúng Tổng tiền hàng", () => {
    const lines: CartLine[] = [
      createCartLineFixture({ productId: 1, quantity: 2 }),
      createCartLineFixture({ productId: 2, quantity: 5 }),
    ];
    const lineStatuses = toMap([
      createCartLineStatusOkFixture({
        productId: 1,
        lineStatus: "ok",
        product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
      }),
      createCartLineStatusExceedsStockFixture({
        productId: 2,
        lineStatus: "exceeds_stock",
        product: { name: "Bình giữ nhiệt", price: 150000, imagePath: null },
      }),
    ]);

    const result = computeLineSubtotal(lines, lineStatuses);

    expect(result.allLinesPriced).toBe(true);
    // 25000 * 2 + 150000 * 5 = 50000 + 750000 = 800000
    expect(result.lineSubtotal).toBe(800000);
  });

  it("còn dòng chưa có trạng thái (chưa kiểm tra xong / đang chờ): allLinesPriced=false, lineSubtotal=0", () => {
    const lines: CartLine[] = [
      createCartLineFixture({ productId: 1, quantity: 2 }),
      createCartLineFixture({ productId: 2, quantity: 1 }),
    ];
    const lineStatuses = toMap([
      createCartLineStatusOkFixture({
        productId: 1,
        lineStatus: "ok",
        product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
      }),
      // productId 2: chưa có phản hồi nào trong map
    ]);

    const result = computeLineSubtotal(lines, lineStatuses);

    expect(result.allLinesPriced).toBe(false);
    expect(result.lineSubtotal).toBe(0);
  });

  it("dòng có trạng thái not_found (product null): allLinesPriced=false, lineSubtotal=0, không tính giá 0 ₫", () => {
    const lines: CartLine[] = [createCartLineFixture({ productId: 4, quantity: 3 })];
    const lineStatuses = toMap([
      createCartLineStatusNotFoundFixture({ productId: 4 }),
    ]);

    const result = computeLineSubtotal(lines, lineStatuses);

    expect(result.allLinesPriced).toBe(false);
    expect(result.lineSubtotal).toBe(0);
  });

  it("kiểm tra thất bại (lineStatuses rỗng, chưa từng có trạng thái thành công): allLinesPriced=false, lineSubtotal=0", () => {
    const lines: CartLine[] = [createCartLineFixture({ productId: 1, quantity: 2 })];
    const lineStatuses = toMap([]);

    const result = computeLineSubtotal(lines, lineStatuses);

    expect(result.allLinesPriced).toBe(false);
    expect(result.lineSubtotal).toBe(0);
  });

  it("giỏ hàng rỗng: allLinesPriced=true (vacuous), lineSubtotal=0", () => {
    const result = computeLineSubtotal([], toMap([]));

    expect(result.allLinesPriced).toBe(true);
    expect(result.lineSubtotal).toBe(0);
  });
});
