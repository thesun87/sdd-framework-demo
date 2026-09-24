import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCartLineStatuses } from "./cart-client.js";

describe("fetchCartLineStatuses (T005)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("gọi mạng hai lần liên tiếp sẽ thực hiện 2 request độc lập và trả về 2 kết quả khác nhau (không cache, AD-20)", async () => {
    const mock1 = {
      lines: [
        {
          productId: 1,
          lineStatus: "ok",
          product: { name: "Bình", price: 100000, imagePath: null },
        },
      ],
    };
    const mock2 = {
      lines: [
        {
          productId: 1,
          lineStatus: "out_of_stock",
          product: { name: "Bình", price: 100000, imagePath: null },
        },
      ],
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        json: async () => (callCount === 1 ? mock1 : mock2),
      } as Response;
    });

    const res1 = await fetchCartLineStatuses([{ productId: 1, quantity: 1 }]);
    expect(res1).toEqual({ kind: "ok", data: mock1 });

    const res2 = await fetchCartLineStatuses([{ productId: 1, quantity: 1 }]);
    expect(res2).toEqual({ kind: "ok", data: mock2 });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      "/api/cart-lines/status",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
  });

  it("body gửi lên server KHÔNG BAO GIỜ chứa price dù input có chứa price", async () => {
    let capturedBody: any;
    globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
      capturedBody = JSON.parse(options.body as string);
      return {
        ok: true,
        status: 200,
        json: async () => ({ lines: [] }),
      } as Response;
    });

    const linesWithPrice = [
      { productId: 5, quantity: 2, price: 999999 } as any,
    ];

    await fetchCartLineStatuses(linesWithPrice);

    expect(capturedBody).toEqual({
      lines: [{ productId: 5, quantity: 2 }],
    });
    expect(capturedBody.lines[0].price).toBeUndefined();
  });

  it("lỗi mạng trả về kind: 'error'", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection lost"));

    const res = await fetchCartLineStatuses([{ productId: 1, quantity: 1 }]);
    expect(res.kind).toBe("error");
    if (res.kind === "error") {
      expect(res.message).toContain("kết nối");
    }
  });

  it("schema sai định dạng trả về kind: 'error'", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ lines: [{ productId: "invalid", lineStatus: "unknown" }] }),
    } as Response);

    const res = await fetchCartLineStatuses([{ productId: 1, quantity: 1 }]);
    expect(res.kind).toBe("error");
  });

  it("server trả lỗi HTTP (e.g. 500) trả về kind: 'error'", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "INTERNAL_ERROR", message: "Server error" } }),
    } as Response);

    const res = await fetchCartLineStatuses([{ productId: 1, quantity: 1 }]);
    expect(res.kind).toBe("error");
  });
});

describe("useCurrentAccount (T005)", () => {
  it("trả về đúng vai trò tài khoản dựa trên getCurrentUser()", async () => {
    // 1. Khi là Guest
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ account: null }),
    } as Response);

    const { useCurrentAccount } = await import("./useCurrentAccount.js");
    const { renderHook, waitFor } = await import("@testing-library/react");

    const { result, unmount } = renderHook(() => useCurrentAccount());
    expect(result.current).toBe("loading");

    await waitFor(() => {
      expect(result.current).toBe("guest");
    });
    unmount();

    // 2. Khi là Customer
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        account: { id: 1, email: "user@test.vn", role: "customer" },
      }),
    } as Response);

    const { result: resCustomer, unmount: unmountCustomer } = renderHook(() => useCurrentAccount());
    await waitFor(() => {
      expect(resCustomer.current).toBe("customer");
    });
    unmountCustomer();

    // 3. Khi là Shop owner
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        account: { id: 2, email: "owner@test.vn", role: "shop_owner" },
      }),
    } as Response);

    const { result: resOwner, unmount: unmountOwner } = renderHook(() => useCurrentAccount());
    await waitFor(() => {
      expect(resOwner.current).toBe("shop_owner");
    });
    unmountOwner();
  });
});
