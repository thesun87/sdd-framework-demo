// apps/api/src/modules/stock/stock-ledger-matches-quantity.int-spec.ts
//
// Bất biến: mỗi lần `withdrawStock` áp dụng thành công sinh ĐÚNG MỘT dòng `stock_ledger`,
// và `quantity_after` của dòng đó KHỚP `stock.quantity` ngay sau thao tác — trong CÙNG một
// đơn vị công việc (không đọc lại sau khi commit riêng rẽ, tránh lệch do một transaction
// khác xen vào giữa hai lần đọc).
//
// ĐỎ ở task này vì `./stock.service` (T009 sở hữu) CHƯA TỒN TẠI.

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

describe('stock: stock_ledger khớp stock.quantity sau mỗi lần ghi', () => {
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

  it('một lần rút thành công → đúng một dòng stock_ledger, quantity_after khớp stock.quantity', async () => {
    const productId = await seedProduct(pool);
    await seedStock(pool, productId, 10);

    const result = await withUnitOfWork(pool, (unitOfWork) =>
      withdrawStock(unitOfWork, { productId, quantity: 4, reason: 'order_placed' }),
    );
    if (!result.applied) {
      throw new Error('Thiết lập test sai: kỳ vọng applied:true (tồn kho đủ 10, rút 4)');
    }

    const ledgerRows = await pool.query<{ id: number; delta: number; quantity_after: number }>(
      'SELECT id, delta, quantity_after FROM stock_ledger WHERE product_id = $1',
      [productId],
    );
    // ĐÚNG MỘT dòng sổ cái cho một lần ghi thành công — không nhiều hơn, không ít hơn.
    expect(ledgerRows.rows).toHaveLength(1);
    expect(ledgerRows.rows[0].id).toBe(result.ledgerId);
    expect(ledgerRows.rows[0].delta).toBe(-4);
    expect(ledgerRows.rows[0].quantity_after).toBe(result.quantityAfter);

    const stockRow = await pool.query<{ quantity: number }>(
      'SELECT quantity FROM stock WHERE product_id = $1',
      [productId],
    );
    // `quantity_after` của sổ cái KHỚP `stock.quantity` thật ngay sau thao tác.
    expect(stockRow.rows[0].quantity).toBe(ledgerRows.rows[0].quantity_after);
  });

  it('N lần rút liên tiếp → N dòng sổ cái, dòng mới nhất luôn khớp tồn kho hiện tại', async () => {
    const productId = await seedProduct(pool);
    await seedStock(pool, productId, 10);

    const first = await withUnitOfWork(pool, (unitOfWork) =>
      withdrawStock(unitOfWork, { productId, quantity: 3, reason: 'order_placed' }),
    );
    const second = await withUnitOfWork(pool, (unitOfWork) =>
      withdrawStock(unitOfWork, { productId, quantity: 2, reason: 'order_placed' }),
    );
    if (!first.applied || !second.applied) {
      throw new Error('Thiết lập test sai: kỳ vọng cả hai lần applied:true (10 đủ cho 3 rồi 2)');
    }

    const count = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM stock_ledger WHERE product_id = $1',
      [productId],
    );
    expect(count.rows[0].n).toBe(2);

    const latest = await pool.query<{ quantity_after: number }>(
      'SELECT quantity_after FROM stock_ledger WHERE id = $1',
      [second.ledgerId],
    );
    expect(latest.rows[0].quantity_after).toBe(5); // 10 - 3 - 2

    const stockRow = await pool.query<{ quantity: number }>(
      'SELECT quantity FROM stock WHERE product_id = $1',
      [productId],
    );
    expect(stockRow.rows[0].quantity).toBe(5);
  });
});
