// apps/api/src/modules/catalog/catalog-categories.int-spec.ts
//
// Contract test cho `GET /api/categories` (T011, US1 — FR-001, FR-005, FR-020).
// Nguồn: contracts/storefront-http.md §GET /api/categories, data-model.md §CategorySummary.

import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';
import { storefront } from 'shared';

import {
  assertDatabaseReachable,
  createTestPool,
  truncateAllTables,
} from '../stock/stock-test-support';
import { assertNoForbiddenQuantityKey } from './catalog-response-assertions';
import {
  createTestApp,
  seedCatalogProduct,
  seedCatalogStock,
  seedCategory,
} from './catalog-test-support';

describe('GET /api/categories', () => {
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

  it('khách truy cập công khai không bị redirect login và nhận đúng CategoriesListResponseSchema', async () => {
    const catId = await seedCategory(pool, { name: 'Đồ gia dụng' });
    const pId = await seedCatalogProduct(pool, { name: 'Nồi chiên', categoryId: catId });
    await seedCatalogStock(pool, pId, 10);

    const res = await request(app.getHttpServer()).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');

    const parsed = storefront.CategoriesListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(1);
      expect(parsed.data.items[0]).toEqual({
        id: catId,
        name: 'Đồ gia dụng',
        productCount: 1,
      });
    }

    assertNoForbiddenQuantityKey(res.body);
  });

  it('productCount tính đúng sản phẩm trong danh mục, kể cả sản phẩm hết hàng (FR-005)', async () => {
    const catId = await seedCategory(pool, { name: 'Đồ uống' });
    // Sản phẩm còn hàng
    const p1 = await seedCatalogProduct(pool, { name: 'Trà đào', categoryId: catId });
    await seedCatalogStock(pool, p1, 15);
    // Sản phẩm hết hàng (quantity = 0)
    const p2 = await seedCatalogProduct(pool, { name: 'Trà sen', categoryId: catId });
    await seedCatalogStock(pool, p2, 0);

    const res = await request(app.getHttpServer()).get('/api/categories');

    expect(res.status).toBe(200);
    const parsed = storefront.CategoriesListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const cat = parsed.data.items.find((c) => c.id === catId);
      expect(cat).toBeDefined();
      expect(cat!.productCount).toBe(2);
    }
  });

  it('danh mục rỗng trả về productCount = 0 (FR-005)', async () => {
    const catId = await seedCategory(pool, { name: 'Thời trang' });

    const res = await request(app.getHttpServer()).get('/api/categories');

    expect(res.status).toBe(200);
    const parsed = storefront.CategoriesListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const cat = parsed.data.items.find((c) => c.id === catId);
      expect(cat).toBeDefined();
      expect(cat!.productCount).toBe(0);
    }
  });

  it('không có danh mục giả «Tất cả sản phẩm» được persist trong API response (data-model.md §Category)', async () => {
    await seedCategory(pool, { name: 'Đồ chơi' });

    const res = await request(app.getHttpServer()).get('/api/categories');

    expect(res.status).toBe(200);
    const parsed = storefront.CategoriesListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const names = parsed.data.items.map((c) => c.name.toLowerCase());
      expect(names).not.toContain('tất cả sản phẩm');
    }
  });
});
