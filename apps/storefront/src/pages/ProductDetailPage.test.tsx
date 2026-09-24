import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { storefront } from "shared";
import { ProductDetailPage } from "./ProductDetailPage.js";
import * as client from "../api/client.js";
import * as authClient from "../api/auth-client.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const DETAIL: storefront.ProductDetail = {
  id: 1,
  name: "Cà phê sữa đá",
  description: "Cà phê phin truyền thống pha cùng sữa đặc, phục vụ lạnh với đá viên.",
  price: 25000,
  images: [{ path: "/images/ca-phe-sua-da.jpg", position: 0 }],
  stockStatus: "in_stock",
};

describe("ProductDetailPage — thông tin sản phẩm và nút thêm vào giỏ", () => {
  it("hiện tên, mô tả, giá, ảnh, nhãn tồn kho, nút thêm vào giỏ — KHÔNG sản phẩm liên quan / đánh giá", async () => {
    vi.spyOn(client, "fetchProductDetail").mockResolvedValue({ kind: "ok", data: DETAIL });
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });

    render(<ProductDetailPage id="1" />);

    await waitFor(() => expect(screen.getByText("Cà phê sữa đá")).toBeTruthy());
    expect(screen.getByText(DETAIL.description)).toBeTruthy();
    expect(screen.getByText("25.000₫")).toBeTruthy();
    expect(screen.getByText("Còn hàng")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Cà phê sữa đá" })).toBeTruthy();

    // Nút thêm vào giỏ hàng xuất hiện cho Guest/Customer
    expect(await screen.findByRole("button", { name: /thêm vào giỏ/i })).toBeTruthy();

    // Không có bất kỳ khối nào cho sản phẩm liên quan hay đánh giá (scope creep)
    expect(screen.queryByText(/sản phẩm liên quan/i)).toBeNull();
    expect(screen.queryByText(/đánh giá/i)).toBeNull();
  });

  it("Sản phẩm không tồn tại (404) hiện thông báo rõ ràng, không phải trang trắng", async () => {
    vi.spyOn(client, "fetchProductDetail").mockResolvedValue({ kind: "not-found" });

    render(<ProductDetailPage id="999999999" />);

    await waitFor(() => expect(screen.getByText(/không tồn tại/i)).toBeTruthy());
  });

  it("hiển thị danh sách ảnh có thứ tự, trạng thái hết hàng và không để lộ số lượng tồn kho", async () => {
    const outOfStockDetail: storefront.ProductDetail = {
      id: 2,
      name: "Bình giữ nhiệt 500ml",
      description: "Inox 304 cao cấp",
      price: 150000,
      images: [
        { path: "/images/binh-1.jpg", position: 0 },
        { path: "/images/binh-2.jpg", position: 1 },
      ],
      stockStatus: "out_of_stock",
    };
    vi.spyOn(client, "fetchProductDetail").mockResolvedValue({ kind: "ok", data: outOfStockDetail });

    render(<ProductDetailPage id="2" />);

    await waitFor(() => expect(screen.getByText("Bình giữ nhiệt 500ml")).toBeTruthy());
    expect(screen.getByText("150.000₫")).toBeTruthy();
    expect(screen.getByText("Hết hàng")).toBeTruthy();
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBe(2);

    expect(screen.queryByText(/tồn kho:/i)).toBeNull();
    expect(screen.queryByText(/số lượng:/i)).toBeNull();
  });
});
