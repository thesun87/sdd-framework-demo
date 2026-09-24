import { describe, expect, it } from "vitest";
import { parseRoute } from "./router.js";

describe("parseRoute", () => {
  it("'/' là trang chủ không có tham số", () => {
    expect(parseRoute("/")).toEqual({ type: "home" });
  });

  it("'/?categoryId=2' giữ nguyên phạm vi danh mục", () => {
    expect(parseRoute("/?categoryId=2")).toEqual({ type: "home", categoryId: 2 });
  });

  it("'/?q=binh%20giu%20nhiet' giữ nguyên từ khoá tìm kiếm", () => {
    expect(parseRoute("/?q=binh%20giu%20nhiet")).toEqual({
      type: "home",
      q: "binh giu nhiet",
    });
  });

  it("'/?categoryId=2&q=binh' ưu tiên tìm kiếm và xoá phạm vi danh mục", () => {
    expect(parseRoute("/?categoryId=2&q=binh")).toEqual({
      type: "home",
      q: "binh",
    });
  });

  it("'/?page=3' giữ nguyên số trang", () => {
    expect(parseRoute("/?page=3")).toEqual({ type: "home", page: 3 });
  });

  it("'/?categoryId=5&page=2' lưu giữ cả danh mục và phân trang", () => {
    expect(parseRoute("/?categoryId=5&page=2")).toEqual({
      type: "home",
      categoryId: 5,
      page: 2,
    });
  });

  it("'/products/:id' là trang chi tiết, giữ nguyên id dạng chuỗi", () => {
    expect(parseRoute("/products/1")).toEqual({ type: "product-detail", id: "1" });
  });

  it("'/cart' là trang giỏ hàng", () => {
    expect(parseRoute("/cart")).toEqual({ type: "cart" });
  });

  it("'/place-order' là trang đặt đơn", () => {
    expect(parseRoute("/place-order")).toEqual({ type: "place-order" });
  });

  it("'/login?returnTo=/place-order' phân giải returnTo an toàn", () => {
    expect(parseRoute("/login?returnTo=/place-order")).toEqual({
      type: "login",
      returnTo: "/place-order",
    });
  });

  it("'/login?returnTo=//evil.com' loại bỏ returnTo không an toàn", () => {
    expect(parseRoute("/login?returnTo=//evil.com")).toEqual({
      type: "login",
    });
  });

  it("'/register?returnTo=/place-order' phân giải returnTo an toàn", () => {
    expect(parseRoute("/register?returnTo=/place-order")).toEqual({
      type: "register",
      returnTo: "/place-order",
    });
  });

  it("'/register?returnTo=https://evil.com' loại bỏ returnTo không an toàn", () => {
    expect(parseRoute("/register?returnTo=https://evil.com")).toEqual({
      type: "register",
    });
  });

  it("đường dẫn không khớp là not-found", () => {
    expect(parseRoute("/khong-ton-tai")).toEqual({ type: "not-found" });
  });

  it("router là hàm thuần tuý, không lưu cache dữ liệu Sản phẩm hay trạng thái Tồn kho (AD-20)", () => {
    const r1 = parseRoute("/products/1");
    const r2 = parseRoute("/products/1");
    expect(r1).toEqual(r2);
    // Không chứa trường stockStatus hoặc product
    expect("stockStatus" in r1).toBe(false);
  });
});
