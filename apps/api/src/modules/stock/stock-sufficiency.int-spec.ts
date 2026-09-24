import type { Pool } from 'pg';

import {
  assertDatabaseReachable,
  createTestPool,
  seedProduct,
  seedStock,
  truncateAllTables,
} from './stock-test-support';
import { getStockSufficiency, type StockSufficiency } from './stock.public';

describe('stock: getStockSufficiency (T002)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();
    await assertDatabaseReachable(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAllTables(pool);
  });

  it('phân biệt đúng 3 trạng thái: sufficient, insufficient, out_of_stock và trường hợp chưa có dòng stock', async () => {
    const pSufficient = await seedProduct(pool, { name: 'Đủ hàng' });
    await seedStock(pool, pSufficient, 10);

    const pExact = await seedProduct(pool, { name: 'Vừa đủ hàng' });
    await seedStock(pool, pExact, 5);

    const pInsufficient = await seedProduct(pool, { name: 'Thiếu hàng' });
    await seedStock(pool, pInsufficient, 3);

    const pZero = await seedProduct(pool, { name: 'Hết hàng 0' });
    await seedStock(pool, pZero, 0);

    const pNoStockRow = await seedProduct(pool, { name: 'Chưa có dòng stock' });

    const lines = [
      { productId: pSufficient, quantity: 5 }, // S=10 >= Q=5 -> sufficient
      { productId: pExact, quantity: 5 }, // S=5 >= Q=5 -> sufficient
      { productId: pInsufficient, quantity: 5 }, // 0 < S=3 < Q=5 -> insufficient
      { productId: pZero, quantity: 1 }, // S=0 -> out_of_stock
      { productId: pNoStockRow, quantity: 2 }, // No stock row -> out_of_stock
    ];

    const sufficiencyMap = await getStockSufficiency(pool, lines);

    expect(sufficiencyMap.get(pSufficient)).toBe('sufficient');
    expect(sufficiencyMap.get(pExact)).toBe('sufficient');
    expect(sufficiencyMap.get(pInsufficient)).toBe('insufficient');
    expect(sufficiencyMap.get(pZero)).toBe('out_of_stock');
    expect(sufficiencyMap.get(pNoStockRow)).toBe('out_of_stock');
  });

  it('xử lý 20 sản phẩm chỉ qua một câu truy vấn kiểm tra tồn kho', async () => {
    const lines: Array<{ productId: number; quantity: number }> = [];
    for (let i = 1; i <= 20; i++) {
      const pId = await seedProduct(pool, { name: `SP-${i}` });
      await seedStock(pool, pId, i % 2 === 0 ? 10 : 0);
      lines.push({ productId: pId, quantity: 5 });
    }

    const sufficiencyMap = await getStockSufficiency(pool, lines);
    expect(sufficiencyMap.size).toBe(20);

    for (let i = 0; i < 20; i++) {
      const line = lines[i];
      const expected: StockSufficiency = (i + 1) % 2 === 0 ? 'sufficient' : 'out_of_stock';
      expect(sufficiencyMap.get(line.productId)).toBe(expected);
    }
  });

  it('không làm thay đổi stock.quantity và không thêm dòng nào vào stock_ledger (FR-011)', async () => {
    const p1 = await seedProduct(pool, { name: 'SP 1' });
    await seedStock(pool, p1, 10);
    const p2 = await seedProduct(pool, { name: 'SP 2' });
    await seedStock(pool, p2, 2);

    const countLedgerBefore = await pool.query<{ count: string }>('SELECT COUNT(*) FROM stock_ledger');
    const stockRowsBefore = await pool.query<{ product_id: number; quantity: number }>(
      'SELECT product_id, quantity FROM stock ORDER BY product_id',
    );

    await getStockSufficiency(pool, [
      { productId: p1, quantity: 5 },
      { productId: p2, quantity: 10 },
      { productId: 999999, quantity: 1 },
    ]);

    const countLedgerAfter = await pool.query<{ count: string }>('SELECT COUNT(*) FROM stock_ledger');
    const stockRowsAfter = await pool.query<{ product_id: number; quantity: number }>(
      'SELECT product_id, quantity FROM stock ORDER BY product_id',
    );

    expect(countLedgerAfter.rows[0].count).toBe(countLedgerBefore.rows[0].count);
    expect(stockRowsAfter.rows).toEqual(stockRowsBefore.rows);
  });
});
