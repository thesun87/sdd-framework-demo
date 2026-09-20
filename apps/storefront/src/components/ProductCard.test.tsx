import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { storefront } from "shared";
import { ProductCard } from "./ProductCard.js";

afterEach(() => {
  cleanup();
});

const BASE: storefront.ProductSummary = {
  id: 1,
  name: "Cà phê sữa đá",
  price: 25000,
  imagePath: "/images/ca-phe-sua-da.jpg",
  stockStatus: "in_stock",
};

function renderCard(product: storefront.ProductSummary) {
  return render(
    <ul>
      <ProductCard product={product} />
    </ul>,
  );
}

describe("ProductCard — nhãn tồn kho", () => {
  it("hiện đúng chữ 'Còn hàng' khi in_stock", () => {
    renderCard({ ...BASE, stockStatus: "in_stock" });
    expect(screen.getByText("Còn hàng")).toBeTruthy();
    expect(screen.queryByText("Hết hàng")).toBeNull();
  });

  it("hiện đúng chữ 'Hết hàng' khi out_of_stock", () => {
    renderCard({ ...BASE, stockStatus: "out_of_stock" });
    expect(screen.getByText("Hết hàng")).toBeTruthy();
    expect(screen.queryByText("Còn hàng")).toBeNull();
  });
});

describe("ProductCard — FR-008: sản phẩm hết hàng vẫn hiện và vẫn mở được", () => {
  it("sản phẩm out_of_stock vẫn render tên, giá và vẫn là một liên kết thật tới trang chi tiết", () => {
    renderCard({ ...BASE, stockStatus: "out_of_stock" });

    // Vẫn thấy tên và giá — không bị ẩn khỏi lưới.
    expect(screen.getByText("Cà phê sữa đá")).toBeTruthy();
    expect(screen.getByText("25.000₫")).toBeTruthy();

    // Vẫn là <a href> thật (không disabled, không mất href, không aria-disabled).
    const link = screen.getByRole("link", { name: /Cà phê sữa đá/ });
    expect(link.getAttribute("href")).toBe("/products/1");
    expect(link.hasAttribute("aria-disabled")).toBe(false);
  });
});
