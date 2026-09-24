import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';
import { storefront } from 'shared';

import {
  assertDatabaseReachable,
  createTestPool,
  seedProduct,
  seedStock,
  truncateAllTables,
} from '../stock/stock-test-support';
import { createTestApp, seedCatalogProduct } from './catalog-test-support';

describe('POST /api/cart-lines/status (T004)', () => {
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

  it('trả về đúng 3 trạng thái từ tồn kho (ok, exceeds_stock, out_of_stock) cộng not_found, theo đúng thứ tự request', async () => {
    const pOk = await seedProduct(pool, { name: 'Món OK' });
    await seedStock(pool, pOk, 10);

    const pExceeds = await seedProduct(pool, { name: 'Món Vượt' });
    await seedStock(pool, pExceeds, 2);

    const pOutOfStock = await seedProduct(pool, { name: 'Món Hết' });
    await seedStock(pool, pOutOfStock, 0);

    const pNotFound = 999999;

    const reqBody = {
      lines: [
        { productId: pNotFound, quantity: 1 },
        { productId: pOk, quantity: 5 },
        { productId: pOutOfStock, quantity: 1 },
        { productId: pExceeds, quantity: 5 },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send(reqBody);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');

    const body = storefront.CartLinesStatusResponseSchema.parse(res.body);
    expect(body.lines).toHaveLength(4);

    expect(body.lines[0]).toEqual({
      productId: pNotFound,
      lineStatus: 'not_found',
      product: null,
    });

    expect(body.lines[1].productId).toBe(pOk);
    expect(body.lines[1].lineStatus).toBe('ok');
    expect(body.lines[1].product?.name).toBe('Món OK');

    expect(body.lines[2].productId).toBe(pOutOfStock);
    expect(body.lines[2].lineStatus).toBe('out_of_stock');
    expect(body.lines[2].product?.name).toBe('Món Hết');

    expect(body.lines[3].productId).toBe(pExceeds);
    expect(body.lines[3].lineStatus).toBe('exceeds_stock');
    expect(body.lines[3].product?.name).toBe('Món Vượt');
  });

  it('giá lấy từ DB kể cả khi request gửi kèm một giá khác (US3-6)', async () => {
    const productId = await seedCatalogProduct(pool, { name: 'Áo', price: 150000 });
    await seedStock(pool, productId, 10);

    const res = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({
        lines: [{ productId, quantity: 2, price: 999 }],
      });

    expect(res.status).toBe(200);
    const body = storefront.CartLinesStatusResponseSchema.parse(res.body);
    expect(body.lines[0].product?.price).toBe(150000);
  });

  it('giá cập nhật trong DB được phản ánh ở lần gọi tiếp theo (US1-6)', async () => {
    const productId = await seedCatalogProduct(pool, { name: 'Áo', price: 100000 });
    await seedStock(pool, productId, 10);

    const res1 = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: [{ productId, quantity: 1 }] });
    expect(res1.body.lines[0].product.price).toBe(100000);

    // Cập nhật giá trong DB
    await pool.query('UPDATE product SET price = 120000 WHERE id = $1', [productId]);

    const res2 = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: [{ productId, quantity: 1 }] });
    expect(res2.body.lines[0].product.price).toBe(120000);
  });

  it('trả về 400 cho các trường hợp không hợp lệ', async () => {
    // 1. Quá 100 lines
    const over100Lines = Array.from({ length: 101 }, (_, i) => ({ productId: i + 1, quantity: 1 }));
    const resOver = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: over100Lines });
    expect(resOver.status).toBe(400);

    // 2. Trùng lặp productId
    const resDup = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({
        lines: [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 2 },
        ],
      });
    expect(resDup.status).toBe(400);

    // 3. Quantity không hợp lệ: 0, -1, 1.5, 10000
    for (const invalidQ of [0, -1, 1.5, 10000]) {
      const resInvalidQ = await request(app.getHttpServer())
        .post('/api/cart-lines/status')
        .send({ lines: [{ productId: 1, quantity: invalidQ }] });
      expect(resInvalidQ.status).toBe(400);
    }

    // 4. Thiếu lines
    const resMissing = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({});
    expect(resMissing.status).toBe(400);

    // 5. Non-JSON body
    const resNonJson = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .set('Content-Type', 'text/plain')
      .send('not a json');
    expect(resNonJson.status).toBe(400);
  });

  it('lines: [] trả về { "lines": [] }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: [] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lines: [] });
  });

  it('Guest không có session cookie vẫn gọi thành công 200', async () => {
    const productId = await seedProduct(pool, { name: 'Món Test' });
    await seedStock(pool, productId, 5);

    const res = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(200);
  });

  it('không có stack trace trong body khi có lỗi', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart-lines/status')
      .send({ lines: [{ productId: -1, quantity: 1 }] });

    expect(res.status).toBe(400);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('stack');
    expect(bodyStr).not.toContain('node_modules');
  });
});
