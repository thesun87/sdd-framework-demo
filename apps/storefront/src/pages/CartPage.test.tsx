import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CartPage } from "./CartPage.js";
import { cartStore } from "../cart/cartStore.js";
import * as cartClient from "../api/cart-client.js";
import * as authClient from "../api/auth-client.js";
import {
  createCartLineStatusOkFixture,
  createCartLineStatusNotFoundFixture,
} from "../test/cartFixtures.js";

beforeEach(() => {
  localStorage.clear();
  cartStore._reset();
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  cartStore._reset();
  vi.restoreAllMocks();
});

describe("CartPage (T007 - US1)", () => {
  it("hiển thị 'Giỏ hàng của bạn đang trống.' kèm liên kết về '/' khi giỏ rỗng", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });

    render(<CartPage />);

    expect(await screen.findByText("Giỏ hàng của bạn đang trống.")).toBeTruthy();
    const homeLink = screen.getByRole("link", { name: /trang chủ/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("hiển thị 'Không lưu được giỏ hàng trên trình duyệt này.' khi cartStore bị unavailable", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    vi.spyOn(cartStore, "getSnapshot").mockReturnValue({
      lines: [],
      unavailable: true,
    });

    render(<CartPage />);

    expect(
      await screen.findByText("Không lưu được giỏ hàng trên trình duyệt này."),
    ).toBeTruthy();
  });

  it("hiển thị 'Tài khoản chủ shop không đặt đơn được.' và giữ nguyên giỏ hàng khi là shop_owner", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: {
        account: {
          id: 1,
          email: "owner@shop.vn",
          role: "shop_owner",
        },
      },
    });
    cartStore.add(1, 2);

    const fetchSpy = vi.spyOn(cartClient, "fetchCartLineStatuses");

    render(<CartPage />);

    expect(
      await screen.findByText("Tài khoản chủ shop không đặt đơn được."),
    ).toBeTruthy();
    // Không gọi fetchCartLineStatuses và không sửa giỏ hàng
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 1, quantity: 2 }]);
  });

  it("Guest không có session vẫn hiển thị giỏ hàng, thông tin dòng, và Tổng tiền hàng", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);
    cartStore.add(2, 1);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: "/images/cf.jpg" },
          }),
          createCartLineStatusOkFixture({
            productId: 2,
            lineStatus: "ok",
            product: { name: "Bánh mì pate", price: 20000, imagePath: null },
          }),
        ],
      },
    });

    render(<CartPage />);

    // Kiểm tra thông tin các dòng
    expect(await screen.findByText("Cà phê sữa đá")).toBeTruthy();
    expect(screen.getByText("Bánh mì pate")).toBeTruthy();
    expect(screen.getByText(/25\.000₫/)).toBeTruthy();
    expect(screen.getAllByText(/20\.000₫/).length).toBeGreaterThanOrEqual(1);

    // Line subtotal từng dòng: 25000 * 2 = 50.000₫; 20000 * 1 = 20.000₫
    expect(screen.getByText("50.000₫")).toBeTruthy();

    // Tổng tiền hàng: 50.000 + 20.000 = 70.000₫
    expect(screen.getByText(/Tổng tiền hàng/)).toBeTruthy();
    expect(screen.getByText("70.000₫")).toBeTruthy();

    // KHÔNG có dòng phí giao hàng nào (FR-006, UX spec)
    expect(screen.queryByText(/phí giao hàng/i)).toBeNull();
    expect(screen.queryByText(/phí vận chuyển/i)).toBeNull();
    expect(screen.queryByText(/phí ship/i)).toBeNull();

    // Hình ảnh
    expect(screen.getByRole("img", { name: "Cà phê sữa đá" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Bánh mì pate — chưa có ảnh/i })).toBeTruthy();
  });

  it("gọi cartStore.dropUnknown khi API trả về not_found", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 1);
    cartStore.add(99, 1);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockImplementation(async (reqLines) => {
      const respLines = reqLines.map((l) => {
        if (l.productId === 1) {
          return createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          });
        }
        return createCartLineStatusNotFoundFixture({
          productId: l.productId,
        });
      });
      return {
        kind: "ok",
        data: { lines: respLines },
      };
    });

    render(<CartPage />);

    await waitFor(() => {
      // Dòng 99 đã bị drop khỏi cartStore
      expect(cartStore.getSnapshot().lines).toEqual([{ productId: 1, quantity: 1 }]);
    });
  });

  it("giỏ hàng đã lưu trong storage hiển thị nguyên vẹn sau khi remount (reload)", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 3);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          }),
        ],
      },
    });

    const { unmount } = render(<CartPage />);
    expect(await screen.findByText("Cà phê sữa đá")).toBeTruthy();
    expect(screen.getAllByText("75.000₫").length).toBe(2);
    unmount();

    // Remount (mô phỏng reload trang khi localStorage vẫn còn)
    render(<CartPage />);
    expect(await screen.findByText("Cà phê sữa đá")).toBeTruthy();
    expect(screen.getAllByText("75.000₫").length).toBe(2);
  });

  it("khi giá sản phẩm thay đổi giữa 2 lần mount, hiển thị giá mới nhất (US1-6)", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);

    const fetchSpy = vi.spyOn(cartClient, "fetchCartLineStatuses");
    fetchSpy.mockResolvedValueOnce({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          }),
        ],
      },
    });

    const { unmount } = render(<CartPage />);
    await screen.findByText("Cà phê sữa đá");
    expect(screen.getAllByText("50.000₫").length).toBe(2);
    unmount();

    // Lần mount thứ 2: giá tăng lên 30.000₫
    fetchSpy.mockResolvedValueOnce({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 30000, imagePath: null },
          }),
        ],
      },
    });

    render(<CartPage />);
    await screen.findByText("Cà phê sữa đá");
    expect(screen.getAllByText("60.000₫").length).toBe(2);
    expect(screen.getByText(/30\.000₫/)).toBeTruthy();
  });
});

describe("CartPage — chỉnh sửa số lượng và xoá dòng (T008 - US2)", () => {
  it("chỉnh sửa số lượng tăng/giảm re-check qua API và phát thông báo aria-live 'Đã cập nhật số lượng {tên}.'", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);

    const fetchSpy = vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          }),
        ],
      },
    });

    render(<CartPage />);
    await screen.findByText("Cà phê sữa đá");

    // Bấm nút tăng số lượng
    const incBtn = screen.getByRole("button", { name: /Tăng số lượng Cà phê sữa đá/ });
    fireEvent.click(incBtn);

    // cartStore được cập nhật thành 3
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 1, quantity: 3 }]);

    // fetchCartLineStatuses được gọi lại với quantity = 3
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith([{ productId: 1, quantity: 3 }]);
    });

    // Thông báo aria-live
    expect(await screen.findByText("Đã cập nhật số lượng Cà phê sữa đá.")).toBeTruthy();
  });

  it("chỉnh sửa số lượng về 0 xoá dòng khỏi giỏ hàng và thông báo 'Đã xoá {tên} khỏi giỏ hàng.'", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 1);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          }),
        ],
      },
    });

    render(<CartPage />);
    await screen.findByText("Cà phê sữa đá");

    // Giảm số lượng từ 1 về 0
    const decBtn = screen.getByRole("button", { name: /Giảm số lượng Cà phê sữa đá/ });
    fireEvent.click(decBtn);

    // Dòng bị xoá khỏi giỏ
    expect(cartStore.getSnapshot().lines).toEqual([]);
    // Thông báo xoá
    expect(await screen.findByText("Đã xoá Cà phê sữa đá khỏi giỏ hàng.")).toBeTruthy();
  });

  it("bấm nút Xoá không hiện hộp thoại xác nhận (FR-005) và thông báo 'Đã xoá {tên} khỏi giỏ hàng.'", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 1,
            lineStatus: "ok",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          }),
        ],
      },
    });

    const confirmSpy = vi.spyOn(window, "confirm");

    render(<CartPage />);
    await screen.findByText("Cà phê sữa đá");

    const deleteBtn = screen.getByRole("button", { name: /Xoá Cà phê sữa đá/i });
    fireEvent.click(deleteBtn);

    // Không có confirm dialog nào
    expect(confirmSpy).not.toHaveBeenCalled();
    // Giỏ hàng trống
    expect(cartStore.getSnapshot().lines).toEqual([]);
    // Thông báo xoá
    expect(await screen.findByText("Đã xoá Cà phê sữa đá khỏi giỏ hàng.")).toBeTruthy();
  });
});
