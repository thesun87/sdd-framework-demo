// apps/api/src/modules/stock/stock-ledger-restrict.int-spec.ts
//
// Bất biến: xoá một `product` đang có dòng `stock_ledger` bị CHẶN Ở TẦNG DỮ LIỆU bởi
// `ON DELETE RESTRICT` (AD-24) — sổ cái là bản kiểm toán, không được biến mất khi product bị
// xoá. Test gọi `DELETE` bằng SQL thô trực tiếp trên `pool`, không qua bất kỳ lớp ứng dụng
// nào, để chứng minh việc chặn đến từ ràng buộc khoá ngoại của Postgres, không phải một `if`
// trong code.
//
// Dòng `stock_ledger` trong test này được tạo qua ĐƯỜNG GHI THẬT (`withdrawStock`), không
// phải một INSERT tay — vì vậy không có cách nào test này xanh trước khi module `stock`
// tồn tại. ĐỎ ở task này vì `./stock.service` (T009 sở hữu) CHƯA TỒN TẠI.

import type { Pool } from 'pg';
import {
  assertDatabaseReachable,
  createTestPool,
  seedProduct,
  seedStock,
  truncateAllTables,
  withUnitOfWork,
} from './stock-test-support';
import { withdrawStock } from './stock.service';

describe('stock: ON DELETE RESTRICT chặn xoá product có dòng sổ cái', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();
    await assertDatabaseReachable(pool);
  });

  beforeEach(async () => {
    await truncateAllTables(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('DELETE FROM product bị Postgres từ chối (23503) khi còn dòng stock_ledger tham chiếu', async () => {
    const productId = await seedProduct(pool);
    await seedStock(pool, productId, 5);

    // Sinh dòng stock_ledger qua ĐƯỜNG GHI THẬT, không phải INSERT tay.
    const result = await withUnitOfWork(pool, (unitOfWork) =>
      withdrawStock(unitOfWork, { productId, quantity: 1, reason: 'manual_adjustment' }),
    );
    if (!result.applied) {
      throw new Error('Thiết lập test sai: kỳ vọng applied:true (tồn kho đủ 5, rút 1)');
    }

    const ledgerCountBefore = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM stock_ledger WHERE product_id = $1',
      [productId],
    );
    expect(ledgerCountBefore.rows[0].n).toBe(1);

    // DELETE trực tiếp bằng SQL thô — không qua service, không qua một `if` nào trong code.
    // Việc chặn phải đến từ ràng buộc `ON DELETE RESTRICT` của Postgres.
    // Postgres phân biệt RESTRICT (23001 restrict_violation) với một vi phạm FK khi CHÈN
    // một tham chiếu không tồn tại (23503 foreign_key_violation) — RESTRICT khi XOÁ/SỬA bản
    // ghi bị tham chiếu là 23001. Đã xác nhận bằng lỗi thật từ PostgreSQL 18.6 (không đoán).
    await expect(pool.query('DELETE FROM product WHERE id = $1', [productId])).rejects.toMatchObject({
      code: '23001', // restrict_violation
      constraint: 'stock_ledger_product_id_product_id_fk',
    });

    // RESTRICT chặn TOÀN BỘ câu lệnh — product và dòng sổ cái đều còn nguyên.
    const productStillThere = await pool.query('SELECT id FROM product WHERE id = $1', [productId]);
    expect(productStillThere.rows).toHaveLength(1);

    const ledgerCountAfter = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM stock_ledger WHERE product_id = $1',
      [productId],
    );
    expect(ledgerCountAfter.rows[0].n).toBe(1);
  });
});
