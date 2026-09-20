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
//
// ⚠️  CẢNH BÁO ĐẶT CHỖ SAI TÊN FILE — ĐỌC TRƯỚC KHI ĐỘNG VÀO BẤT KỲ CỘT `bigint` NÀO Ở NƠI
// KHÁC TRONG `apps/api`: dòng `pgTypes.setTypeParser(20, ...)` bên dưới KHÔNG chỉ ảnh hưởng
// hai bảng `stock`/`stock_ledger`. Nó SỬA ĐỔI TOÀN CỤC registry kiểu của chính package `pg`
// (OID 20 = `bigint`/`int8`) — dùng chung cho MỌI `pg.Pool`/`Client`/`PoolClient` trong CÙNG
// TIẾN TRÌNH Node, bất kể module nào tạo ra chúng. Một kỹ sư sau này làm việc trên `identity`
// hay `ordering`, đọc một cột `bigint` bằng `pg` thô và thấy nó ra `number` thay vì `string`
// như tài liệu `pg` mặc định mô tả, sẽ KHÔNG có lý do gì để nghĩ tới việc tìm nguyên nhân
// trong file `stock.repository.ts` này — vì vậy comment này tồn tại như một điểm neo rõ ràng,
// không phải một ghi chú phụ. Nếu gỡ module `stock` ra khỏi tiến trình (ví dụ tách service),
// side-effect này biến mất theo — không dựa vào nó ở module khác mà không tự đăng ký lại.

import { types as pgTypes } from 'pg';

import type { StockLedgerReason, StockUnitOfWork } from './stock.contract';

// Driver `pg` trả cột `bigint` (OID 20/int8, ví dụ `stock_ledger.id`) dạng CHUỖI theo mặc
// định — tránh mất độ chính xác cho giá trị vượt ngưỡng an toàn của JS `number`. T004 (§2,
// task-004-report.md) đã chọn `mode: 'number'` cho MỌI cột `bigint` trong lược đồ Drizzle —
// nhưng đó là một tuỳ chọn GIẢI MÃ Ở TẦNG `drizzle-orm`, chỉ có hiệu lực khi đọc qua chính
// query builder của Drizzle trên một client đã bọc `drizzle(pool)`. Module này KHÔNG dùng
// Drizzle — gọi thẳng `pg.Pool.query()`/`unitOfWork.query()` thô — nên quyết định của T004
// KHÔNG tự động áp dụng cho bất kỳ câu lệnh nào ở file này. Dòng `setTypeParser` dưới đây là
// một QUYẾT ĐỊNH MỚI, ở một TẦNG KHÁC (registry OID của driver thô `pg`, không phải Drizzle) —
// nó MỞ RỘNG tinh thần của T004 (mọi `bigint` trong hệ thống này là `number`, chấp nhận đánh
// đổi đó ở quy mô walking skeleton) sang đúng tầng mà T004 chưa chạm tới, chứ không phải "lặp
// lại nguyên trạng một lựa chọn đã có sẵn". Cần thiết vì hai lý do: (1) `WithdrawStockResult
// .ledgerId` của hợp đồng là `number`; (2) test T008 (`stock-ledger-matches-quantity.int-spec.ts`)
// đối chiếu `ledgerId` đó với giá trị đọc lại bằng `pool.query` THÔ của chính test (`toBe` so
// sánh nghiêm ngặt) — hai phía chỉ khớp kiểu nếu registry OID dùng chung được sửa ở đây, một
// lần, cho toàn tiến trình. `pg.types` là registry TOÀN CỤC của tiến trình (xem cảnh báo ở
// đầu file); side-effect này an toàn để chạy nhiều lần (ghi đè cùng một hàm).
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
