import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { storefront } from "shared";
import { CategorySidebar } from "./CategorySidebar.js";

afterEach(() => {
  cleanup();
});

const CATEGORIES: storefront.CategorySummary[] = [
  { id: 1, name: "Đồ gia dụng", productCount: 15 },
  { id: 2, name: "Đồ uống", productCount: 3 },
  { id: 3, name: "Thời trang", productCount: 0 },
];

describe("CategorySidebar — render và tương tác", () => {
  it("render 'Tất cả sản phẩm' và danh sách danh mục kèm badge số lượng", () => {
    render(<CategorySidebar categories={CATEGORIES} />);

    expect(screen.getByRole("navigation", { name: "Danh mục sản phẩm" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tất cả sản phẩm" })).toBeTruthy();

    for (const cat of CATEGORIES) {
      expect(screen.getByText(cat.name)).toBeTruthy();
      expect(screen.getByText(String(cat.productCount))).toBeTruthy();
    }
  });

  it("đánh dấu aria-current='page' trên mục đang chọn", () => {
    render(<CategorySidebar categories={CATEGORIES} selectedCategoryId={2} />);

    const doUongLink = screen.getByRole("link", { name: /Đồ uống/ });
    expect(doUongLink.getAttribute("aria-current")).toBe("page");

    const allLink = screen.getByRole("link", { name: /Tất cả sản phẩm/ });
    expect(allLink.getAttribute("aria-current")).toBeNull();
  });

  it("gọi onSelectCategory khi click danh mục", () => {
    const onSelect = vi.fn();
    render(<CategorySidebar categories={CATEGORIES} onSelectCategory={onSelect} />);

    const giaDungLink = screen.getByRole("link", { name: /Đồ gia dụng/ });
    fireEvent.click(giaDungLink);

    expect(onSelect).toHaveBeenCalledWith(1);

    const allLink = screen.getByRole("link", { name: /Tất cả sản phẩm/ });
    fireEvent.click(allLink);

    expect(onSelect).toHaveBeenCalledWith(undefined);
  });
});
