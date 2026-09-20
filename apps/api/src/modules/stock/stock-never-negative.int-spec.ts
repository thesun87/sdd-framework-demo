// apps/api/src/modules/stock/stock-never-negative.int-spec.ts
//
// Bất biến trung tâm của sản phẩm: `stock.quantity` không bao giờ âm.
//   1. Đường ghi hợp lệ (`withdrawStock`) không bao giờ cần chạm tới hàng rào CHECK — nó tự
//      từ chối rút quá tồn kho bằng một GIÁ TRỊ (`applied: false`), không phải exception.
//   2. `CHECK (quantity >= 0)` ở database LÀ hàng rào cuối (data-model.md) — test chứng
//      minh nó CHẶN THẬT bằng cách cố tình vi phạm nó bằng một UPDATE vô điều kiện, bỏ qua
//      toàn bộ logic ứng dụng.

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

describe('stock: quantity không bao giờ âm', () => {
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

  it('withdrawStock từ chối rút quá tồn kho bằng applied:false — KHÔNG ném exception', async () => {
    const productId = await seedProduct(pool);
    await seedStock(pool, productId, 3);

    const exact = await withUnitOfWork(pool, (unitOfWork) =>
      withdrawStock(unitOfWork, { productId, quantity: 3, reason: 'order_placed' }),
    );
    expect(exact).toEqual({ applied: true, quantityAfter: 0, ledgerId: expect.any(Number) });

    // Tồn kho đã về 0 — lần rút tiếp theo PHẢI trả applied:false, không ném lỗi.
    const overdraw = await withUnitOfWork(pool, (unitOfWork) =>
      withdrawStock(unitOfWork, { productId, quantity: 1, reason: 'order_placed' }),
    );
    expect(overdraw).toEqual({ applied: false });

    const row = await pool.query<{ quantity: number }>(
      'SELECT quantity FROM stock WHERE product_id = $1',
      [productId],
    );
    expect(row.rows[0].quantity).toBe(0);
  });

  it('CHECK (quantity >= 0) của database chặn THẬT một UPDATE vô điều kiện bỏ qua ứng dụng', async () => {
    const productId = await seedProduct(pool);
    await seedStock(pool, productId, 2);

    // Cố tình bỏ qua toàn bộ `stock` module — UPDATE vô điều kiện đưa quantity xuống -3.
    // Ràng buộc CHECK ở database phải là thứ chặn việc này, không phải bất kỳ logic nào
    // trong ứng dụng (ứng dụng thậm chí không tham gia câu lệnh này).
    await expect(
      pool.query('UPDATE stock SET quantity = quantity - 5 WHERE product_id = $1', [productId]),
    ).rejects.toMatchObject({
      code: '23514', // check_violation (mã lỗi Postgres)
      constraint: 'stock_quantity_non_negative',
    });

    // UPDATE bị Postgres từ chối TOÀN BỘ câu lệnh — giá trị cũ còn nguyên, không phải một
    // giá trị âm "gần đúng" nào lọt qua.
    const row = await pool.query<{ quantity: number }>(
      'SELECT quantity FROM stock WHERE product_id = $1',
      [productId],
    );
    expect(row.rows[0].quantity).toBe(2);
  });
});
