import { describe, expect, it } from "vitest";
import {
  CartLineSchema,
  CartLineStatusSchema,
  CartLinesStatusRequestSchema,
  CartLinesStatusResponseSchema,
  StoredCartSchema,
} from "./cart.js";

describe("CartLineSchema (T001)", () => {
  it("chấp nhận productId là số nguyên > 0 và quantity từ 1 đến 9999", () => {
    const valid = CartLineSchema.parse({ productId: 1, quantity: 10 });
    expect(valid).toEqual({ productId: 1, quantity: 10 });
  });

  it("từ chối quantity là 0, -1, 1.5, hoặc 10000", () => {
    expect(() => CartLineSchema.parse({ productId: 1, quantity: 0 })).toThrow();
    expect(() => CartLineSchema.parse({ productId: 1, quantity: -1 })).toThrow();
    expect(() => CartLineSchema.parse({ productId: 1, quantity: 1.5 })).toThrow();
    expect(() => CartLineSchema.parse({ productId: 1, quantity: 10000 })).toThrow();
  });

  it("từ chối productId không hợp lệ (<= 0 hoặc số thập phân)", () => {
    expect(() => CartLineSchema.parse({ productId: 0, quantity: 1 })).toThrow();
    expect(() => CartLineSchema.parse({ productId: -5, quantity: 1 })).toThrow();
    expect(() => CartLineSchema.parse({ productId: 1.2, quantity: 1 })).toThrow();
  });
});

describe("CartLineStatusSchema (T001)", () => {
  it("chứa đúng 4 giá trị enum: ok, exceeds_stock, out_of_stock, not_found", () => {
    expect(CartLineStatusSchema.options).toEqual([
      "ok",
      "exceeds_stock",
      "out_of_stock",
      "not_found",
    ]);
  });
});

describe("CartLinesStatusRequestSchema (T001)", () => {
  it("chấp nhận danh sách hợp lệ từ 0 tới 100 phần tử", () => {
    const empty = CartLinesStatusRequestSchema.parse({ lines: [] });
    expect(empty).toEqual({ lines: [] });

    const lines100 = Array.from({ length: 100 }, (_, i) => ({
      productId: i + 1,
      quantity: 1,
    }));
    expect(() => CartLinesStatusRequestSchema.parse({ lines: lines100 })).not.toThrow();
  });

  it("từ chối danh sách có hơn 100 phần tử", () => {
    const lines101 = Array.from({ length: 101 }, (_, i) => ({
      productId: i + 1,
      quantity: 1,
    }));
    expect(() => CartLinesStatusRequestSchema.parse({ lines: lines101 })).toThrow();
  });

  it("từ chối request có trùng lặp productId", () => {
    const duplicates = {
      lines: [
        { productId: 1, quantity: 2 },
        { productId: 1, quantity: 3 },
      ],
    };
    expect(() => CartLinesStatusRequestSchema.parse(duplicates)).toThrow();
  });

  it("strip (bỏ qua) trường price hoặc trường lạ client gửi lên", () => {
    const inputWithPrice = {
      lines: [
        { productId: 1, quantity: 2, price: 50000, extra: "ignored" },
      ],
      unknownTopLevel: "stripped",
    };
    const parsed = CartLinesStatusRequestSchema.parse(inputWithPrice);
    expect(parsed).toEqual({
      lines: [{ productId: 1, quantity: 2 }],
    });
    expect((parsed.lines[0] as any).price).toBeUndefined();
    expect((parsed as any).unknownTopLevel).toBeUndefined();
  });
});

describe("CartLinesStatusResponseSchema (T001)", () => {
  it("chấp nhận response hợp lệ với product null khi not_found và product có dữ liệu khi khác not_found", () => {
    const validResponse = {
      lines: [
        {
          productId: 12,
          lineStatus: "ok",
          product: { name: "Bình giữ nhiệt 500ml", price: 189000, imagePath: "/images/binh.jpg" },
        },
        {
          productId: 7,
          lineStatus: "exceeds_stock",
          product: { name: "Cốc sứ", price: 65000, imagePath: null },
        },
        {
          productId: 99,
          lineStatus: "not_found",
          product: null,
        },
      ],
    };
    const parsed = CartLinesStatusResponseSchema.parse(validResponse);
    expect(parsed).toEqual(validResponse);
  });

  it("từ chối nếu product không null khi lineStatus là not_found", () => {
    const invalid = {
      lines: [
        {
          productId: 99,
          lineStatus: "not_found",
          product: { name: "Lạ", price: 1000, imagePath: null },
        },
      ],
    };
    expect(() => CartLinesStatusResponseSchema.parse(invalid)).toThrow();
  });

  it("từ chối nếu product là null khi lineStatus không phải not_found", () => {
    const invalid = {
      lines: [
        {
          productId: 12,
          lineStatus: "ok",
          product: null,
        },
      ],
    };
    expect(() => CartLinesStatusResponseSchema.parse(invalid)).toThrow();
  });

  it("từ chối nếu mang bất kỳ trường số tồn kho nào (quantity, availableQuantity, stock) do .strict()", () => {
    const withStock = {
      lines: [
        {
          productId: 12,
          lineStatus: "ok",
          stock: 5,
          product: { name: "Bình", price: 1000, imagePath: null },
        },
      ],
    };
    expect(() => CartLinesStatusResponseSchema.parse(withStock)).toThrow();

    const withAvailableQuantity = {
      lines: [
        {
          productId: 12,
          lineStatus: "ok",
          availableQuantity: 10,
          product: { name: "Bình", price: 1000, imagePath: null },
        },
      ],
    };
    expect(() => CartLinesStatusResponseSchema.parse(withAvailableQuantity)).toThrow();

    const withQuantityInLine = {
      lines: [
        {
          productId: 12,
          lineStatus: "ok",
          quantity: 2,
          product: { name: "Bình", price: 1000, imagePath: null },
        },
      ],
    };
    expect(() => CartLinesStatusResponseSchema.parse(withQuantityInLine)).toThrow();

    const withQuantityInProduct = {
      lines: [
        {
          productId: 12,
          lineStatus: "ok",
          product: { name: "Bình", price: 1000, imagePath: null, stock: 10 },
        },
      ],
    };
    expect(() => CartLinesStatusResponseSchema.parse(withQuantityInProduct)).toThrow();
  });
});

describe("StoredCartSchema (T001)", () => {
  it("chấp nhận stored cart hợp lệ với v: 1 và lines", () => {
    const valid = {
      v: 1,
      lines: [
        { productId: 1, quantity: 2 },
        { productId: 3, quantity: 5 },
      ],
    };
    const parsed = StoredCartSchema.parse(valid);
    expect(parsed).toEqual(valid);
  });

  it("từ chối trường lạ ở cấp gốc hoặc cấp line do .strict()", () => {
    const withExtraTop = {
      v: 1,
      lines: [{ productId: 1, quantity: 2 }],
      extra: "forbidden",
    };
    expect(() => StoredCartSchema.parse(withExtraTop)).toThrow();

    const withExtraLine = {
      v: 1,
      lines: [{ productId: 1, quantity: 2, price: 1000 }],
    };
    expect(() => StoredCartSchema.parse(withExtraLine)).toThrow();
  });

  it("từ chối v khác 1", () => {
    expect(() => StoredCartSchema.parse({ v: 2, lines: [] })).toThrow();
  });
});
