import { describe, expect, it } from "vitest";
import {
  normalizeProductName,
  normalizeSearchQuery,
  isSearchQueryBlank,
} from "./product-name-normalization.js";

describe("Product-name normalization (T021, US2)", () => {
  it("chuẩn hoá 'Bình giữ nhiệt' khớp với 'binh giu nhiet'", () => {
    expect(normalizeProductName("Bình giữ nhiệt")).toBe("binh giu nhiet");
  });

  it("chuẩn hoá 'Đồ uống' thành 'do uong' và xử lý nhất quán ký tự Đ/đ", () => {
    expect(normalizeProductName("Đồ uống")).toBe("do uong");
    expect(normalizeProductName("đồ uống")).toBe("do uong");
  });

  it("không phân biệt chữ hoa, chữ thường (mixed casing)", () => {
    expect(normalizeProductName("BìNH Giữ NhiỆT")).toBe("binh giu nhiet");
    expect(normalizeProductName("CÀ PHÊ SỮA ĐÁ")).toBe("ca phe sua da");
  });

  it("nhận diện truy vấn tìm kiếm rỗng hoặc chỉ có khoảng trắng là không tìm kiếm", () => {
    expect(isSearchQueryBlank("")).toBe(true);
    expect(isSearchQueryBlank("   ")).toBe(true);
    expect(isSearchQueryBlank("\t\n")).toBe(true);
    expect(isSearchQueryBlank(undefined)).toBe(true);
    expect(isSearchQueryBlank(null)).toBe(true);
    expect(isSearchQueryBlank("a")).toBe(false);
    expect(isSearchQueryBlank("  bình  ")).toBe(false);

    expect(normalizeSearchQuery("")).toBeUndefined();
    expect(normalizeSearchQuery("   ")).toBeUndefined();
    expect(normalizeSearchQuery("  Bình giữ nhiệt  ")).toBe("binh giu nhiet");
  });
});
