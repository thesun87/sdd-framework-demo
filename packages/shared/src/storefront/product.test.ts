import { describe, expect, it } from "vitest";
import {
  CategorySummarySchema,
  CategoriesListResponseSchema,
  PaginationSchema,
  ProductDetailSchema,
  ProductListQuerySchema,
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
  const validPagination = {
    page: 1,
    pageSize: 24,
    totalItems: 1,
    totalPages: 1,
  };

  it("bọc trong { items, pagination }, không phải mảng trần", () => {
    const result = ProductsListResponseSchema.safeParse({
      items: [validSummary],
      pagination: validPagination,
    });
    expect(result.success).toBe(true);
  });

  it("từ chối mảng trần (thiếu bọc items)", () => {
    const result = ProductsListResponseSchema.safeParse([validSummary]);
    expect(result.success).toBe(false);
  });

  it("từ chối nếu response chứa trường số lượng tồn kho quantity", () => {
    const result = ProductsListResponseSchema.safeParse({
      items: [validSummary],
      pagination: validPagination,
      quantity: 50,
    });
    expect(result.success).toBe(false);
  });
});

describe("CategorySummarySchema", () => {
  const validCategory = {
    id: 1,
    name: "Đồ gia dụng",
    productCount: 26,
  };

  it("chấp nhận danh mục hợp lệ với id, name, productCount", () => {
    const result = CategorySummarySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it("chấp nhận danh mục rỗng có productCount = 0", () => {
    const result = CategorySummarySchema.safeParse({ ...validCategory, productCount: 0 });
    expect(result.success).toBe(true);
  });

  it("từ chối productCount âm hoặc số thập phân", () => {
    expect(CategorySummarySchema.safeParse({ ...validCategory, productCount: -1 }).success).toBe(false);
    expect(CategorySummarySchema.safeParse({ ...validCategory, productCount: 1.5 }).success).toBe(false);
  });

  it("từ chối khi có trường lạ (strict)", () => {
    expect(CategorySummarySchema.safeParse({ ...validCategory, extra: "invalid" }).success).toBe(false);
  });
});

describe("CategoriesListResponseSchema", () => {
  it("chấp nhận danh sách bọc trong items", () => {
    const result = CategoriesListResponseSchema.safeParse({
      items: [{ id: 1, name: "Đồ uống", productCount: 5 }],
    });
    expect(result.success).toBe(true);
  });

  it("từ chối mảng trần", () => {
    expect(CategoriesListResponseSchema.safeParse([{ id: 1, name: "Đồ uống", productCount: 5 }]).success).toBe(false);
  });
});

describe("ProductListQuerySchema", () => {
  it("chấp nhận query rỗng", () => {
    const result = ProductListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("chấp nhận query hợp lệ với categoryId, q, page, pageSize", () => {
    const result = ProductListQuerySchema.safeParse({
      categoryId: 2,
      q: "binh giu nhiet",
      page: 1,
      pageSize: 24,
    });
    expect(result.success).toBe(true);
  });

  it("từ chối categoryId không phải số nguyên dương", () => {
    expect(ProductListQuerySchema.safeParse({ categoryId: -1 }).success).toBe(false);
    expect(ProductListQuerySchema.safeParse({ categoryId: 0 }).success).toBe(false);
  });
});

describe("PaginationSchema", () => {
  const validPagination = {
    page: 1,
    pageSize: 24,
    totalItems: 100,
    totalPages: 5,
  };

  it("chấp nhận metadata phân trang hợp lệ", () => {
    expect(PaginationSchema.safeParse(validPagination).success).toBe(true);
  });

  it("từ chối page hoặc pageSize <= 0", () => {
    expect(PaginationSchema.safeParse({ ...validPagination, page: 0 }).success).toBe(false);
    expect(PaginationSchema.safeParse({ ...validPagination, pageSize: 0 }).success).toBe(false);
  });

  it("chấp nhận totalPages = 0 khi danh sách rỗng", () => {
    expect(
      PaginationSchema.safeParse({ page: 1, pageSize: 24, totalItems: 0, totalPages: 0 }).success,
    ).toBe(true);
  });
});

