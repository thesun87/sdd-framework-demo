// apps/api/src/modules/catalog/catalog-product-detail.int-spec.ts
//
// Contract test cho `GET /api/products/:id` (T010 — sở hữu FR-006, FR-007, SC-005; khẳng
// định HÌNH DẠNG lỗi 404 của hợp đồng, không sở hữu nội dung FR-004 — đó là T011).
// Nguồn: contracts/storefront-http.md §GET /api/products/:id.
//
// Database THẬT (AD-27), tái sử dụng hạ tầng T008 (`../stock/stock-test-support.ts`).
import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';
import { common, storefront } from 'shared';

import {
  assertDatabaseReachable,
  createTestPool,
  seedProduct,
  seedStock,
  truncateAllTables,
} from '../stock/stock-test-support';
import {
  assertNoForbiddenQuantityKey,
  assertRawBodyNeverContainsQuantity,
  pickDistinctiveQuantity,
} from './catalog-response-assertions';
import {
  createTestApp,
  seedCatalogProduct,
  seedCatalogStock,
  seedCategory,
} from './catalog-test-support';

/** Id chắc chắn không tồn tại — `TRUNCATE ... RESTART IDENTITY` mỗi test khiến id luôn bắt
 *  đầu lại từ nhỏ, nên một số đủ lớn không bao giờ trùng một Product vừa seed trong test. */
const NON_EXISTENT_PRODUCT_ID = 999_999_999;

describe('GET /api/products/:id', () => {
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

  it('trả đúng hình dạng ProductDetailSchema của packages/shared (AD-10) và Cache-Control: no-store', async () => {
    const productId = await seedProduct(pool, { name: 'Sản phẩm chi tiết' });
    await seedStock(pool, productId, 2);

    const res = await request(app.getHttpServer()).get(`/api/products/${productId}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');

    const parsed = storefront.ProductDetailSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });

  it('KHÔNG bao giờ để lộ con số tồn kho ở bất cứ đâu trong thân response (SC-005, đọc toàn bộ thân thô)', async () => {
    const productId = await seedProduct(pool, { name: 'Chi tiết lộ tồn kho?' });
    const quantity = pickDistinctiveQuantity(productId);
    await seedStock(pool, productId, quantity);

    const res = await request(app.getHttpServer()).get(`/api/products/${productId}`);

    assertNoForbiddenQuantityKey(res.body);
    assertRawBodyNeverContainsQuantity(res.text, quantity);
  });

  it('stockStatus KHÔNG được cache ở bất kỳ tầng nào — đổi quantity trực tiếp trong DB rồi gọi lại ngay qua HTTP THẬT phải phản ánh giá trị mới (AD-20)', async () => {
    const productId = await seedProduct(pool, { name: 'Chi tiết đổi tồn kho' });
    await seedStock(pool, productId, 5);

    // Lần gọi HTTP THẬT thứ NHẤT.
    const first = await request(app.getHttpServer()).get(`/api/products/${productId}`);
    expect(first.headers['cache-control']).toBe('no-store');
    const firstParsed = storefront.ProductDetailSchema.safeParse(first.body);
    expect(firstParsed.success).toBe(true);
    expect(firstParsed.success && firstParsed.data.stockStatus).toBe('in_stock');

    // Đổi trực tiếp trong database, qua pool riêng của test (không qua app).
    await pool.query('UPDATE stock SET quantity = 0 WHERE product_id = $1', [productId]);

    // Lần gọi HTTP THẬT thứ HAI, NGAY LẬP TỨC.
    const second = await request(app.getHttpServer()).get(`/api/products/${productId}`);
    expect(second.headers['cache-control']).toBe('no-store');
    const secondParsed = storefront.ProductDetailSchema.safeParse(second.body);
    expect(secondParsed.success).toBe(true);
    expect(secondParsed.success && secondParsed.data.stockStatus).toBe('out_of_stock');
  });

  it('404 cho Sản phẩm không tồn tại — dùng envelope lỗi dùng chung của packages/shared, không stack trace', async () => {
    const res = await request(app.getHttpServer()).get(`/api/products/${NON_EXISTENT_PRODUCT_ID}`);

    expect(res.status).toBe(404);

    // Hình dạng lỗi — CHÍNH schema `common.ErrorEnvelopeSchema` của packages/shared, không
    // khai lại. Chỉ khẳng định HÌNH DẠNG hợp đồng ở đây; nội dung `code`/`message` cụ thể là
    // của FR-004, T011 sở hữu.
    const parsed = common.ErrorEnvelopeSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);

    // Không stack trace/đường dẫn nội bộ lọt ra client — đọc thân response THÔ, không chỉ
    // trường đã biết.
    expect(res.text).not.toMatch(/\bat \S+\(.*:\d+:\d+\)/); // dòng stack frame kiểu Node/V8
    expect(res.text).not.toMatch(/node_modules/i);
    expect(res.text).not.toMatch(/\.ts:\d+/);
    expect(res.text).not.toMatch(/\.js:\d+/);
  });

  it('mở chi tiết sản phẩm thuộc danh mục và có ảnh sản phẩm — hợp đồng đầy đủ (FR-017, FR-018, US4)', async () => {
    const cat = await seedCategory(pool, { name: 'Gia dụng' });
    const pid = await seedCatalogProduct(pool, {
      name: 'Bình giữ nhiệt Lock&Lock 500ml',
      description: 'Giữ nóng 8h, giữ lạnh 12h',
      price: 250000,
      categoryId: cat,
    });
    await seedCatalogStock(pool, pid, 10);

    const res = await request(app.getHttpServer()).get(`/api/products/${pid}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');

    const parsed = storefront.ProductDetailSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe(pid);
      expect(parsed.data.name).toBe('Bình giữ nhiệt Lock&Lock 500ml');
      expect(parsed.data.description).toBe('Giữ nóng 8h, giữ lạnh 12h');
      expect(parsed.data.price).toBe(250000);
      expect(Number.isInteger(parsed.data.price)).toBe(true);
      expect(parsed.data.stockStatus).toBe('in_stock');
    }
    assertNoForbiddenQuantityKey(res.body);
  });
});
