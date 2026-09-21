// apps/api/src/modules/catalog/catalog-products-search.int-spec.ts
//
// Integration test cho tìm kiếm sản phẩm theo tên không phân biệt dấu (T022, US2).
// Nguồn: contracts/storefront-http.md §GET /api/products, spec.md FR-009..FR-012, FR-020, FR-022.
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
  seedCategory,
} from './catalog-test-support';

describe('GET /api/products?q=... (Product-name search)', () => {
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

  it('tìm kiếm theo tên sản phẩm tiếng Việt không phân biệt dấu và không phân biệt hoa thường (FR-009, FR-010)', async () => {
    const p1 = await seedCatalogProduct(pool, { name: 'Bình giữ nhiệt Lock&Lock' });
    await seedCatalogStock(pool, p1, 10);

    const p2 = await seedCatalogProduct(pool, { name: 'Áo sơ mi nam' });
    await seedCatalogStock(pool, p2, 5);

    // 1. Tìm bằng từ không dấu: "binh giu nhiet"
    const resNoAccent = await request(app.getHttpServer()).get(
      '/api/products?q=binh%20giu%20nhiet',
    );
    expect(resNoAccent.status).toBe(200);
    expect(resNoAccent.headers['cache-control']).toBe('no-store');
    const parsed1 = storefront.ProductsListResponseSchema.safeParse(resNoAccent.body);
    expect(parsed1.success).toBe(true);
    if (parsed1.success) {
      const ids = parsed1.data.items.map((i) => i.id);
      expect(ids).toContain(p1);
      expect(ids).not.toContain(p2);
    }

    // 2. Tìm bằng chữ hoa có dấu: "BÌNH GIỮ NHIỆT"
    const resUpper = await request(app.getHttpServer()).get(
      '/api/products?q=' + encodeURIComponent('BÌNH GIỮ NHIỆT'),
    );
    expect(resUpper.status).toBe(200);
    const parsed2 = storefront.ProductsListResponseSchema.safeParse(resUpper.body);
    expect(parsed2.success).toBe(true);
    if (parsed2.success) {
      const ids = parsed2.data.items.map((i) => i.id);
      expect(ids).toContain(p1);
      expect(ids).not.toContain(p2);
    }
  });

  it('CHỈ tìm theo tên sản phẩm, KHÔNG khớp mô tả sản phẩm hay tên danh mục (FR-010)', async () => {
    const cat = await seedCategory(pool, { name: 'Đồ uống' });
    // Sản phẩm A: tên là "Cốc sứ", nhưng mô tả chứa "Cà phê thơm ngon" và thuộc danh mục "Đồ uống"
    const pA = await seedCatalogProduct(pool, {
      name: 'Cốc sứ Bát Tràng',
      description: 'Dùng đựng cà phê và các loại đồ uống nóng',
      categoryId: cat,
    });
    await seedCatalogStock(pool, pA, 10);

    // Sản phẩm B: tên chứa "Cà phê"
    const pB = await seedCatalogProduct(pool, {
      name: 'Cà phê rang xay',
      description: 'Hạt Arabica nguyên chất',
      categoryId: cat,
    });
    await seedCatalogStock(pool, pB, 5);

    // 1. Tìm "cà phê": chỉ khớp pB (tên), KHÔNG khớp pA (dù mô tả pA có từ cà phê)
    const resDesc = await request(app.getHttpServer()).get(
      '/api/products?q=' + encodeURIComponent('cà phê'),
    );
    expect(resDesc.status).toBe(200);
    const parsedDesc = storefront.ProductsListResponseSchema.safeParse(resDesc.body);
    expect(parsedDesc.success).toBe(true);
    if (parsedDesc.success) {
      const ids = parsedDesc.data.items.map((i) => i.id);
      expect(ids).toContain(pB);
      expect(ids).not.toContain(pA);
    }

    // 2. Tìm "đồ uống": KHÔNG khớp sản phẩm nào chỉ vì tên danh mục là "Đồ uống"
    const resCat = await request(app.getHttpServer()).get(
      '/api/products?q=' + encodeURIComponent('đồ uống'),
    );
    expect(resCat.status).toBe(200);
    const parsedCat = storefront.ProductsListResponseSchema.safeParse(resCat.body);
    expect(parsedCat.success).toBe(true);
    if (parsedCat.success) {
      const ids = parsedCat.data.items.map((i) => i.id);
      expect(ids).not.toContain(pA);
      expect(ids).not.toContain(pB);
    }
  });

  it('khi có q nonblank, tự động xoá phạm vi categoryId và tìm kiếm trên toàn bộ sản phẩm (contracts/storefront-http.md)', async () => {
    const cat1 = await seedCategory(pool, { name: 'Danh mục 1' });
    const cat2 = await seedCategory(pool, { name: 'Danh mục 2' });

    // p1 thuộc cat2
    const p1 = await seedCatalogProduct(pool, {
      name: 'Bình giữ nhiệt Inox',
      categoryId: cat2,
    });
    await seedCatalogStock(pool, p1, 10);

    // Request truyền categoryId=cat1 nhưng q="binh giu nhiet"
    // Phải xoá categoryId và tìm trên toàn bộ catalog -> tìm thấy p1
    const res = await request(app.getHttpServer()).get(
      `/api/products?categoryId=${cat1}&q=binh%20giu%20nhiet`,
    );
    expect(res.status).toBe(200);
    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const ids = parsed.data.items.map((i) => i.id);
      expect(ids).toContain(p1);
    }
  });

  it('tìm kiếm với chuỗi rỗng/khoảng trắng được coi như không tìm kiếm (trả toàn bộ sản phẩm)', async () => {
    const p1 = await seedCatalogProduct(pool, { name: 'Sản phẩm 1' });
    await seedCatalogStock(pool, p1, 3);
    const p2 = await seedCatalogProduct(pool, { name: 'Sản phẩm 2' });
    await seedCatalogStock(pool, p2, 4);

    const res = await request(app.getHttpServer()).get('/api/products?q=%20%20%20');
    expect(res.status).toBe(200);
    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items.length).toBe(2);
    }
  });

  it('sản phẩm hết hàng vẫn xuất hiện trong kết quả tìm kiếm với stockStatus = out_of_stock (FR-022)', async () => {
    const pOos = await seedCatalogProduct(pool, { name: 'Bình giữ nhiệt hết hàng' });
    await seedCatalogStock(pool, pOos, 0);

    const res = await request(app.getHttpServer()).get('/api/products?q=binh%20giu%20nhiet');
    expect(res.status).toBe(200);
    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const item = parsed.data.items.find((i) => i.id === pOos);
      expect(item).toBeDefined();
      expect(item?.stockStatus).toBe('out_of_stock');
    }
  });

  it('KHÔNG bao giờ để lộ con số tồn kho trong kết quả tìm kiếm (SC-005)', async () => {
    const productId = await seedCatalogProduct(pool, { name: 'Bình giữ nhiệt đặc biệt' });
    const quantity = pickDistinctiveQuantity(productId);
    await seedCatalogStock(pool, productId, quantity);

    const res = await request(app.getHttpServer()).get('/api/products?q=binh%20giu%20nhiet');
    assertNoForbiddenQuantityKey(res.body);
    assertRawBodyNeverContainsQuantity(res.text, quantity);
  });
});
