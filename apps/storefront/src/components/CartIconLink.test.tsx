import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { CartIconLink } from "./CartIconLink.js";
import { cartStore } from "../cart/cartStore.js";
import * as authClient from "../api/auth-client.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  cartStore._reset();
});

describe("CartIconLink (T006)", () => {
  it("không hiển thị khi tài khoản đang loading hoặc là shop_owner (FR-018, US6-2)", async () => {
    // 1. Khi loading
    vi.spyOn(authClient, "getCurrentUser").mockImplementation(
      () => new Promise(() => {}),
    );

    const { unmount } = render(<CartIconLink />);
    expect(screen.queryByRole("link", { name: /giỏ hàng/i })).toBeNull();
    unmount();

    // 2. Khi shop_owner
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: { account: { id: 2, email: "owner@test.vn", role: "shop_owner" } },
    });

    render(<CartIconLink />);
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /giỏ hàng/i })).toBeNull();
    });
  });

  it("hiển thị số lượng từ cartStore, không gọi API, và liên kết tới /cart", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      kind: "ok",
      data: { account: null },
    });

    cartStore.add(1);
    cartStore.add(1);
    cartStore.add(2);

    render(<CartIconLink />);

    const link = await screen.findByRole("link", { name: /giỏ hàng/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/cart");
    expect(screen.getByText("3")).toBeTruthy();
  });
});
