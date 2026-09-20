// Kiểm chứng brief mục 10: điều hướng SPA phải thông báo cho screen reader qua
// `RouteAnnouncer` (packages/ui) — không có ranh giới tải trang nào làm việc đó thay.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App.js";
import * as client from "./api/client.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App — RouteAnnouncer thật sự được nối vào điều hướng", () => {
  it('đổi nội dung vùng role="status" khi bấm vào một sản phẩm để mở trang chi tiết', async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: {
        items: [
          { id: 1, name: "Cà phê sữa đá", price: 25000, imagePath: null, stockStatus: "in_stock" },
        ],
      },
    });
    vi.spyOn(client, "fetchProductDetail").mockResolvedValue({
      kind: "ok",
      data: {
        id: 1,
        name: "Cà phê sữa đá",
        description: "Cà phê sữa đá pha máy.",
        price: 25000,
        images: [{ path: "/images/ca-phe-sua-da.jpg", position: 0 }],
        stockStatus: "in_stock",
      },
    });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Đã chuyển đến trang chủ."),
    );

    const link = await screen.findByRole("link", { name: /Cà phê sữa đá/ });
    fireEvent.click(link);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Đã chuyển đến trang chi tiết sản phẩm."),
    );
    // Điều hướng thật (History API), không chỉ đổi state cục bộ.
    expect(window.location.pathname).toBe("/products/1");
  });
});
