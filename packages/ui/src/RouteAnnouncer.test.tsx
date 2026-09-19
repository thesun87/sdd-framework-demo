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
});
