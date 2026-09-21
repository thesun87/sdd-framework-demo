// apps/api/src/modules/catalog/catalog.repository.ts
//
// Lớp truy cập dữ liệu THÔ cho `product`/`product_image` — KHÔNG chứa quyết định nghiệp vụ
// (đó là việc của `catalog.service.ts`), chỉ câu lệnh SQL tham số hoá.
//
// Không thêm hàm đọc `category`: bảng đó tồn tại (T004) nhưng KHÔNG hình dạng response nào
// của `specs/000-walking-skeleton/contracts/storefront-http.md` phơi nó ra ở feature `000`
// (`ProductSummarySchema`/`ProductDetailSchema` của `packages/shared` không có trường
// category) — duyệt theo danh mục là `001` (data-model.md §Module catalog, dòng "Danh mục có
// mặt ở 000 chỉ để Product thuộc về 0..1 Category"). Thêm một hàm đọc không ai gọi là mã chết
// không được test — task-011-report.md ghi rõ quyết định này để reviewer không hiểu nhầm là
// thiếu sót.
//
// Dùng SQL tham số hoá trực tiếp qua `pg.Pool` (KHÔNG qua Drizzle query builder): import
// trực tiếp bảng từ `db/schema/**` (nằm NGOÀI `apps/api/`) làm vỡ `rootDir: "./src"` của
// `apps/api/tsconfig.json` (TS6059 — "File is not under 'rootDir'") khi chạy `tsc` toàn
// chương trình (`npm run lint`/`npm run build`) — đúng ràng buộc mà
// `apps/api/src/modules/stock/stock-test-support.ts` đã ghi lại (dòng 8–14) khi né cùng lỗi
// này. "Không khai lại bảng" (Requirement #1 của brief) ở đây nghĩa là: tên bảng/cột dưới
// đây khớp NGUYÊN VĂN với `db/schema/catalog.ts` (T004) — `product(id, category_id, name,
// name_normalized, description, price, created_at)`,
// `product_image(id, product_id, path, position)` — không phải tái sử dụng chính object
// Drizzle đã khai ở đó.
//
// KHÔNG bao giờ SELECT/JOIN lên `stock`/`stock_ledger` ở đây (AD-5) — tình trạng tồn kho lấy
// qua `stock.public.ts`, gọi ở `catalog.service.ts`, không phải ở lớp truy cập dữ liệu này.
//
// `name_normalized` (AD-11 — chuẩn hoá LÚC GHI): đường đọc ở đây không tính lại giá trị này
// (không có endpoint ghi nào ở `000` — Requirement #11 cấm tạo `usecases/`, và không response
// nào phơi trường này ra ngoài), nên không SELECT cột đó. Nếu một task sau (viết `category`/
// `product`) cần tính `name_normalized`, PHẢI dùng đúng hàm `normalizeName` của T005
// (task-005-report.md, `db/seed.ts`) — không phát minh quy tắc thứ hai.
import type { Pool } from 'pg';
import { storefront } from 'shared';

export interface ProductSummaryRow {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly imagePath: string | null;
}

export interface ProductRow {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly price: number;
}

export interface ProductImageRow {
  readonly path: string;
  readonly position: number;
}

export interface CategorySummaryRow {
  readonly id: number;
  readonly name: string;
  readonly productCount: number;
}

export interface FindProductSummariesOptions {
  categoryId?: number;
  q?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedProductSummaries {
  items: ProductSummaryRow[];
  totalItems: number;
}

/**
 * `GET /api/categories` — danh sách danh mục phẳng kèm số lượng sản phẩm (FR-005).
 * Đếm toàn bộ sản phẩm thuộc danh mục bất kể tình trạng tồn kho.
 */
export async function findAllCategories(pool: Pool): Promise<CategorySummaryRow[]> {
  const result = await pool.query<{ id: number; name: string; productCount: string | number }>(
    `SELECT c.id,
            c.name,
            COUNT(p.id)::int AS "productCount"
       FROM category c
  LEFT JOIN product p ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.id ASC`,
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    productCount: Number(r.productCount),
  }));
}

/**
 * `GET /api/products` — hỗ trợ lọc theo categoryId, q, và phân trang page/pageSize (FR-002, FR-003, FR-011).
 */
export async function findProductSummaries(
  pool: Pool,
  options: FindProductSummariesOptions,
): Promise<PaginatedProductSummaries> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.categoryId !== undefined) {
    params.push(options.categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  if (options.q !== undefined && !storefront.isSearchQueryBlank(options.q)) {
    const normalized = storefront.normalizeProductName(options.q);
    params.push(`%${normalized}%`);
    conditions.push(`p.name_normalized LIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<{ total: string | number }>(
    `SELECT COUNT(*)::int AS total FROM product p ${whereClause}`,
    params,
  );
  const totalItems = Number(countResult.rows[0]?.total ?? 0);

  const queryParams = [...params];
  const offset = (options.page - 1) * options.pageSize;
  queryParams.push(options.pageSize);
  const limitPlaceholder = `$${queryParams.length}`;
  queryParams.push(offset);
  const offsetPlaceholder = `$${queryParams.length}`;

  const itemsResult = await pool.query<ProductSummaryRow>(
    `SELECT p.id,
            p.name,
            p.price,
            (
              SELECT pi.path
                FROM product_image pi
               WHERE pi.product_id = p.id
               ORDER BY pi.position ASC
               LIMIT 1
            ) AS "imagePath"
       FROM product p
       ${whereClause}
      ORDER BY p.id ASC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    queryParams,
  );

  return {
    items: itemsResult.rows,
    totalItems,
  };
}

/**
 * `GET /api/products` — không phân trang ở `000` (contracts/storefront-http.md). Giữ lại cho tương thích ngược.
 */
export async function findAllProductSummaries(pool: Pool): Promise<ProductSummaryRow[]> {
  const result = await pool.query<ProductSummaryRow>(
    `SELECT p.id,
            p.name,
            p.price,
            (
              SELECT pi.path
                FROM product_image pi
               WHERE pi.product_id = p.id
               ORDER BY pi.position ASC
               LIMIT 1
            ) AS "imagePath"
       FROM product p
      ORDER BY p.id ASC`,
  );
  return result.rows;
}

/** `undefined` khi không có `product` nào khớp `id` — caller (`catalog.service.ts`) suy ra
 *  404 (FR-004), không phải lỗi ở lớp này. */
export async function findProductById(pool: Pool, productId: number): Promise<ProductRow | undefined> {
  const result = await pool.query<ProductRow>(
    'SELECT id, name, description, price FROM product WHERE id = $1',
    [productId],
  );
  return result.rows[0];
}

/** Toàn bộ ảnh của một product, sắp theo `position` tăng dần — phần tử đầu tiên (nếu có)
 *  luôn là ảnh đại diện, khớp đúng cách `findAllProductSummaries` chọn ảnh đại diện ở trên. */
export async function findProductImages(pool: Pool, productId: number): Promise<ProductImageRow[]> {
  const result = await pool.query<ProductImageRow>(
    'SELECT path, position FROM product_image WHERE product_id = $1 ORDER BY position ASC',
    [productId],
  );
  return result.rows;
}
