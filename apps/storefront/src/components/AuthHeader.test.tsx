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
});
