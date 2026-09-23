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
});
