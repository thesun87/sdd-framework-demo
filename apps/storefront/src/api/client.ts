// Tầng gọi API thật của storefront — KHÔNG được cache `stockStatus` ở đây, dưới BẤT KỲ
// hình thức nào (AD-20, brief mục 7). Đây là "tầng nguy hiểm nhất": một object JS sống
// trong state React qua nhiều lần điều hướng, hay một cache mặc định của thư viện
// data-fetching, đều đủ để một nhãn "Còn hàng" cũ sống lâu hơn cả server.
//
// Quyết định: KHÔNG dùng react-query/SWR (cache-by-default, phải tắt bằng tay và dễ tái
// bật nhầm khi nâng cấp). Dùng thẳng `fetch` của trình duyệt với `cache: "no-store"`
// TƯỜNG MINH trên mọi request, và KHÔNG giữ lại response nào trong state toàn cục / module
// scope — mỗi lần vào trang gọi lại từ đầu (test `client.stale-stock.test.ts` chứng minh
// bằng cách giả lập fetch trả về hai giá trị khác nhau ở hai lần gọi liên tiếp).
//
// Hình dạng response: import & validate bằng chính schema của `packages/shared` (AD-10).
// KHÔNG khai lại `interface`/`type` nào cho `ProductSummary`/`ProductDetail` ở đây.
import { storefront } from "shared";

type ProductDetail = storefront.ProductDetail;
type ProductsListResponse = storefront.ProductsListResponse;

export type FetchResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

/**
 * Wrapper DUY NHẤT quanh `fetch` trong toàn bộ storefront — `cache: "no-store"` tường minh
 * trên mọi request tới `/api/*`, không phụ thuộc header `Cache-Control` của server (AD-20
 * nói "không tầng nào", client PHẢI tự khoá thay vì tin server sẽ luôn đúng).
 */
function fetchNoStore(path: string): Promise<Response> {
  return fetch(path, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
}

/** `GET /api/categories` — danh sách danh mục phẳng cho sidebar. */
export async function fetchCategories(): Promise<FetchResult<storefront.CategoriesListResponse>> {
  let response: Response;
  try {
    response = await fetchNoStore("/api/categories");
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }
  if (!response.ok) {
    return { kind: "error", message: `Máy chủ trả lỗi (HTTP ${response.status}).` };
  }
  const json: unknown = await response.json();
  const parsed = storefront.CategoriesListResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "error", message: "Dữ liệu danh mục từ máy chủ không đúng định dạng." };
  }
  return { kind: "ok", data: parsed.data };
}

/** `GET /api/products` — lưới trang chủ. */
export async function fetchProducts(
  query?: storefront.ProductListQuery,
): Promise<FetchResult<ProductsListResponse>> {
  let url = "/api/products";
  if (query) {
    const params = new URLSearchParams();
    if (query.categoryId !== undefined) {
      params.set("categoryId", String(query.categoryId));
    }
    if (query.q !== undefined && query.q.trim().length > 0) {
      params.set("q", query.q.trim());
    }
    if (query.page !== undefined) {
      params.set("page", String(query.page));
    }
    if (query.pageSize !== undefined) {
      params.set("pageSize", String(query.pageSize));
    }
    const qs = params.toString();
    if (qs.length > 0) {
      url = `${url}?${qs}`;
    }
  }

  let response: Response;
  try {
    response = await fetchNoStore(url);
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }
  if (!response.ok) {
    return { kind: "error", message: `Máy chủ trả lỗi (HTTP ${response.status}).` };
  }
  const json: unknown = await response.json();
  const parsed = storefront.ProductsListResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "error", message: "Dữ liệu sản phẩm từ máy chủ không đúng định dạng." };
  }
  return { kind: "ok", data: parsed.data };
}

/** `GET /api/products/:id` — trang chi tiết. 404 là kết quả hợp lệ (FR-004), không phải lỗi. */
export async function fetchProductDetail(id: string): Promise<FetchResult<ProductDetail>> {
  let response: Response;
  try {
    response = await fetchNoStore(`/api/products/${encodeURIComponent(id)}`);
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }
  if (response.status === 404) {
    return { kind: "not-found" };
  }
  if (!response.ok) {
    return { kind: "error", message: `Máy chủ trả lỗi (HTTP ${response.status}).` };
  }
  const json: unknown = await response.json();
  const parsed = storefront.ProductDetailSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "error", message: "Dữ liệu sản phẩm từ máy chủ không đúng định dạng." };
  }
  return { kind: "ok", data: parsed.data };
}
