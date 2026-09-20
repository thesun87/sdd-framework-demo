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

/**
 * `GET /api/products` — không phân trang ở `000` (contracts/storefront-http.md). Ảnh đại
 * diện là `product_image` có `position` nhỏ nhất (UX §571, data-model.md); subquery tương
 * quan trả `NULL` tự nhiên khi product chưa có ảnh nào — đúng `imagePath: null` mà
 * Requirement #5 đòi hỏi, không phải chuỗi rỗng. Dùng subquery (không `JOIN`) để một product
 * không có nhiều ảnh chỉ sinh đúng một dòng kết quả.
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
