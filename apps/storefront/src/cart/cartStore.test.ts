import { beforeEach, describe, expect, it, vi } from "vitest";
import { cartStore } from "./cartStore.js";

describe("cartStore (T003)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset internal state of store
    cartStore._reset();
  });

  it("add gộp vào dòng đã có và không tạo dòng trùng lặp (FR-003)", () => {
    cartStore.add(10);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 10, quantity: 1 }]);

    cartStore.add(10);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 10, quantity: 2 }]);

    cartStore.add(20);
    expect(cartStore.getSnapshot().lines).toEqual([
      { productId: 10, quantity: 2 },
      { productId: 20, quantity: 1 },
    ]);
  });

  it("setQuantity(0) xoá dòng khỏi giỏ hàng (FR-004)", () => {
    cartStore.add(10);
    cartStore.add(20);
    expect(cartStore.getSnapshot().lines.length).toBe(2);

    cartStore.setQuantity(10, 0);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 20, quantity: 1 }]);
  });

  it("setQuantity từ chối các giá trị không hợp lệ (-1, 1.5, 10000) và giữ nguyên giỏ hàng (FR-004)", () => {
    cartStore.add(10);
    const initialLines = cartStore.getSnapshot().lines;

    expect(cartStore.setQuantity(10, -1)).toBe(false);
    expect(cartStore.getSnapshot().lines).toEqual(initialLines);

    expect(cartStore.setQuantity(10, 1.5)).toBe(false);
    expect(cartStore.getSnapshot().lines).toEqual(initialLines);

    expect(cartStore.setQuantity(10, 10000)).toBe(false);
    expect(cartStore.getSnapshot().lines).toEqual(initialLines);
  });

  it("chấp nhận số lượng lớn hơn tồn kho vì store không biết tồn kho (FR-005)", () => {
    // Tồn kho ở server có thể là 2, nhưng store vẫn chấp nhận 9999
    expect(cartStore.setQuantity(10, 9999)).toBe(true);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 10, quantity: 9999 }]);
  });

  describe("Sửa dữ liệu khi đọc (read-repair table từ data-model.md §1)", () => {
    it("không có khoá trả về giỏ rỗng", () => {
      localStorage.removeItem("shop_cart");
      cartStore._reset();
      expect(cartStore.getSnapshot().lines).toEqual([]);
      expect(cartStore.getSnapshot().unavailable).toBe(false);
    });

    it("JSON hỏng được sửa thành giỏ rỗng", () => {
      localStorage.setItem("shop_cart", "invalid json {[[");
      cartStore._reset();
      expect(cartStore.getSnapshot().lines).toEqual([]);
    });

    it("v khác 1 được sửa thành giỏ rỗng", () => {
      localStorage.setItem("shop_cart", JSON.stringify({ v: 2, lines: [{ productId: 1, quantity: 2 }] }));
      cartStore._reset();
      expect(cartStore.getSnapshot().lines).toEqual([]);
    });

    it("dòng có productId hoặc quantity không hợp lệ bị bỏ qua, giữ các dòng hợp lệ", () => {
      const corruptData = {
        v: 1,
        lines: [
          { productId: 1, quantity: 2 },
          { productId: -1, quantity: 2 }, // invalid productId
          { productId: 2, quantity: 0 }, // invalid quantity
          { productId: 3, quantity: 1.5 }, // non-integer quantity
          { productId: 4, quantity: 15000 }, // > 9999
          { productId: 5, quantity: 1 }, // valid
        ],
      };
      localStorage.setItem("shop_cart", JSON.stringify(corruptData));
      cartStore._reset();
      expect(cartStore.getSnapshot().lines).toEqual([
        { productId: 1, quantity: 2 },
        { productId: 5, quantity: 1 },
      ]);
    });

    it("hai dòng cùng productId được gộp thành một và kẹp ở 9 999", () => {
      const duplicateData = {
        v: 1,
        lines: [
          { productId: 1, quantity: 5000 },
          { productId: 1, quantity: 6000 },
        ],
      };
      localStorage.setItem("shop_cart", JSON.stringify(duplicateData));
      cartStore._reset();
      expect(cartStore.getSnapshot().lines).toEqual([{ productId: 1, quantity: 9999 }]);
    });
  });

  it("khi localStorage ném lỗi thì store chuyển sang trạng thái unavailable (R4)", () => {
    const originalGetItem = localStorage.getItem;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("QuotaExceeded or SecurityError");
    });

    cartStore._reset();
    expect(cartStore.getSnapshot().unavailable).toBe(true);
    expect(cartStore.getSnapshot().lines).toEqual([]);

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(originalGetItem);
  });

  it("sự kiện storage từ tab khác cập nhật các subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = cartStore.subscribe(listener);

    // Giả lập tab khác ghi vào localStorage
    localStorage.setItem(
      "shop_cart",
      JSON.stringify({ v: 1, lines: [{ productId: 99, quantity: 3 }] }),
    );

    // Bắn sự kiện storage
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "shop_cart",
        newValue: JSON.stringify({ v: 1, lines: [{ productId: 99, quantity: 3 }] }),
      }),
    );

    expect(listener).toHaveBeenCalled();
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 99, quantity: 3 }]);

    unsubscribe();
  });

  it("lần ghi sau khi tab khác thay đổi storage sẽ bắt đầu từ dữ liệu mới, không ghi đè bản cũ (FR-021)", () => {
    cartStore.add(1); // tab 1 có [ { productId: 1, quantity: 1 } ]

    // Giả lập tab khác ghi thêm sản phẩm 2 vào storage
    localStorage.setItem(
      "shop_cart",
      JSON.stringify({
        v: 1,
        lines: [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 1 },
        ],
      }),
    );

    // Tab 1 tiếp tục gọi add(3) -> phải đọc từ storage trước rồi mới ghi
    cartStore.add(3);

    expect(cartStore.getSnapshot().lines).toEqual([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
      { productId: 3, quantity: 1 },
    ]);
  });

  it("giá trị tuần tự hoá trong localStorage chỉ chứa v, productId, quantity — không có price, email, account id hay token (FR-001, FR-020)", () => {
    cartStore.add(5);
    const raw = localStorage.getItem("shop_cart");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);

    expect(Object.keys(parsed)).toEqual(["v", "lines"]);
    expect(parsed.v).toBe(1);
    expect(parsed.lines).toEqual([{ productId: 5, quantity: 1 }]);

    const line = parsed.lines[0];
    expect(Object.keys(line)).toEqual(["productId", "quantity"]);
  });

  it("dropUnknown loại bỏ đúng các productId chỉ định", () => {
    cartStore.add(1);
    cartStore.add(2);
    cartStore.add(3);

    cartStore.dropUnknown([1, 3]);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 2, quantity: 1 }]);
  });

  it("totalQuantity tính đúng tổng số lượng sản phẩm trong giỏ", () => {
    cartStore.add(1);
    cartStore.add(1);
    cartStore.add(2);
    expect(cartStore.totalQuantity()).toBe(3);
  });

  it("add báo cáo 'added' khi ghi thành công, và 'unavailable' khi storage không dùng được (T017)", () => {
    expect(cartStore.add(10)).toBe("added");
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 10, quantity: 1 }]);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(cartStore.add(20)).toBe("unavailable");
    expect(cartStore.getSnapshot().unavailable).toBe(true);
  });

  it("add báo cáo 'invalid' cho productId/quantity không hợp lệ — KHÔNG lẫn với 'unavailable' (F-4)", () => {
    expect(cartStore.add(-1)).toBe("invalid");
    expect(cartStore.add(1.5)).toBe("invalid");
    expect(cartStore.add(1, 0)).toBe("invalid");
    expect(cartStore.add(1, -2)).toBe("invalid");
    expect(cartStore.add(1, 1.5)).toBe("invalid");
    // Không ghi gì vào giỏ, và không chuyển sang trạng thái unavailable
    expect(cartStore.getSnapshot().lines).toEqual([]);
    expect(cartStore.getSnapshot().unavailable).toBe(false);
  });
});
