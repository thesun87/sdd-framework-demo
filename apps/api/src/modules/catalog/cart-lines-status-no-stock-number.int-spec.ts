import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';

import {
  assertDatabaseReachable,
  createTestPool,
  seedStock,
  truncateAllTables,
} from '../stock/stock-test-support';
import {
  assertNoForbiddenQuantityKey,
  assertRawBodyNeverContainsQuantity,
} from './catalog-response-assertions';
import { createTestApp, seedCatalogProduct } from './catalog-test-support';

describe('cart-lines-status: không lộ số lượng tồn kho (AD-19, T004)', () => {
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

  it('với các sản phẩm có tồn kho 0, 1, 3 và 50, duyệt toàn bộ response và khẳng định không có số tồn kho hoặc khoá tồn kho nào xuất hiện', async () => {
    // Seed các product đệm để ID sản phẩm thử nghiệm lớn hơn 100, không trùng các số 0, 1, 3, 50
    await pool.query('ALTER SEQUENCE product_id_seq RESTART WITH 101');

    const p0 = await seedCatalogProduct(pool, { name: 'Sản phẩm Không', price: 90000 });
    await seedStock(pool, p0, 0);

    const p1 = await seedCatalogProduct(pool, { name: 'Sản phẩm Một', price: 80000 });
    await seedStock(pool, p1, 1);

    const p3 = await seedCatalogProduct(pool, { name: 'Sản phẩm Ba', price: 70000 });
    await seedStock(pool, p3, 3);

    const p50 = await seedCatalogProduct(pool, { name: 'Sản phẩm Năm Mươi', price: 60000 });
    await seedStock(pool, p50, 50);

    // Quantity gửi lên là 2, không trùng các số 0, 1, 3, 50
    const res = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({
        lines: [
          { productId: p0, quantity: 2 },
          { productId: p1, quantity: 2 },
          { productId: p3, quantity: 2 },
          { productId: p50, quantity: 2 },
        ],
      });

    expect(res.status).toBe(200);

    // 1. Quét sâu mọi key trong parsed body xem có key bị cấm (quantity, inventory, etc) không
    assertNoForbiddenQuantityKey(res.body);

    // 2. Quét mọi giá trị và raw text khẳng định các số tồn kho (1, 3, 50) không xuất hiện
    assertRawBodyNeverContainsQuantity(res.text, 1);
    assertRawBodyNeverContainsQuantity(res.text, 3);
    assertRawBodyNeverContainsQuantity(res.text, 50);

    // 3. Duyệt mọi key và value của response object
    function walkValues(obj: unknown) {
      if (Array.isArray(obj)) {
        for (const item of obj) walkValues(item);
      } else if (obj !== null && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          expect(k.toLowerCase()).not.toMatch(/stock.*quantity|available.*quantity/i);
          if (typeof v === 'number') {
            // Giá trị số duy nhất được phép là productId (>= 101) và price (>= 60000)
            expect([0, 1, 3, 50]).not.toContain(v);
          } else {
            walkValues(v);
          }
        }
      }
    }
    walkValues(res.body);
  });
});
