import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterPage } from "./RegisterPage.js";
import * as authClient from "../api/auth-client.js";
import * as router from "../router/router.js";
import { cartStore } from "../cart/cartStore.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RegisterPage — FR-001, FR-002, FR-003, FR-005", () => {
  it("render đúng form đăng ký gồm email, mật khẩu và nút submit", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Đăng ký tài khoản" })).toBeTruthy();
    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đăng ký" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Đăng nhập/i })).toBeTruthy();
  });

  it("hiện lỗi client-side khi mật khẩu ít hơn 8 ký tự (FR-005)", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "1234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText("Mật khẩu phải có tối thiểu 8 ký tự.")).toBeTruthy();
    });
  });

  it("gửi thông tin đăng ký hợp lệ và điều hướng về trang chủ khi thành công (FR-001, FR-004)", async () => {
    const registerSpy = vi.spyOn(authClient, "register").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "khach@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "MatKhau123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith({
        email: "khach@example.com",
        password: "MatKhau123!",
      });
      expect(navigateSpy).toHaveBeenCalledWith("/");
    });
  });

  it("hiện thông báo lỗi khi email đã tồn tại (FR-003)", async () => {
    vi.spyOn(authClient, "register").mockResolvedValueOnce({
      kind: "error",
      code: "EMAIL_ALREADY_EXISTS",
      message: "Email này đã được đăng ký tài khoản.",
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "da-co@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "MatKhau123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain("Email này đã được đăng ký tài khoản.");
    });
  });

  it("điều hướng về returnTo khi đăng ký thành công nếu có prop returnTo (US5-3, US5-6)", async () => {
    vi.spyOn(authClient, "register").mockResolvedValueOnce({
      kind: "ok",
      data: {
        account: { id: 1, email: "khach@example.com", role: "customer" },
      },
    });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<RegisterPage returnTo="/place-order" />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "khach@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "MatKhau123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith("/place-order");
    });
  });

  it("liên kết Đăng nhập giữ nguyên tham số returnTo khi có prop returnTo (US5-3)", () => {
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});
    render(<RegisterPage returnTo="/place-order" />);

    const link = screen.getByRole("link", { name: /Đăng nhập/i });
    expect(link.getAttribute("href")).toBe("/login?returnTo=/place-order");

    fireEvent.click(link);
    expect(navigateSpy).toHaveBeenCalledWith("/login?returnTo=/place-order");
  });

  it("đăng ký thất bại không làm thay đổi giỏ hàng (FR-013, US4-1)", async () => {
    localStorage.clear();
    cartStore._reset();
    cartStore.add(20, 1);
    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 20, quantity: 1 }]);

    vi.spyOn(authClient, "register").mockResolvedValueOnce({
      kind: "error",
      code: "EMAIL_ALREADY_EXISTS",
      message: "Email này đã được đăng ký tài khoản.",
    });

    render(<RegisterPage returnTo="/place-order" />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "da-co@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), {
      target: { value: "MatKhau123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    expect(cartStore.getSnapshot().lines).toEqual([{ productId: 20, quantity: 1 }]);
  });
});
