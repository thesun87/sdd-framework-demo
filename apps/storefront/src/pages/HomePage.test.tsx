import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { storefront } from "shared";
import { HomePage } from "./HomePage.js";
import * as client from "../api/client.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const OUT_OF_STOCK_PRODUCT: storefront.ProductSummary = {
  id: 2,
  name: "Sản phẩm hết hàng",
  price: 10000,
  imagePath: null,
  stockStatus: "out_of_stock",
};

describe("HomePage — FR-008: sản phẩm hết hàng vẫn xuất hiện trong lưới", () => {
  it("vẫn render sản phẩm out_of_stock, vẫn là liên kết mở được, không ẩn khỏi lưới", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: { items: [OUT_OF_STOCK_PRODUCT] },
    });

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("Sản phẩm hết hàng")).toBeTruthy());
    expect(screen.getByText("Hết hàng")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Sản phẩm hết hàng/ });
    expect(link.getAttribute("href")).toBe("/products/2");
  });
});

describe("HomePage — lưới rỗng là danh sách rỗng, không phải lỗi", () => {
  it("hiện đúng câu 'Danh mục này chưa có sản phẩm nào.' khi items rỗng", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue({ kind: "ok", data: { items: [] } });

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("Danh mục này chưa có sản phẩm nào.")).toBeTruthy(),
    );
    // Không phải trạng thái lỗi: không role="alert", không chữ "Đã có lỗi xảy ra".
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/Đã có lỗi xảy ra/)).toBeNull();
  });

  it('trạng thái lỗi thật (fetch thất bại) KHÁC lưới rỗng — dùng role="alert"', async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "error",
      message: "Không thể kết nối tới máy chủ.",
    });

    render(<HomePage />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Danh mục này chưa có sản phẩm nào.")).toBeNull();
  });
});
