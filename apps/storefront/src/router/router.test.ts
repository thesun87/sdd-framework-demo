import { describe, expect, it } from "vitest";
import { parseRoute } from "./router.js";

describe("parseRoute", () => {
  it("'/' là trang chủ", () => {
    expect(parseRoute("/")).toEqual({ type: "home" });
  });

  it("'/products/:id' là trang chi tiết, giữ nguyên id dạng chuỗi", () => {
    expect(parseRoute("/products/1")).toEqual({ type: "product-detail", id: "1" });
  });

  it("đường dẫn không khớp là not-found", () => {
    expect(parseRoute("/khong-ton-tai")).toEqual({ type: "not-found" });
  });
});
