import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { storefront } from "shared";
import { HomePage } from "./HomePage.js";
import * as client from "../api/client.js";
import * as router from "../router/router.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const OUT_OF_STOCK_PRODUCT: storefront.ProductSummary = {
  id: 2,
  name: "Sản phẩm hết hàng",
  price: 10000,
  imagePath: null,
  stockStatus: "out_of_stock",
};

describe("HomePage — FR-008: sản phẩm hết hàng vẫn xuất hiện trong lưới", () => {
  it("vẫn render sản phẩm out_of_stock, vẫn là liên kết mở được, không ẩn khỏi lưới", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: { items: [OUT_OF_STOCK_PRODUCT] },
    });

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("Sản phẩm hết hàng")).toBeTruthy());
    expect(screen.getByText("Hết hàng")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Sản phẩm hết hàng/ });
    expect(link.getAttribute("href")).toBe("/products/2");
  });
});

describe("HomePage — lưới rỗng là danh sách rỗng, không phải lỗi", () => {
  it("hiện đúng câu 'Danh mục này chưa có sản phẩm nào.' khi items rỗng", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue({ kind: "ok", data: { items: [] } });

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("Danh mục này chưa có sản phẩm nào.")).toBeTruthy(),
    );
    // Không phải trạng thái lỗi: không role="alert", không chữ "Đã có lỗi xảy ra".
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/Đã có lỗi xảy ra/)).toBeNull();
  });

  it('trạng thái lỗi thật (fetch thất bại) KHÁC lưới rỗng — dùng role="alert"', async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "error",
      message: "Không thể kết nối tới máy chủ.",
    });

    render(<HomePage />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Danh mục này chưa có sản phẩm nào.")).toBeNull();
  });
});

const SAMPLE_CATEGORIES: storefront.CategoriesListResponse = {
  items: [
    { id: 1, name: "Đồ gia dụng", productCount: 24 },
    { id: 2, name: "Thời trang", productCount: 0 },
  ],
};

describe("HomePage — FR-001/FR-005: sidebar danh mục phẳng và số lượng sản phẩm", () => {
  it("render danh sách danh mục phẳng với 'Tất cả sản phẩm' và số lượng sản phẩm", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({
      kind: "ok",
      data: SAMPLE_CATEGORIES,
    });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: { items: [OUT_OF_STOCK_PRODUCT] },
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Tất cả sản phẩm")).toBeTruthy();
      expect(screen.getByText("Đồ gia dụng")).toBeTruthy();
      expect(screen.getByText("24")).toBeTruthy();
      expect(screen.getByText("Thời trang")).toBeTruthy();
      expect(screen.getByText("0")).toBeTruthy();
    });
  });

  it("chọn danh mục lọc sản phẩm theo categoryId", async () => {
    const fetchProductsSpy = vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: { items: [OUT_OF_STOCK_PRODUCT] },
    });
    vi.spyOn(client, "fetchCategories").mockResolvedValue({
      kind: "ok",
      data: SAMPLE_CATEGORIES,
    });

    render(<HomePage categoryId={1} />);

    await waitFor(() => {
      expect(fetchProductsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 1 }),
      );
    });
  });

  it("chọn danh mục xoá từ khoá tìm kiếm theo Clarification 1", async () => {
    const fetchProductsSpy = vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: { items: [] },
    });
    vi.spyOn(client, "fetchCategories").mockResolvedValue({
      kind: "ok",
      data: SAMPLE_CATEGORIES,
    });

    render(<HomePage categoryId={2} />);

    await waitFor(() => {
      expect(fetchProductsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 2 }),
      );
      const lastCall = fetchProductsSpy.mock.calls[0][0];
      expect(lastCall?.q).toBeUndefined();
    });
  });
});

describe("HomePage — US2: tìm kiếm sản phẩm (T023)", () => {
  it("render ô nhập tìm kiếm và nút gửi", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({ kind: "ok", data: { items: [] } });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: /Tìm kiếm sản phẩm/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Tìm/i })).toBeTruthy();
    });
  });

  it("tìm kiếm nonblank xoá phạm vi danh mục và đặt lại trang 1", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({ kind: "ok", data: { items: [] } });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<HomePage categoryId={1} page={2} />);

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: /Tìm kiếm sản phẩm/i })).toBeTruthy();
    });

    const input = screen.getByRole("searchbox", { name: /Tìm kiếm sản phẩm/i });
    fireEvent.change(input, { target: { value: "bình giữ nhiệt" } });
    const submitBtn = screen.getByRole("button", { name: /Tìm/i });
    fireEvent.click(submitBtn);

    expect(navigateSpy).toHaveBeenCalledWith("/?q=b%C3%ACnh%20gi%E1%BB%AF%20nhi%E1%BB%87t");
  });

  it("tìm kiếm chuỗi trắng hoặc rỗng quay lại tất cả sản phẩm trang 1", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({ kind: "ok", data: { items: [] } });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<HomePage q="bình" />);

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: /Tìm kiếm sản phẩm/i })).toBeTruthy();
    });

    const input = screen.getByRole("searchbox", { name: /Tìm kiếm sản phẩm/i });
    fireEvent.change(input, { target: { value: "   " } });
    const submitBtn = screen.getByRole("button", { name: /Tìm/i });
    fireEvent.click(submitBtn);

    expect(navigateSpy).toHaveBeenCalledWith("/");
  });

  it("hiện đúng câu không có kết quả: 'Không có sản phẩm nào khớp với «{từ khoá}».' và không báo lỗi hệ thống", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({ kind: "ok", data: { items: [] } });

    render(<HomePage q="không tồn tại" />);

    await waitFor(() => {
      expect(
        screen.getByText("Không có sản phẩm nào khớp với «không tồn tại»."),
      ).toBeTruthy();
    });
    // Không coi kết quả rỗng là lỗi
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("HomePage — US3: phân trang danh sách sản phẩm (T030)", () => {
  it("hiển thị thanh điều khiển phân trang với ngữ cảnh trang hiện tại và tổng số trang", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: {
        items: [OUT_OF_STOCK_PRODUCT],
        pagination: { page: 1, pageSize: 24, totalItems: 50, totalPages: 3 },
      },
    });

    render(<HomePage page={1} />);

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: "Phân trang" })).toBeTruthy();
      expect(screen.getByText("Trang 1 / 3")).toBeTruthy();
    });

    const prevBtn = screen.getByRole("button", { name: "Trang trước" });
    const nextBtn = screen.getByRole("button", { name: "Trang sau" });
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
    expect(nextBtn.hasAttribute("disabled")).toBe(false);
  });

  it("bấm chuyển trang bảo tồn phạm vi lọc hiện tại (categoryId) và điều hướng đúng URL", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: {
        items: [OUT_OF_STOCK_PRODUCT],
        pagination: { page: 1, pageSize: 24, totalItems: 50, totalPages: 3 },
      },
    });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<HomePage categoryId={1} page={1} />);

    await waitFor(() => {
      expect(screen.getByText("Trang 1 / 3")).toBeTruthy();
    });

    const nextBtn = screen.getByRole("button", { name: "Trang sau" });
    fireEvent.click(nextBtn);

    expect(navigateSpy).toHaveBeenCalledWith("/?categoryId=1&page=2");
  });

  it("bấm chuyển trang bảo tồn phạm vi tìm kiếm (q) và điều hướng đúng URL", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: {
        items: [OUT_OF_STOCK_PRODUCT],
        pagination: { page: 2, pageSize: 24, totalItems: 50, totalPages: 3 },
      },
    });
    const navigateSpy = vi.spyOn(router, "navigate").mockImplementation(() => {});

    render(<HomePage q="bình" page={2} />);

    await waitFor(() => {
      expect(screen.getByText("Trang 2 / 3")).toBeTruthy();
    });

    const prevBtn = screen.getByRole("button", { name: "Trang trước" });
    fireEvent.click(prevBtn);

    expect(navigateSpy).toHaveBeenCalledWith("/?q=b%C3%ACnh");
  });

  it("xử lý trang rỗng khi vượt quá phạm vi nhưng vẫn giữ ngữ cảnh và không lỗi hệ thống", async () => {
    vi.spyOn(client, "fetchCategories").mockResolvedValue({ kind: "ok", data: SAMPLE_CATEGORIES });
    vi.spyOn(client, "fetchProducts").mockResolvedValue({
      kind: "ok",
      data: {
        items: [],
        pagination: { page: 99, pageSize: 24, totalItems: 10, totalPages: 1 },
      },
    });

    render(<HomePage page={99} />);

    await waitFor(() => {
      expect(screen.getByText("Danh mục này chưa có sản phẩm nào.")).toBeTruthy();
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

