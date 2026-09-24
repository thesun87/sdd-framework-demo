import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddToCartButton } from "./AddToCartButton.js";
import { cartStore } from "../cart/cartStore.js";
import * as authClient from "../api/auth-client.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  cartStore._reset();
});

describe("AddToCartButton (T006)", () => {
  it("không hiển thị khi tài khoản đang loading hoặc là shop_owner (FR-018, US6-1)", async () => {
    // 1. Khi loading
    vi.spyOn(authClient, "getCurrentUser").mockImplementation(
      () => new Promise(() => {}), // never resolves -> loading
    );

    const { unmount } = render(<AddToCartButton productId={1} stockStatus="in_stock" />);
    expect(screen.queryByRole("button", { name: /thêm vào giỏ/i })).toBeNull();
    unmount();

    // 2. Khi shop_owner
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: { account: { id: 2, email: "owner@test.vn", role: "shop_owner" } },
    });

    render(<AddToCartButton productId={1} stockStatus="in_stock" />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /thêm vào giỏ/i })).toBeNull();
    });
  });

  it("hiển thị cho Guest và gọi cartStore.add khi bấm, không điều hướng và có thông báo aria-live (US1-1, US1-2)", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });

    render(<AddToCartButton productId={10} stockStatus="in_stock" />);

    const button = await screen.findByRole("button", { name: /thêm vào giỏ/i });
    expect(button).toBeTruthy();

    const addSpy = vi.spyOn(cartStore, "add");
    fireEvent.click(button);

    expect(addSpy).toHaveBeenCalledWith(10);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 10, quantity: 1 }]);

    // Kiểm tra thông báo aria-live
    await waitFor(() => {
      expect(screen.getByText("Đã thêm vào giỏ hàng.")).toBeTruthy();
    });
  });

  it("bị vô hiệu hoá khi out_of_stock kèm thông báo 'Sản phẩm này đang hết hàng.' (US1-3)", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });

    render(<AddToCartButton productId={10} stockStatus="out_of_stock" />);

    const button = (await screen.findByRole("button", { name: /thêm vào giỏ/i })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Sản phẩm này đang hết hàng.")).toBeTruthy();
  });
});
