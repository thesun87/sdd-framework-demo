// apps/api/src/modules/catalog/catalog-query.ts
//
// Phân tích và chuẩn hoá tham số query cho Product list (T009).
// Tuân thủ ràng buộc từ data-model.md §ProductListQuery và contracts/storefront-http.md.

export interface ProductListParsedQuery {
  categoryId?: number;
  q?: string;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

/**
 * Phân tích tham số request query từ client thành cấu trúc đã chuẩn hoá:
 * - `categoryId`: số nguyên dương tuỳ chọn. Bị xoá (undefined) nếu có tìm kiếm nonblank `q`.
 * - `q`: chuỗi tìm kiếm đã trim; chuỗi rỗng/khoảng trắng được coi là không tìm kiếm (undefined).
 * - `page`: mặc định 1; số < 1 coi là 1.
 * - `pageSize`: mặc định 24; tối đa 100 với clamp (FR-013).
 */
export function parseProductListQuery(
  rawQuery?: Record<string, unknown> | null,
): ProductListParsedQuery {
  const query = rawQuery ?? {};

  // 1. q (search query)
  let q: string | undefined;
  if (typeof query.q === 'string') {
    const trimmed = query.q.trim();
    if (trimmed.length > 0) {
      q = trimmed;
    }
  }

  // 2. categoryId
  let categoryId: number | undefined;
  if (q === undefined && query.categoryId !== undefined && query.categoryId !== null) {
    const parsedCatId = Number.parseInt(String(query.categoryId), 10);
    if (Number.isInteger(parsedCatId) && parsedCatId > 0) {
      categoryId = parsedCatId;
    }
  }

  // 3. page
  let page = DEFAULT_PAGE;
  if (query.page !== undefined && query.page !== null) {
    const parsedPage = Number.parseInt(String(query.page), 10);
    if (Number.isInteger(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  // 4. pageSize
  let pageSize = DEFAULT_PAGE_SIZE;
  if (query.pageSize !== undefined && query.pageSize !== null) {
    const parsedPageSize = Number.parseInt(String(query.pageSize), 10);
    if (Number.isInteger(parsedPageSize) && parsedPageSize >= 1) {
      pageSize = parsedPageSize > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : parsedPageSize;
    }
  }

  return {
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(q !== undefined ? { q } : {}),
    page,
    pageSize,
  };
}
