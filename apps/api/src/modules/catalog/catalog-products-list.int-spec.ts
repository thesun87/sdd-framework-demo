// apps/api/src/modules/catalog/catalog-products-list.int-spec.ts
//
// Contract test cho `GET /api/products` (T010 — sở hữu FR-006, FR-007, SC-005).
// Nguồn: contracts/storefront-http.md §GET /api/products, spec.md FR-006/FR-007/SC-005.
//
// Database THẬT (AD-27): dùng `createTestPool`/`assertDatabaseReachable`/`truncateAllTables`/
// `seedProduct`/`seedStock` NGUYÊN VẸN từ `../stock/stock-test-support.ts` (hạ tầng T008) —
// không viết lại một bản thứ hai.
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

describe('GET /api/products', () => {
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

  it('trả đúng hình dạng ProductsListResponseSchema của packages/shared (AD-10) và Cache-Control: no-store', async () => {
    const productId = await seedProduct(pool, { name: 'Sản phẩm A' });
    await seedStock(pool, productId, 3);

    const res = await request(app.getHttpServer()).get('/api/products');

    expect(res.status).toBe(200);
    // Header bắt buộc theo hợp đồng — AD-20 cấm cache `stockStatus` ở bất kỳ tầng nào,
    // response chứa `stockStatus` nên PHẢI mang đúng header này.
    expect(res.headers['cache-control']).toBe('no-store');

    // Validate bằng CHÍNH schema của packages/shared — KHÔNG khai lại hình dạng ở đây.
    // ProductSummarySchema/ProductsListResponseSchema đều `.strict()` (packages/shared/src/
    // storefront/product.ts) — một object có thêm trường lạ (vd. `quantity`) sẽ bị từ chối
    // thay vì lọt qua âm thầm.
    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });

  it('KHÔNG bao giờ để lộ con số tồn kho ở bất cứ đâu trong thân response (SC-005, đọc toàn bộ thân thô)', async () => {
    const productId = await seedProduct(pool, { name: 'Sản phẩm lộ tồn kho?' });
    const quantity = pickDistinctiveQuantity(productId);
    await seedStock(pool, productId, quantity);

    const res = await request(app.getHttpServer()).get('/api/products');

    // (1) Không khoá nào (ở BẤT KỲ độ sâu nào của JSON đã parse) mang tên liên quan tới số
    // lượng tồn kho — bổ sung cho `.strict()` của schema, vốn chỉ chặn được khoá lạ Ở ĐÚNG
    // CẤP nó khai.
    assertNoForbiddenQuantityKey(res.body);

    // (2) Đọc TOÀN BỘ thân response dưới dạng CHUỖI THÔ (res.text, chưa parse) — không chỉ
    // nhìn vài trường đã biết như SC-005 yêu cầu — và khẳng định con số tồn kho thật không
    // xuất hiện ở bất cứ đâu, kể cả lồng trong một chuỗi văn bản hợp lệ về kiểu.
    assertRawBodyNeverContainsQuantity(res.text, quantity);
  });

  it('stockStatus KHÔNG được cache ở bất kỳ tầng nào — đổi quantity trực tiếp trong DB rồi gọi lại ngay qua HTTP THẬT phải phản ánh giá trị mới (AD-20)', async () => {
    const productId = await seedProduct(pool, { name: 'Sản phẩm đổi tồn kho' });
    await seedStock(pool, productId, 5);

    // Lần gọi HTTP THẬT thứ NHẤT — còn hàng.
    const first = await request(app.getHttpServer()).get('/api/products');
    expect(first.headers['cache-control']).toBe('no-store');
    const firstParsed = storefront.ProductsListResponseSchema.safeParse(first.body);
    expect(firstParsed.success).toBe(true);
    const firstItem = firstParsed.success
      ? firstParsed.data.items.find((item) => item.id === productId)
      : undefined;
    expect(firstItem?.stockStatus).toBe('in_stock');

    // Đổi `quantity` TRỰC TIẾP trong database — qua một pool KHÁC với connection mà `app`
    // dùng nội bộ (không đi qua service/HTTP nào của app) — mô phỏng đúng "dữ liệu vừa đổi ở
    // tầng dưới", để loại trừ khả năng một cache ở tầng ứng dụng/HTTP che giấu thay đổi này.
    await pool.query('UPDATE stock SET quantity = 0 WHERE product_id = $1', [productId]);

    // Lần gọi HTTP THẬT thứ HAI, NGAY LẬP TỨC — hết hàng. Nếu bất kỳ tầng nào (service,
    // controller, response cache, CDN giả lập, ...) cache `stockStatus`, assertion này sẽ ĐỎ.
    const second = await request(app.getHttpServer()).get('/api/products');
    expect(second.headers['cache-control']).toBe('no-store');
    const secondParsed = storefront.ProductsListResponseSchema.safeParse(second.body);
    expect(secondParsed.success).toBe(true);
    const secondItem = secondParsed.success
      ? secondParsed.data.items.find((item) => item.id === productId)
      : undefined;
    expect(secondItem?.stockStatus).toBe('out_of_stock');
  });

  it('lọc theo categoryId chỉ trả về sản phẩm thuộc danh mục đó (FR-002, FR-003)', async () => {
    const cat1 = await seedCategory(pool, { name: 'Danh mục 1' });
    const cat2 = await seedCategory(pool, { name: 'Danh mục 2' });

    const p1 = await seedCatalogProduct(pool, { name: 'Sản phẩm Cat 1', categoryId: cat1 });
    await seedCatalogStock(pool, p1, 10);

    const p2 = await seedCatalogProduct(pool, { name: 'Sản phẩm Cat 2', categoryId: cat2 });
    await seedCatalogStock(pool, p2, 5);

    const res = await request(app.getHttpServer()).get(`/api/products?categoryId=${cat1}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      const ids = parsed.data.items.map((i) => i.id);
      expect(ids).toContain(p1);
      expect(ids).not.toContain(p2);
    }
  });

  it('sản phẩm không có danh mục chỉ xuất hiện ở tất cả sản phẩm, không nằm trong danh mục cụ thể (FR-004)', async () => {
    const cat = await seedCategory(pool, { name: 'Thời trang' });
    const pCat = await seedCatalogProduct(pool, { name: 'Áo sơ mi', categoryId: cat });
    await seedCatalogStock(pool, pCat, 10);

    const pNoCat = await seedCatalogProduct(pool, { name: 'Sổ tay không danh mục', categoryId: null });
    await seedCatalogStock(pool, pNoCat, 8);

    // Khi gọi tất cả sản phẩm: cả 2 đều xuất hiện
    const allRes = await request(app.getHttpServer()).get('/api/products');
    const allParsed = storefront.ProductsListResponseSchema.safeParse(allRes.body);
    expect(allParsed.success).toBe(true);
    if (allParsed.success) {
      const allIds = allParsed.data.items.map((i) => i.id);
      expect(allIds).toContain(pCat);
      expect(allIds).toContain(pNoCat);
    }

    // Khi lọc theo categoryId: sản phẩm không danh mục KHÔNG xuất hiện
    const catRes = await request(app.getHttpServer()).get(`/api/products?categoryId=${cat}`);
    const catParsed = storefront.ProductsListResponseSchema.safeParse(catRes.body);
    expect(catParsed.success).toBe(true);
    if (catParsed.success) {
      const catIds = catParsed.data.items.map((i) => i.id);
      expect(catIds).toContain(pCat);
      expect(catIds).not.toContain(pNoCat);
    }
  });

  it('sản phẩm hết hàng trong danh mục vẫn hiển thị với nhãn out_of_stock (FR-022)', async () => {
    const cat = await seedCategory(pool, { name: 'Gia dụng' });
    const pOos = await seedCatalogProduct(pool, { name: 'Bình giữ nhiệt hết hàng', categoryId: cat });
    await seedCatalogStock(pool, pOos, 0);

    const res = await request(app.getHttpServer()).get(`/api/products?categoryId=${cat}`);
    const parsed = storefront.ProductsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const item = parsed.data.items.find((i) => i.id === pOos);
      expect(item).toBeDefined();
      expect(item?.stockStatus).toBe('out_of_stock');
    }
  });
});
