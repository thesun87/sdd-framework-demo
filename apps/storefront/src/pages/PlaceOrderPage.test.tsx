import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { PlaceOrderPage } from "./PlaceOrderPage.js";
import * as useCurrentAccountModule from "../api/useCurrentAccount.js";
import * as cartClient from "../api/cart-client.js";
import { cartStore } from "../cart/cartStore.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  cartStore._reset();
});

describe("PlaceOrderPage (T013 - US5, US6)", () => {
  it("Guest thấy Tường đăng ký với đầy đủ thông điệp và 2 hành động (FR-014, US5-5)", () => {
    vi.spyOn(useCurrentAccountModule, "useCurrentAccount").mockReturnValue("guest");

    render(<PlaceOrderPage />);

    expect(
      screen.getByText(
        "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Đăng ký" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeTruthy();
  });

  it("Shop owner thấy thông báo không thể đặt đơn và không can thiệp giỏ hàng (FR-018, US6-3)", () => {
    vi.spyOn(useCurrentAccountModule, "useCurrentAccount").mockReturnValue("shop_owner");
    const fetchSpy = vi.spyOn(cartClient, "fetchCartLineStatuses");

    cartStore.add(1, 2);

    render(<PlaceOrderPage />);

    expect(
      screen.getByText("Tài khoản chủ shop không đặt đơn được."),
    ).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 1, quantity: 2 }]);
  });

  it("Customer với giỏ hàng rỗng thấy thông báo 'Giỏ hàng của bạn đang trống.' kèm link về '/' (FR-019)", () => {
    vi.spyOn(useCurrentAccountModule, "useCurrentAccount").mockReturnValue("customer");

    render(<PlaceOrderPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Đặt đơn" })).toBeTruthy();
    expect(screen.getByText("Chức năng đặt đơn chưa sẵn sàng.")).toBeTruthy();
    expect(screen.getByText("Giỏ hàng của bạn đang trống.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Trang chủ" }).getAttribute("href")).toBe("/");
  });

  it("Customer thấy tóm tắt giỏ hàng, giá hiện tại, tổng tiền và gắn cờ dòng sản phẩm không thể mua (FR-019, US5-7)", async () => {
    vi.spyOn(useCurrentAccountModule, "useCurrentAccount").mockReturnValue("customer");

    cartStore.add(1, 2);
    cartStore.add(2, 5);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValueOnce({
      kind: "ok",
      data: {
        lines: [
          {
            productId: 1,
            lineStatus: "ok",
            product: {
              name: "Cà phê sữa đá",
              price: 25000,
              imagePath: "/images/cf.jpg",
            },
          },
          {
            productId: 2,
            lineStatus: "exceeds_stock",
            product: {
              name: "Bình giữ nhiệt",
              price: 150000,
              imagePath: null,
            },
          },
        ],
      },
    });

    const { container } = render(<PlaceOrderPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Đặt đơn" })).toBeTruthy();
    expect(screen.getByText("Chức năng đặt đơn chưa sẵn sàng.")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Cà phê sữa đá")).toBeTruthy();
      expect(screen.getByText("Bình giữ nhiệt")).toBeTruthy();
    });

    // Cờ báo vượt quá tồn kho (không lộ số lượng tồn kho)
    expect(
      screen.getByText(
        "Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn.",
      ),
    ).toBeTruthy();

    // Tổng tiền hàng: 25000 * 2 + 150000 * 5 = 50000 + 750000 = 800000 đ
    expect(screen.getByText(/800\.000/)).toBeTruthy();

    // Không có trường nhập địa chỉ hay thanh toán, không có nút submit đặt hàng
    expect(container.querySelectorAll("form").length).toBe(0);
    expect(container.querySelectorAll("input").length).toBe(0);
    expect(screen.queryByRole("button", { name: /đặt hàng|thanh toán/i })).toBeNull();
  });

  it("khi kiểm tra tình trạng hàng thất bại, hiện lý do thử tải lại và không đánh cờ dòng nào (T017 - Ruling R2)", async () => {
    vi.spyOn(useCurrentAccountModule, "useCurrentAccount").mockReturnValue("customer");
    cartStore.add(1, 2);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "error",
      message: "Network Error",
    });

    render(<PlaceOrderPage />);

    expect(
      await screen.findByText("Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang."),
    ).toBeTruthy();

    // Dòng vẫn hiện tên (placeholder) nhưng không có giá giả, không có Tổng tiền hàng
    expect(screen.getByText("Sản phẩm #1")).toBeTruthy();
    expect(screen.queryByText(/₫/)).toBeNull();
    expect(screen.queryByText(/Tổng tiền hàng/)).toBeNull();
  });

  it("trước khi có phản hồi kiểm tra đầu tiên, không hiện 0₫ hay Tổng tiền hàng (T017 - Ruling R2)", async () => {
    vi.spyOn(useCurrentAccountModule, "useCurrentAccount").mockReturnValue("customer");
    cartStore.add(1, 2);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockImplementation(
      () => new Promise(() => {}),
    );

    render(<PlaceOrderPage />);

    expect(await screen.findByText("Sản phẩm #1")).toBeTruthy();
    expect(screen.queryByText(/₫/)).toBeNull();
    expect(screen.queryByText(/Tổng tiền hàng/)).toBeNull();
  });
});
