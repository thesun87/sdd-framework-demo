import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthHeader } from "./AuthHeader.js";
import * as authClient from "../api/auth-client.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AuthHeader — trạng thái tài khoản trên storefront", () => {
  it("hiển thị liên kết Đăng nhập và Đăng ký khi là Guest (chưa đăng nhập)", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: { account: null },
    });

    render(<AuthHeader />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Đăng ký" })).toBeTruthy();
    });
  });

  it("hiển thị email tài khoản khi đã đăng nhập", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });

    render(<AuthHeader />);

    await waitFor(() => {
      expect(screen.getByText("khach@example.com")).toBeTruthy();
    });
  });

  it("bấm nút Đăng xuất gọi api logout và chuyển về trạng thái Guest (FR-011)", async () => {
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });
    const logoutSpy = vi.spyOn(authClient, "logout").mockResolvedValueOnce({
      kind: "ok",
      data: { success: true },
    });

    const { fireEvent } = await import("@testing-library/react");
    render(<AuthHeader />);

    await waitFor(() => {
      expect(screen.getByText("khach@example.com")).toBeTruthy();
    });

    const logoutBtn = screen.getByRole("button", { name: "Đăng xuất" });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeTruthy();
      expect(screen.queryByText("khach@example.com")).toBeNull();
    });
  });

  it("hiển thị biểu tượng giỏ hàng cho Guest và Customer, nhưng ẩn với Shop owner (US6-2)", async () => {
    // 1. Guest -> có biểu tượng giỏ hàng
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: { account: null },
    });

    const { unmount: unmountGuest } = render(<AuthHeader />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /giỏ hàng/i })).toBeTruthy();
    });
    unmountGuest();

    // 2. Customer -> có biểu tượng giỏ hàng
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });

    const { unmount: unmountCustomer } = render(<AuthHeader />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /giỏ hàng/i })).toBeTruthy();
    });
    unmountCustomer();

    // 3. Shop owner -> KHÔNG có biểu tượng giỏ hàng
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 2, email: "owner@example.com", role: "shop_owner" },
      },
    });

    render(<AuthHeader />);
    await waitFor(() => {
      expect(screen.getByText("owner@example.com")).toBeTruthy();
      expect(screen.queryByRole("link", { name: /giỏ hàng/i })).toBeNull();
    });
  });
});
