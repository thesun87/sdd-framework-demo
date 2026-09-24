// Kiểm chứng brief mục 10: điều hướng SPA phải thông báo cho screen reader qua
// `RouteAnnouncer` (packages/ui) — không có ranh giới tải trang nào làm việc đó thay.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App.js";
import * as client from "./api/client.js";
import * as authClient from "./api/auth-client.js";

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

  it('đổi nội dung vùng role="status" khi điều hướng tới /cart', async () => {
    window.history.pushState({}, "", "/cart");
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Đã chuyển đến trang giỏ hàng."),
    );
  });

  it('thông báo "Bạn cần một tài khoản để đặt đơn." khi Guest điều hướng tới /place-order (T013, US5)', async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    window.history.pushState({}, "", "/place-order");
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Bạn cần một tài khoản để đặt đơn."),
    );
  });

  it('thông báo "Đã chuyển đến trang đặt đơn." khi Customer điều hướng tới /place-order (T013, US5)', async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });
    window.history.pushState({}, "", "/place-order");
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Đã chuyển đến trang đặt đơn."),
    );
  });
});
