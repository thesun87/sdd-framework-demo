// apps/api/src/modules/stock/stock-test-support.ts
//
// Hạ tầng DÙNG CHUNG cho bốn test bất biến tồn kho (T008) — KHÔNG chứa logic nghiệp vụ
// của module `stock` (không phải file `.service.ts`, T009 không đụng tới file này), chỉ kết
// nối PostgreSQL thật, dọn dữ liệu, và fixture tối thiểu để mỗi test tự tạo dữ liệu nó cần
// (AD-28 — test không được phụ thuộc `db:seed` hay thứ tự chạy).
//
// Đặt CÙNG THƯ MỤC với các file `*.int-spec.ts`/`*.race-spec.ts` (thay vì `apps/api/test/`)
// để tránh lỗi TypeScript TS6059 ("File is not under 'rootDir'"): `apps/api/tsconfig.json`
// đặt `rootDir: "./src"`, và việc import một file NGOÀI `src/` từ một file TRONG `src/` làm
// vỡ ràng buộc đó khi chạy `tsc` toàn chương trình (`npm run lint` / `npm run build`) — dù
// Jest (ts-jest, biên dịch từng file) không bị ảnh hưởng. `apps/api/tsconfig.json` nằm
// ngoài phạm vi được phép sửa của T008, nên fix đúng là giữ mọi thứ mà `src/**/*.ts` import
// bên trong `src/`.
//
// LUẬT CÔ LẬP (AD-28) — file này PHẢI tuân thủ, không thương lượng:
//   - Dọn dẹp bằng TRUNCATE. KHÔNG BAO GIỜ transaction rollback để cô lập test.
//   - Không tạo bảng bằng CREATE TABLE — lược đồ do đúng `npm run db:migrate` của T004 dựng.
//   - Không pg-mem, không SQLite, không repository giả. Nối PostgreSQL thật qua DATABASE_URL.
//   - Không bao giờ chạy nhiều promise trên MỘT client `pg` — `withUnitOfWork` dưới đây luôn
//     mở một `client` RIÊNG cho mỗi lời gọi (qua `pool.connect()`), never share một client
//     giữa các thao tác chạy song song.

import { Pool, type PoolClient } from 'pg';

/** Cùng hình dạng với `StockUnitOfWork` của stock.contract.ts — lặp lại ở đây để file này
 *  không phụ thuộc ngược vào module `stock` (test hạ tầng không nên import từ thứ nó phục
 *  vụ kiểm chứng). */
export type StockUnitOfWork = Pick<PoolClient, 'query'>;

const COMPOSE_HINT =
  'docker compose -f ops/compose.yaml up -d postgres  (rồi "npm run db:migrate" nếu lược đồ chưa dựng)';

/**
 * Đọc `DATABASE_URL` bắt buộc — KHÔNG có giá trị mặc định ngầm định trong code. Bốn tên
 * biến triển khai đã chốt ở `ops/.env.example` (Ruling R4); test không được tự đoán một
 * chuỗi kết nối khác.
 */
function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL chưa được đặt. Test bất biến tồn kho cần PostgreSQL THẬT (AD-27) — ' +
        `đặt biến này (xem ops/.env.example) rồi chạy: ${COMPOSE_HINT}`,
    );
  }
  return url;
}

/**
 * Một `Pool` cho cả file test. `maxConnections` phải đủ lớn cho N kết nối độc lập của
 * race-spec (mỗi phần tử tranh chấp = một `pool.connect()` riêng, không phải N promise trên
 * một client).
 */
export function createTestPool(maxConnections = 40): Pool {
  return new Pool({ connectionString: requireDatabaseUrl(), max: maxConnections });
}

/**
 * Xác nhận PostgreSQL THẬT SỰ nối được TRƯỚC khi chạy bất kỳ assertion nào. Nếu không nối
 * được, NÉM lỗi rõ ràng trỏ tới lệnh cần chạy — KHÔNG BAO GIỜ tự skip. Gọi trong `beforeAll`
 * của mỗi spec file khiến toàn bộ file đó thất bại rõ ràng (không xanh giả, không skip câm)
 * khi thiếu database.
 */
export async function assertDatabaseReachable(pool: Pool): Promise<void> {
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (cause) {
    throw new Error(
      `Không nối được PostgreSQL qua DATABASE_URL="${process.env.DATABASE_URL ?? '(chưa đặt)'}". ` +
        `Chạy: ${COMPOSE_HINT}`,
      { cause: cause as Error },
    );
  }
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

/**
 * Dọn dữ liệu bằng TRUNCATE ... RESTART IDENTITY CASCADE — KHÔNG BAO GIỜ transaction
 * rollback (AD-28: rollback gộp nhiều connection độc lập vào một transaction, tranh chấp
 * biến mất, test xanh vô nghĩa). Liệt kê đủ năm bảng cho tường minh, dù CASCADE đã kéo theo.
 */
export async function truncateAllTables(pool: Pool): Promise<void> {
  await pool.query(
    'TRUNCATE TABLE stock_ledger, stock, product_image, product, category RESTART IDENTITY CASCADE',
  );
}

/**
 * Mở một transaction THẬT trên MỘT client (`pool.connect()` → `BEGIN`), chạy `fn(client)`
 * coi `client` là "đơn vị công việc", rồi `COMMIT` (hoặc `ROLLBACK` nếu `fn` ném lỗi), và
 * luôn `release()` client. Đây chính là vai "đường vào" theo AD-23: nó mở đơn vị công việc
 * và truyền vào hàm nhận tham số — hàm đó không bao giờ được tự ý `BEGIN`/`COMMIT` trên
 * client này.
 *
 * Mỗi lời gọi `withUnitOfWork` dùng một client TCP riêng lấy từ `pool` — gọi N lần trong
 * `Promise.all`/`Promise.allSettled` cho ra N kết nối độc lập thật sự (race-spec), không
 * phải N câu lệnh tuần tự trên một client.
 */
export async function withUnitOfWork<T>(
  pool: Pool,
  fn: (unitOfWork: StockUnitOfWork) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface SeedProductInput {
  readonly name?: string;
}

/**
 * Tạo một `product` tối thiểu — test tự tạo dữ liệu nó cần (AD-28), không phụ thuộc
 * `db:seed`. Đây là DỮ LIỆU MỒI (fixture) của module `catalog`, không phải đường ghi đang
 * được kiểm chứng — ghi trực tiếp bằng SQL là hợp lệ ở đây.
 */
export async function seedProduct(pool: Pool, input: SeedProductInput = {}): Promise<number> {
  const name = input.name ?? `Sản phẩm test ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await pool.query<{ id: number }>(
    `INSERT INTO product (name, name_normalized, description, price)
     VALUES ($1, $1, '', 0)
     RETURNING id`,
    [name],
  );
  return result.rows[0].id;
}

/**
 * Tạo dòng `stock` ban đầu cho một product — DỮ LIỆU MỒI, ghi trực tiếp bằng SQL. Đường ghi
 * đang được bốn test T008 kiểm chứng là `withdrawStock` (RÚT), không phải việc khởi tạo tồn
 * kho ban đầu — data-model.md không định nghĩa một đường ghi nào khác cho `000`.
 */
export async function seedStock(pool: Pool, productId: number, quantity: number): Promise<void> {
  await pool.query(`INSERT INTO stock (product_id, quantity, updated_at) VALUES ($1, $2, now())`, [
    productId,
    quantity,
  ]);
}
