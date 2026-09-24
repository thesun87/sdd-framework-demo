import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginPage } from "./LoginPage.js";
import * as authClient from "../api/auth-client.js";
import * as router from "../router/router.js";
import { cartStore } from "../cart/cartStore.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LoginPage — FR-006, FR-007", () => {
  it("render đúng form đăng nhập gồm email, mật khẩu và nút submit", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Đăng nhập" })).toBeTruthy();
    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Đăng ký/i })).toBeTruthy();
  });

  it("gửi thông tin đăng nhập hợp lệ và điều hướng về trang chủ khi thành công (FR-006)", async () => {
    const loginSpy = vi.spyOn(authClient, "login").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "khach@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "MatKhau123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: "khach@example.com",
        password: "MatKhau123!",
      });
      expect(navigateSpy).toHaveBeenCalledWith("/");
    });
  });

  it("hiển thị thông báo lỗi khi thông tin đăng nhập sai (FR-007)", async () => {
    vi.spyOn(authClient, "login").mockResolvedValueOnce({
      kind: "error",
      code: "INVALID_CREDENTIALS",
      message: "Email hoặc mật khẩu không chính xác.",
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "sai@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "SaiMatKhau!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain("Email hoặc mật khẩu không chính xác.");
    });
  });

  it("điều hướng về returnTo khi đăng nhập thành công nếu có prop returnTo (US5-2, US5-6)", async () => {
    vi.spyOn(authClient, "login").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<LoginPage returnTo="/place-order" />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "khach@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "MatKhau123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith("/place-order");
    });
  });

  it("liên kết Đăng ký giữ nguyên tham số returnTo khi có prop returnTo (US5-2)", () => {
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});
    render(<LoginPage returnTo="/place-order" />);

    const link = screen.getByRole("link", { name: /Đăng ký/i });
    expect(link.getAttribute("href")).toBe("/register?returnTo=/place-order");

    fireEvent.click(link);
    expect(navigateSpy).toHaveBeenCalledWith("/register?returnTo=/place-order");
  });

  it("đăng nhập thất bại không làm thay đổi giỏ hàng (FR-013, US4-4)", async () => {
    localStorage.clear();
    cartStore._reset();
    cartStore.add(10, 2);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 10, quantity: 2 }]);

    vi.spyOn(authClient, "login").mockResolvedValueOnce({
      kind: "error",
      code: "INVALID_CREDENTIALS",
      message: "Email hoặc mật khẩu không chính xác.",
    });

    render(<LoginPage returnTo="/place-order" />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "khach@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "SaiPass!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 10, quantity: 2 }]);
  });
});
