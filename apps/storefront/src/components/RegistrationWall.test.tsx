import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RegistrationWall } from "./RegistrationWall.js";
import * as router from "../router/router.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RegistrationWall (T013 - US5)", () => {
  it("hiển thị đúng thông điệp chuẩn và 2 hành động Đăng ký, Đăng nhập (FR-014)", () => {
    render(<RegistrationWall />);

    expect(
      screen.getByText(
        "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên.",
      ),
    ).toBeTruthy();

    const registerLink = screen.getByRole("link", { name: "Đăng ký" });
    expect(registerLink.getAttribute("href")).toBe("/register?returnTo=/place-order");

    const loginLink = screen.getByRole("link", { name: "Đăng nhập" });
    expect(loginLink.getAttribute("href")).toBe("/login?returnTo=/place-order");
  });

  it("bấm Đăng ký điều hướng tới /register?returnTo=/place-order", () => {
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});
    render(<RegistrationWall />);

    const registerLink = screen.getByRole("link", { name: "Đăng ký" });
    fireEvent.click(registerLink);

    expect(navigateSpy).toHaveBeenCalledWith("/register?returnTo=/place-order");
  });

  it("bấm Đăng nhập điều hướng tới /login?returnTo=/place-order", () => {
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});
    render(<RegistrationWall />);

    const loginLink = screen.getByRole("link", { name: "Đăng nhập" });
    fireEvent.click(loginLink);

    expect(navigateSpy).toHaveBeenCalledWith("/login?returnTo=/place-order");
  });

  it("không chứa form nhập liệu và không hiển thị dưới dạng lỗi (FR-014)", () => {
    const { container } = render(<RegistrationWall />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.querySelectorAll("form").length).toBe(0);
    expect(container.querySelectorAll("input").length).toBe(0);
  });
});
