// apps/api/src/modules/catalog/catalog-products-pagination.int-spec.ts
//
// Integration test cho phân trang danh sách sản phẩm (T029, US3).
// Nguồn: contracts/storefront-http.md §GET /api/products, data-model.md §Pagination, spec.md FR-013..FR-016.
import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';
import { storefront } from 'shared';

import {
  assertDatabaseReachable,
  createTestPool,
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
} from './catalog-test-support';

describe('GET /api/products pagination (US3)', () => {
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

  it('mặc định trả trang 1 với pageSize = 24 và không trả toàn bộ danh mục khi số sản phẩm > 24 (FR-013)', async () => {
    // Tạo 30 sản phẩm
    for (let i = 1; i <= 30; i++) {
      const pid = await seedCatalogProduct(pool, { name: `Sản phẩm ${i.toString().padStart(2, '0')}` });
      await seedCatalogStock(pool, pid, 5);
    }

    const res = await request(app.getHttpServer()).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');

    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pagination).toBeDefined();
      expect(parsed.data.pagination?.page).toBe(1);
      expect(parsed.data.pagination?.pageSize).toBe(24);
      expect(parsed.data.pagination?.totalItems).toBe(30);
      expect(parsed.data.pagination?.totalPages).toBe(2);
      expect(parsed.data.items.length).toBe(24);
    }
  });

  it('clamp pageSize trên 100 thành 100, không ném lỗi (FR-013, contracts/storefront-http.md)', async () => {
    const res = await request(app.getHttpServer()).get('/api/products?pageSize=150');
    expect(res.status).toBe(200);

    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pagination?.pageSize).toBe(100);
    }
  });

  it('giá trị page < 1 được xử lý như page = 1 (contracts/storefront-http.md)', async () => {
    const res = await request(app.getHttpServer()).get('/api/products?page=0');
    expect(res.status).toBe(200);

    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pagination?.page).toBe(1);
    }

    const resNegative = await request(app.getHttpServer()).get('/api/products?page=-5');
    expect(resNegative.status).toBe(200);
    const parsedNeg = storefront.ProductsListResponseSchema.safeParse(resNegative.body);
    expect(parsedNeg.success).toBe(true);
    if (parsedNeg.success) {
      expect(parsedNeg.data.pagination?.page).toBe(1);
    }
  });

  it('phân trang theo thứ tự tăng dần tất định theo id sản phẩm (FR-014)', async () => {
    const ids: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const pid = await seedCatalogProduct(pool, { name: `Món hàng ${i}` });
      await seedCatalogStock(pool, pid, 2);
      ids.push(pid);
    }

    // Trang 1, pageSize 5
    const resPage1 = await request(app.getHttpServer()).get('/api/products?page=1&pageSize=5');
    expect(resPage1.status).toBe(200);
    const parsed1 = storefront.ProductsListResponseSchema.safeParse(resPage1.body);
    expect(parsed1.success).toBe(true);

    // Trang 2, pageSize 5
    const resPage2 = await request(app.getHttpServer()).get('/api/products?page=2&pageSize=5');
    expect(resPage2.status).toBe(200);
    const parsed2 = storefront.ProductsListResponseSchema.safeParse(resPage2.body);
    expect(parsed2.success).toBe(true);

    if (parsed1.success && parsed2.success) {
      const p1Ids = parsed1.data.items.map((i) => i.id);
      const p2Ids = parsed2.data.items.map((i) => i.id);

      expect(p1Ids.length).toBe(5);
      expect(p2Ids.length).toBe(5);
      // Kiểm tra tính tất định và không trùng lặp giữa các trang
      expect(p1Ids).toEqual(ids.slice(0, 5));
      expect(p2Ids).toEqual(ids.slice(5, 10));
      for (const id of p1Ids) {
        expect(p2Ids).not.toContain(id);
      }
    }
  });

  it('yêu cầu trang vượt quá totalPages trả về items: [] nhưng vẫn là 200 và giữ nguyên pagination metadata (FR-015)', async () => {
    for (let i = 1; i <= 5; i++) {
      const pid = await seedCatalogProduct(pool, { name: `Sản phẩm ${i}` });
      await seedCatalogStock(pool, pid, 1);
    }

    const res = await request(app.getHttpServer()).get('/api/products?page=999&pageSize=10');
    expect(res.status).toBe(200);

    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toEqual([]);
      expect(parsed.data.pagination?.page).toBe(999);
      expect(parsed.data.pagination?.pageSize).toBe(10);
      expect(parsed.data.pagination?.totalItems).toBe(5);
      expect(parsed.data.pagination?.totalPages).toBe(1);
    }
  });

  it('danh mục không có sản phẩm trả về items: [], totalItems: 0, totalPages: 0 (FR-015)', async () => {
    const res = await request(app.getHttpServer()).get('/api/products');
    expect(res.status).toBe(200);

    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toEqual([]);
      expect(parsed.data.pagination?.totalItems).toBe(0);
      expect(parsed.data.pagination?.totalPages).toBe(0);
    }
  });

  it('KHÔNG bao giờ để lộ con số tồn kho trong các trang đã phân trang (SC-005)', async () => {
    const pid = await seedCatalogProduct(pool, { name: 'Sản phẩm test tồn kho' });
    const quantity = pickDistinctiveQuantity(pid);
    await seedCatalogStock(pool, pid, quantity);

    const res = await request(app.getHttpServer()).get('/api/products?page=1&pageSize=10');
    assertNoForbiddenQuantityKey(res.body);
    assertRawBodyNeverContainsQuantity(res.text, quantity);
  });
});
