// apps/api/src/modules/stock/stock.repository.ts
//
// Lớp truy cập dữ liệu THÔ cho hai bảng `stock`/`stock_ledger` — KHÔNG chứa quyết định
// nghiệp vụ (đó là việc của `stock.service.ts`), chỉ hai câu lệnh SQL tham số hoá đúng như
// hợp đồng ở `stock.contract.ts` mô tả. Không export ra ngoài module (AD-5) — chỉ
// `stock.service.ts` và `stock.public.ts` (cùng thư mục) được import file này.
//
// Không "khai lại bảng": tên bảng/cột dưới đây phải khớp NGUYÊN VĂN với `db/schema/stock.ts`
// (T004) — `stock(product_id, quantity, updated_at)`,
// `stock_ledger(id, product_id, delta, quantity_after, reason, order_id, actor_account_id)`.
// Dùng SQL tham số hoá trực tiếp qua `unitOfWork.query` (không qua Drizzle query builder):
// `StockUnitOfWork` (stock.contract.ts) cố tình chỉ phơi `query` — driver `drizzle-orm`
// yêu cầu một `Pool | PoolClient | Client` ĐẦY ĐỦ (xem `node_modules/drizzle-orm/node-postgres/session.d.ts`,
// `NodePgClient`), không nhận một object chỉ có `query`, nên không thể (và không nên) bọc
// `unitOfWork` bằng `drizzle()` ở đây — sẽ vỡ kiểu ngay tại chữ ký AD-23 mà `stock.contract.ts`
// cố ý khoá.

import { types as pgTypes } from 'pg';

import type { StockLedgerReason, StockUnitOfWork } from './stock.contract';

// Driver `pg` trả cột `bigint` (OID 20/int8, ví dụ `stock_ledger.id`) dạng CHUỖI theo mặc
// định — tránh mất độ chính xác cho giá trị vượt ngưỡng an toàn của JS `number`. T004 (§2,
// task-004-report.md) đã chọn `mode: 'number'` cho MỌI cột `bigint` trong lược đồ Drizzle
// (chấp nhận đánh đổi đó ở quy mô walking skeleton này) — đăng ký lại đúng giả định đó ở tầng
// driver `pg` để: (1) `WithdrawStockResult.ledgerId` khớp kiểu `number` của hợp đồng, và (2)
// mọi truy vấn thô khác trong CÙNG tiến trình Node (kể cả `pool.query` của test, dùng chung
// bản `pg` này) đọc bigint ra `number` nhất quán — không lệch kiểu giữa "đọc qua service" và
// "đọc thẳng bằng SQL" như bốn test T008 làm để đối chiếu. `pg.types` là registry TOÀN CỤC
// của tiến trình, side-effect này an toàn để chạy nhiều lần (ghi đè cùng một hàm).
pgTypes.setTypeParser(20, (value: string) => Number(value));

/** Kết quả của UPDATE có điều kiện — `null` khi 0 dòng bị ảnh hưởng (hết hàng / thua tranh
 *  chấp), giá trị hợp lệ theo AD-1, không phải lỗi. */
export interface ConditionalWithdrawal {
  readonly quantityAfter: number;
}

/**
 * Đường ghi RÚT tồn kho — MỘT câu `UPDATE` có điều kiện trên giá trị đang có (AD-1), không
 * đọc-rồi-ghi: điều kiện `quantity >= $1` nằm ngay trong `WHERE`, và `RETURNING quantity` lấy
 * giá trị mới trong CÙNG câu lệnh thay vì `SELECT` lại sau đó.
 */
export async function applyConditionalWithdrawal(
  unitOfWork: StockUnitOfWork,
  productId: number,
  quantity: number,
): Promise<ConditionalWithdrawal | null> {
  const result = await unitOfWork.query<{ quantity: number }>(
    `UPDATE stock
        SET quantity = quantity - $1, updated_at = now()
      WHERE product_id = $2 AND quantity >= $1
      RETURNING quantity`,
    [quantity, productId],
  );

  if (!result.rowCount) {
    // 0 dòng bị ảnh hưởng — GIÁ TRỊ hợp lệ (AD-1), không phải exception.
    return null;
  }

  return { quantityAfter: result.rows[0].quantity };
}

export interface StockLedgerEntryInput {
  readonly productId: number;
  readonly delta: number;
  readonly quantityAfter: number;
  readonly reason: StockLedgerReason;
  readonly orderId: number | null;
  readonly actorAccountId: number | null;
}

/**
 * Ghi ĐÚNG MỘT dòng `stock_ledger` — append-only (AD-4): không bao giờ `UPDATE`/`DELETE` dòng
 * đã ghi ở bất kỳ nơi nào trong module này. `created_at` dùng default `now()` của schema
 * (T004), không set tường minh ở đây.
 */
export async function insertStockLedgerEntry(
  unitOfWork: StockUnitOfWork,
  entry: StockLedgerEntryInput,
): Promise<number> {
  // `id` đã được parser OID 20 đăng ký ở đầu file trả về dạng `number` (xem comment đầu file).
  const result = await unitOfWork.query<{ id: number }>(
    `INSERT INTO stock_ledger (product_id, delta, quantity_after, reason, order_id, actor_account_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [entry.productId, entry.delta, entry.quantityAfter, entry.reason, entry.orderId, entry.actorAccountId],
  );

  return result.rows[0].id;
}

/**
 * Đọc `quantity` hiện tại của một product — dùng cho `stock.public.ts` (đọc để HIỂN THỊ,
 * không phải đường ghi — không vi phạm AD-1: bất biến đó chỉ ràng buộc đường ghi, `SELECT`
 * thuần cho catalog đọc trạng thái là chuyện khác). `undefined` khi product chưa từng được
 * cấp tồn kho ban đầu (chưa có dòng `stock`).
 */
export async function readStockQuantity(
  queryable: StockUnitOfWork,
  productId: number,
): Promise<number | undefined> {
  const result = await queryable.query<{ quantity: number }>(
    'SELECT quantity FROM stock WHERE product_id = $1',
    [productId],
  );
  return result.rows[0]?.quantity;
}
