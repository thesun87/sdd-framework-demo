// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RouteAnnouncer } from "./RouteAnnouncer.js";

afterEach(() => {
  cleanup();
});

describe("RouteAnnouncer", () => {
  it("render ra một vùng aria-live politeness=polite", () => {
    render(<RouteAnnouncer message="" />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("nhận nội dung thông báo mới khi route đổi", () => {
    const { rerender } = render(<RouteAnnouncer message="" />);

    rerender(<RouteAnnouncer message="Đã chuyển đến trang Giỏ hàng" />);

    const region = screen.getByRole("status");
    expect(region.textContent).toBe("Đã chuyển đến trang Giỏ hàng");
  });

  it("thông báo thay đổi khi lọc danh mục, tìm kiếm, hoặc chuyển trang", () => {
    const { rerender } = render(<RouteAnnouncer message="Đang ở trang chủ" />);
    const region = screen.getByRole("status");

    rerender(<RouteAnnouncer message="Đã lọc danh mục Đồ gia dụng" />);
    expect(region.textContent).toBe("Đã lọc danh mục Đồ gia dụng");

    rerender(<RouteAnnouncer message="Kết quả tìm kiếm cho «cà phê»" />);
    expect(region.textContent).toBe("Kết quả tìm kiếm cho «cà phê»");

    rerender(<RouteAnnouncer message="Đang ở trang 2" />);
    expect(region.textContent).toBe("Đang ở trang 2");
  });
});
