// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StockStatusLabel } from "./StockStatusLabel.js";

afterEach(() => {
  cleanup();
});

describe("StockStatusLabel", () => {
  it('hiển thị chữ "Còn hàng" khi status là in_stock', () => {
    render(<StockStatusLabel status="in_stock" />);
    const label = screen.getByText("Còn hàng");
    expect(label.textContent).toBe("Còn hàng");
  });

  it('hiển thị chữ "Hết hàng" khi status là out_of_stock', () => {
    render(<StockStatusLabel status="out_of_stock" />);
    const label = screen.getByText("Hết hàng");
    expect(label.textContent).toBe("Hết hàng");
  });

  it("không truyền tải thông tin chỉ bằng màu — mỗi trạng thái luôn có nội dung chữ riêng, khác nhau", () => {
    const inStock = render(<StockStatusLabel status="in_stock" />);
    const inStockText = screen.getByText("Còn hàng").textContent;
    inStock.unmount();

    const outOfStock = render(<StockStatusLabel status="out_of_stock" />);
    const outOfStockText = screen.getByText("Hết hàng").textContent;
    outOfStock.unmount();

    expect(inStockText).toBeTruthy();
    expect(outOfStockText).toBeTruthy();
    expect(inStockText).not.toBe(outOfStockText);
  });
});
