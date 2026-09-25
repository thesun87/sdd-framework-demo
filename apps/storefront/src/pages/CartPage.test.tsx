import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CartPage } from "./CartPage.js";
import { cartStore } from "../cart/cartStore.js";
import * as cartClient from "../api/cart-client.js";
import * as authClient from "../api/auth-client.js";
import {
  createCartLineStatusOkFixture,
  createCartLineStatusNotFoundFixture,
  createCartLineStatusExceedsStockFixture,
  createCartLineStatusOutOfStockFixture,
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

describe("CartPage — cờ trạng thái dòng và nút Đặt đơn (T009 - US3)", () => {
  it("hiển thị cờ exceeds_stock, không để lộ số tồn kho, và vô hiệu hoá Đặt đơn kèm lý do", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 5);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusExceedsStockFixture({
            productId: 1,
            lineStatus: "exceeds_stock",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          }),
        ],
      },
    });

    render(<CartPage />);
    await screen.findByText("Cà phê sữa đá");

    // Thông báo cờ dòng exceeds_stock
    expect(
      screen.getByText("Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn."),
    ).toBeTruthy();

    // Dòng không bị tự động xoá hay tự sửa (FR-009)
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 1, quantity: 5 }]);

    // Không để lộ số tồn kho (AD-19, giả định tồn kho là 73 — không xuất hiện trong DOM)
    expect(document.body.textContent).not.toMatch(/\b73\b/);

    // Nút Đặt đơn bị vô hiệu hoá kèm lý do
    expect(screen.getByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeTruthy();
    const orderBtn = screen.getByRole("button", { name: "Đặt đơn" });
    expect(orderBtn.hasAttribute("disabled")).toBe(true);
  });

  it("hiển thị cờ out_of_stock, giữ nguyên dòng và vô hiệu hoá Đặt đơn", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(2, 1);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOutOfStockFixture({
            productId: 2,
            lineStatus: "out_of_stock",
            product: { name: "Bánh mì pate", price: 20000, imagePath: null },
          }),
        ],
      },
    });

    render(<CartPage />);
    await screen.findByText("Bánh mì pate");

    // Thông báo cờ dòng out_of_stock
    expect(screen.getByText("Sản phẩm này đang hết hàng.")).toBeTruthy();

    // Dòng không bị xoá
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 2, quantity: 1 }]);

    // Đặt đơn bị vô hiệu hoá
    expect(screen.getByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeTruthy();
    const orderBtn = screen.getByRole("button", { name: "Đặt đơn" });
    expect(orderBtn.hasAttribute("disabled")).toBe(true);
  });

  it("khi mọi dòng đều ok và kiểm tra thành công, nút Đặt đơn bật và dẫn tới /place-order", async () => {
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

    render(<CartPage />);
    await screen.findByText("Cà phê sữa đá");

    // Nút Đặt đơn là một liên kết hợp lệ tới /place-order
    const orderLink = screen.getByRole("link", { name: "Đặt đơn" });
    expect(orderLink.getAttribute("href")).toBe("/place-order");

    // Không có thông báo lý do chặn
    expect(screen.queryByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeNull();
    expect(screen.queryByText("Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang.")).toBeNull();
  });

  it("khi kiểm tra API thất bại, Đặt đơn bị vô hiệu hoá và hiện lý do thử tải lại", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "error",
      message: "Network Error",
    });

    render(<CartPage />);

    expect(
      await screen.findByText("Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang."),
    ).toBeTruthy();

    const orderBtn = screen.getByRole("button", { name: "Đặt đơn" });
    expect(orderBtn.hasAttribute("disabled")).toBe(true);
  });
});

describe("CartPage — trạng thái dòng gắn với giỏ hàng hiện tại và gating Đặt đơn (T016 - FR-008/FR-010/US3-3/US3-4)", () => {
  type StatusFetchResult = Awaited<ReturnType<typeof cartClient.fetchCartLineStatuses>>;

  it("trước khi có phản hồi đầu tiên, Đặt đơn bị vô hiệu hoá với lý do đang kiểm tra", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);

    let resolveFirst!: (value: StatusFetchResult) => void;
    vi.spyOn(cartClient, "fetchCartLineStatuses").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    render(<CartPage />);

    expect(await screen.findByText("Đang kiểm tra tình trạng hàng.")).toBeTruthy();
    const orderBtn = screen.getByRole("button", { name: "Đặt đơn" });
    expect(orderBtn.hasAttribute("disabled")).toBe(true);

    // Dọn dẹp promise treo để không rò rỉ sang test khác
    await act(async () => {
      resolveFirst({
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
    });
    await screen.findByRole("link", { name: "Đặt đơn" });
  });

  it("tăng số lượng dòng đang ok: Đặt đơn bị vô hiệu hoá với lý do đang kiểm tra cho đến khi có phản hồi mới", async () => {
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

    render(<CartPage />);
    await screen.findByRole("link", { name: "Đặt đơn" });

    let resolveSecond!: (value: StatusFetchResult) => void;
    fetchSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );

    const incBtn = screen.getByRole("button", { name: /Tăng số lượng Cà phê sữa đá/ });
    fireEvent.click(incBtn);

    // Trong lúc chờ phản hồi cho số lượng mới: Đặt đơn bị vô hiệu hoá, không dùng lại kết quả cũ
    expect(await screen.findByText("Đang kiểm tra tình trạng hàng.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đặt đơn" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("link", { name: "Đặt đơn" })).toBeNull();

    await act(async () => {
      resolveSecond({
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
    });

    expect(await screen.findByRole("link", { name: "Đặt đơn" })).toBeTruthy();
    expect(screen.queryByText("Đang kiểm tra tình trạng hàng.")).toBeNull();
  });

  it("phản hồi lỗi thời (out-of-order) của lần kiểm tra cũ không ghi đè kết quả của các dòng hiện tại (AD-20)", async () => {
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

    render(<CartPage />);
    await screen.findByRole("link", { name: "Đặt đơn" });

    let resolveStale!: (value: StatusFetchResult) => void;
    let resolveCurrent!: (value: StatusFetchResult) => void;
    fetchSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
    );
    fetchSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCurrent = resolve;
        }),
    );

    const incBtn = screen.getByRole("button", { name: /Tăng số lượng Cà phê sữa đá/ });
    fireEvent.click(incBtn); // 2 -> 3, kích hoạt lần kiểm tra sẽ trở thành "cũ"
    fireEvent.click(incBtn); // 3 -> 4, kích hoạt lần kiểm tra "hiện tại"

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));

    // Lần kiểm tra HIỆN TẠI trả lời trước, thành công (ok)
    await act(async () => {
      resolveCurrent({
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
    });
    expect(await screen.findByRole("link", { name: "Đặt đơn" })).toBeTruthy();

    // Lần kiểm tra CŨ trả lời muộn, mang cờ exceeds_stock — phải bị bỏ qua
    await act(async () => {
      resolveStale({
        kind: "ok",
        data: {
          lines: [
            createCartLineStatusExceedsStockFixture({
              productId: 1,
              lineStatus: "exceeds_stock",
              product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
            }),
          ],
        },
      });
      await Promise.resolve();
    });

    // Kết quả lỗi thời không được áp dụng: Đặt đơn vẫn bật, không có cờ nào xuất hiện
    expect(screen.getByRole("link", { name: "Đặt đơn" })).toBeTruthy();
    expect(screen.queryByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeNull();
    expect(
      screen.queryByText("Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn."),
    ).toBeNull();
  });

  it("US3-4: giảm số lượng dòng exceeds_stock xuống mức hợp lệ, cờ biến mất, Đặt đơn bật, và có thông báo aria-live 'đã hợp lệ'", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 5);

    const fetchSpy = vi.spyOn(cartClient, "fetchCartLineStatuses");
    fetchSpy.mockResolvedValueOnce({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusExceedsStockFixture({
            productId: 1,
            lineStatus: "exceeds_stock",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
          }),
        ],
      },
    });

    render(<CartPage />);
    await screen.findByText("Bạn sửa các dòng được đánh dấu để đặt đơn.");

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

    const decBtn = screen.getByRole("button", { name: /Giảm số lượng Cà phê sữa đá/ });
    fireEvent.click(decBtn); // 5 -> 4

    expect(await screen.findByRole("link", { name: "Đặt đơn" })).toBeTruthy();
    expect(screen.queryByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeNull();

    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Các dòng giỏ hàng đã hợp lệ, bạn có thể đặt đơn.");
  });

  it("US3-4: xoá dòng exceeds_stock khỏi giỏ hàng, cờ biến mất, Đặt đơn bật, và có thông báo aria-live 'đã hợp lệ'", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 5);
    cartStore.add(2, 1);

    const fetchSpy = vi.spyOn(cartClient, "fetchCartLineStatuses");
    fetchSpy.mockResolvedValueOnce({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusExceedsStockFixture({
            productId: 1,
            lineStatus: "exceeds_stock",
            product: { name: "Cà phê sữa đá", price: 25000, imagePath: null },
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
    await screen.findByText("Bạn sửa các dòng được đánh dấu để đặt đơn.");

    fetchSpy.mockResolvedValueOnce({
      kind: "ok",
      data: {
        lines: [
          createCartLineStatusOkFixture({
            productId: 2,
            lineStatus: "ok",
            product: { name: "Bánh mì pate", price: 20000, imagePath: null },
          }),
        ],
      },
    });

    const removeBtn = screen.getByRole("button", { name: /Xoá Cà phê sữa đá khỏi giỏ hàng/i });
    fireEvent.click(removeBtn);

    expect(await screen.findByRole("link", { name: "Đặt đơn" })).toBeTruthy();
    expect(screen.queryByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeNull();

    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Các dòng giỏ hàng đã hợp lệ, bạn có thể đặt đơn.");
  });
});

describe("CartPage — không hiện giá giả khi chưa có trạng thái thành công (T017 - FR-006, Ruling R2)", () => {
  it("trước khi có phản hồi kiểm tra đầu tiên, không hiện 0₫ hay bất kỳ giá nào, và không hiện Tổng tiền hàng", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);

    // Yêu cầu kiểm tra không bao giờ trả lời (đang chờ)
    vi.spyOn(cartClient, "fetchCartLineStatuses").mockImplementation(
      () => new Promise(() => {}),
    );

    render(<CartPage />);

    expect(await screen.findByText("Sản phẩm #1")).toBeTruthy();
    expect(screen.queryByText(/₫/)).toBeNull();
    expect(screen.queryByText(/Tổng tiền hàng/)).toBeNull();
  });

  it("khi kiểm tra API thất bại (chưa từng có trạng thái thành công), không hiện 0₫ hay Tổng tiền hàng", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });
    cartStore.add(1, 2);

    vi.spyOn(cartClient, "fetchCartLineStatuses").mockResolvedValue({
      kind: "error",
      message: "Network Error",
    });

    render(<CartPage />);

    expect(
      await screen.findByText("Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang."),
    ).toBeTruthy();
    expect(screen.getByText("Sản phẩm #1")).toBeTruthy();
    expect(screen.queryByText(/₫/)).toBeNull();
    expect(screen.queryByText(/Tổng tiền hàng/)).toBeNull();
  });
});
