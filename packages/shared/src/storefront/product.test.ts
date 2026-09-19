import { describe, expect, it } from "vitest";
import {
  ProductDetailSchema,
  ProductSummarySchema,
  ProductsListResponseSchema,
  StockStatusSchema,
} from "./product.js";

const validSummary = {
  id: 1,
  name: "Áo thun cotton",
  price: 149000,
  imagePath: "/images/ao-thun.jpg",
  stockStatus: "in_stock",
};

describe("ProductSummarySchema", () => {
  it("chấp nhận dữ liệu hợp lệ", () => {
    const result = ProductSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it("chấp nhận imagePath = null", () => {
    const result = ProductSummarySchema.safeParse({ ...validSummary, imagePath: null });
    expect(result.success).toBe(true);
  });

  it("từ chối price thập phân", () => {
    const result = ProductSummarySchema.safeParse({ ...validSummary, price: 149000.5 });
    expect(result.success).toBe(false);
  });

  it("từ chối price âm", () => {
    const result = ProductSummarySchema.safeParse({ ...validSummary, price: -1 });
    expect(result.success).toBe(false);
  });

  it("từ chối stockStatus giá trị lạ", () => {
    const result = ProductSummarySchema.safeParse({ ...validSummary, stockStatus: "low_stock" });
    expect(result.success).toBe(false);
  });

  it("KHÔNG cho lọt qua khi có thêm trường quantity — FR-007/AD-19", () => {
    const result = ProductSummarySchema.safeParse({ ...validSummary, quantity: 42 });
    expect(result.success).toBe(false);
  });
});

describe("StockStatusSchema", () => {
  it("chỉ chấp nhận đúng hai giá trị", () => {
    expect(StockStatusSchema.safeParse("in_stock").success).toBe(true);
    expect(StockStatusSchema.safeParse("out_of_stock").success).toBe(true);
    expect(StockStatusSchema.safeParse("in-stock").success).toBe(false);
    expect(StockStatusSchema.safeParse("available").success).toBe(false);
  });
});

describe("ProductDetailSchema", () => {
  const validDetail = {
    id: 1,
    name: "Áo thun cotton",
    description: "Áo thun 100% cotton, form rộng.",
    price: 149000,
    images: [{ path: "/images/ao-thun.jpg", position: 0 }],
    stockStatus: "in_stock",
  };

  it("chấp nhận dữ liệu hợp lệ", () => {
    expect(ProductDetailSchema.safeParse(validDetail).success).toBe(true);
  });

  it("từ chối price thập phân", () => {
    expect(
      ProductDetailSchema.safeParse({ ...validDetail, price: 1.5 }).success,
    ).toBe(false);
  });

  it("từ chối price âm", () => {
    expect(
      ProductDetailSchema.safeParse({ ...validDetail, price: -100 }).success,
    ).toBe(false);
  });

  it("từ chối stockStatus giá trị lạ", () => {
    expect(
      ProductDetailSchema.safeParse({ ...validDetail, stockStatus: "unknown" }).success,
    ).toBe(false);
  });

  it("KHÔNG cho lọt qua khi có thêm trường quantity — FR-007/AD-19", () => {
    expect(
      ProductDetailSchema.safeParse({ ...validDetail, quantity: 10 }).success,
    ).toBe(false);
  });
});

describe("ProductsListResponseSchema", () => {
  it("bọc trong { items }, không phải mảng trần", () => {
    const result = ProductsListResponseSchema.safeParse({ items: [validSummary] });
    expect(result.success).toBe(true);
  });

  it("từ chối mảng trần (thiếu bọc items)", () => {
    const result = ProductsListResponseSchema.safeParse([validSummary]);
    expect(result.success).toBe(false);
  });
});
