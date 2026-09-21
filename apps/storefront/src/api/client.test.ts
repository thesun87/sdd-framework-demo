// Test trung tâm của AD-20: tầng fetch của storefront KHÔNG được phục vụ lại `stockStatus`
// cũ sau khi dữ liệu nguồn đổi. Giả lập `global.fetch` (không đụng mạng thật) và khẳng định
// (a) fetch được GỌI LẠI ở mỗi lần gọi — không có gì chặn trước để trả kết quả cũ, và
// (b) kết quả trả về phản ánh đúng response MỚI NHẤT, không phải response đầu tiên.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCategories, fetchProductDetail, fetchProducts } from "./client.js";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

const IN_STOCK_LIST = {
  items: [{ id: 1, name: "Cà phê sữa đá", price: 25000, imagePath: null, stockStatus: "in_stock" }],
};
const OUT_OF_STOCK_LIST = {
  items: [
    { id: 1, name: "Cà phê sữa đá", price: 25000, imagePath: null, stockStatus: "out_of_stock" },
  ],
};

describe("fetchProducts — không cache stockStatus qua các lần gọi", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gọi fetch lại thật sự ở lần thứ hai, và trả đúng dữ liệu MỚI, không phải dữ liệu cũ", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(IN_STOCK_LIST))
      .mockResolvedValueOnce(jsonResponse(OUT_OF_STOCK_LIST));

    const first = await fetchProducts();
    const second = await fetchProducts();

    // Bằng chứng "có gọi lại", không phải phục vụ từ cache: đúng 2 lần gọi mạng thật.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    if (first.kind !== "ok" || second.kind !== "ok") {
      throw new Error("cả hai lần gọi phải thành công trong test này");
    }
    expect(first.data.items[0].stockStatus).toBe("in_stock");
    expect(second.data.items[0].stockStatus).toBe("out_of_stock");
  });

  it("mỗi request tự khai báo cache: 'no-store' — không dựa vào Cache-Control của server", () => {
    fetchMock.mockResolvedValue(jsonResponse(IN_STOCK_LIST));

    void fetchProducts();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("gửi đúng query string khi truyền categoryId, q, page, pageSize", () => {
    fetchMock.mockResolvedValue(jsonResponse(IN_STOCK_LIST));

    void fetchProducts({ categoryId: 3, page: 2, pageSize: 12 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/products?categoryId=3&page=2&pageSize=12",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});

describe("fetchCategories — danh mục phẳng", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gọi /api/categories với cache: 'no-store' và parse CategoriesListResponseSchema", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [{ id: 1, name: "Đồ gia dụng", productCount: 5 }],
      }),
    );

    const result = await fetchCategories();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.data.items).toEqual([{ id: 1, name: "Đồ gia dụng", productCount: 5 }]);
    }
  });
});

describe("fetchProductDetail — cùng kỷ luật không-cache cho trang chi tiết", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gọi lại và phản ánh stockStatus mới khi dữ liệu nguồn đổi giữa hai lần gọi", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 1,
          name: "Cà phê sữa đá",
          description: "…",
          price: 25000,
          images: [{ path: "/images/x.jpg", position: 0 }],
          stockStatus: "in_stock",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 1,
          name: "Cà phê sữa đá",
          description: "…",
          price: 25000,
          images: [{ path: "/images/x.jpg", position: 0 }],
          stockStatus: "out_of_stock",
        }),
      );

    const first = await fetchProductDetail("1");
    const second = await fetchProductDetail("1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    if (first.kind !== "ok" || second.kind !== "ok") {
      throw new Error("cả hai lần gọi phải thành công trong test này");
    }
    expect(first.data.stockStatus).toBe("in_stock");
    expect(second.data.stockStatus).toBe("out_of_stock");
  });

  it("404 trả về kind: 'not-found' — kết quả hợp lệ, không phải lỗi (FR-004)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: "PRODUCT_NOT_FOUND", message: "Sản phẩm không tồn tại." } }, { status: 404 }),
    );

    const result = await fetchProductDetail("999999999");
    expect(result.kind).toBe("not-found");
  });
});
