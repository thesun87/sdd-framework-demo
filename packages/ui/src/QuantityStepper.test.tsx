// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuantityStepper } from "./QuantityStepper.js";

afterEach(() => {
  cleanup();
});

describe("QuantityStepper (T008)", () => {
  const productName = "Cà phê sữa đá";

  it("render nút −, nút + và ô nhập, mỗi điều khiển tối thiểu 44×44 px và có tên trợ năng chuẩn", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} productName={productName} />);

    const decBtn = screen.getByRole("button", { name: `Giảm số lượng ${productName}` });
    const incBtn = screen.getByRole("button", { name: `Tăng số lượng ${productName}` });
    const input = screen.getByRole("spinbutton");

    expect(decBtn).toBeTruthy();
    expect(incBtn).toBeTruthy();
    expect(input).toBeTruthy();

    // Vùng bấm tối thiểu 44×44 px (SC-006, UX spec)
    expect(decBtn.style.minWidth).toBe("44px");
    expect(decBtn.style.minHeight).toBe("44px");
    expect(incBtn.style.minWidth).toBe("44px");
    expect(incBtn.style.minHeight).toBe("44px");
    expect(input.style.minHeight).toBe("44px");
  });

  it("bấm nút + gọi onChange với giá trị tăng 1", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} productName={productName} />);

    const incBtn = screen.getByRole("button", { name: `Tăng số lượng ${productName}` });
    fireEvent.click(incBtn);

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("bấm nút − gọi onChange với giá trị giảm 1", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} productName={productName} />);

    const decBtn = screen.getByRole("button", { name: `Giảm số lượng ${productName}` });
    fireEvent.click(decBtn);

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("nhập số hợp lệ và rời ô (blur) gọi onChange", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} productName={productName} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("nhấn phím Enter trong ô nhập gọi onChange", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} productName={productName} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("nhập số âm hiện thông báo lỗi, gắn aria-describedby và khôi phục giá trị hợp lệ trước đó", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} productName={productName} />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "-1" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    const errorMsg = screen.getByText("Số lượng phải là số nguyên không âm.");
    expect(errorMsg).toBeTruthy();
    expect(input.getAttribute("aria-describedby")).toBe(errorMsg.id);
    expect(input.value).toBe("2");
  });

  it("nhập số không nguyên (1.5) hiện thông báo 'Số lượng phải là số nguyên không âm.' và khôi phục", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={3} onChange={onChange} productName={productName} />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1.5" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Số lượng phải là số nguyên không âm.")).toBeTruthy();
    expect(input.value).toBe("3");
  });

  it("nhập số > 9999 hiện thông báo 'Số lượng quá lớn.' và khôi phục", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} productName={productName} />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "10000" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Số lượng quá lớn.")).toBeTruthy();
    expect(input.value).toBe("2");
  });
});
