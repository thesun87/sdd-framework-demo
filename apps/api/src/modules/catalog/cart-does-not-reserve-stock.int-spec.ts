import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';

import {
  assertDatabaseReachable,
  createTestPool,
  seedStock,
  truncateAllTables,
} from '../stock/stock-test-support';
import { createTestApp, seedCatalogProduct } from './catalog-test-support';

describe('cart: không giữ chỗ tồn kho (PRD FR-7, T004)', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();
    await assertDatabaseReachable(pool);
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAllTables(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('gọi endpoint nhiều lần với Q > S, Q = S, Q < S không làm đổi stock.quantity hay thêm dòng stock_ledger', async () => {
    const p1 = await seedCatalogProduct(pool, { name: 'Món 1', price: 10000 });
    await seedStock(pool, p1, 10);

    const p2 = await seedCatalogProduct(pool, { name: 'Món 2', price: 20000 });
    await seedStock(pool, p2, 5);

    const p3 = await seedCatalogProduct(pool, { name: 'Món 3', price: 30000 });
    await seedStock(pool, p3, 0);

    const countLedgerBefore = await pool.query<{ count: string }>('SELECT COUNT(*) FROM stock_ledger');
    const stockRowsBefore = await pool.query<{ product_id: number; quantity: number }>(
      'SELECT product_id, quantity FROM stock ORDER BY product_id',
    );

    // Gọi nhiều lần với các tỷ lệ khác nhau
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/cart-lines/status')
        .send({
          lines: [
            { productId: p1, quantity: 2 }, // Q < S
            { productId: p2, quantity: 5 }, // Q = S
            { productId: p3, quantity: 1 }, // Q > S (S = 0)
            { productId: p1, quantity: 20 }, // Q > S
          ].slice(0, 3), // tránh trùng productId trong 1 request
        });
      expect(res.status).toBe(200);
    }

    const countLedgerAfter = await pool.query<{ count: string }>('SELECT COUNT(*) FROM stock_ledger');
    const stockRowsAfter = await pool.query<{ product_id: number; quantity: number }>(
      'SELECT product_id, quantity FROM stock ORDER BY product_id',
    );

    expect(countLedgerAfter.rows[0].count).toBe(countLedgerBefore.rows[0].count);
    expect(stockRowsAfter.rows).toEqual(stockRowsBefore.rows);
  });

  it('hai lời gọi tuần tự cho sản phẩm có S = 1 và Q = 1 đều trả về ok (không bị xí chỗ, US1-7, US1-8)', async () => {
    const productId = await seedCatalogProduct(pool, { name: 'Món Duy Nhất', price: 50000 });
    await seedStock(pool, productId, 1);

    const res1 = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: [{ productId, quantity: 1 }] });

    expect(res1.status).toBe(200);
    expect(res1.body.lines[0].lineStatus).toBe('ok');

    const res2 = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: [{ productId, quantity: 1 }] });

    expect(res2.status).toBe(200);
    expect(res2.body.lines[0].lineStatus).toBe('ok');
  });
});
