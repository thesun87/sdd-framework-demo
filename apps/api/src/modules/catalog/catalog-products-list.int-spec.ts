// apps/api/src/modules/catalog/catalog-products-list.int-spec.ts
//
// Contract test cho `GET /api/products` (T010 — sở hữu FR-006, FR-007, SC-005).
// Nguồn: contracts/storefront-http.md §GET /api/products, spec.md FR-006/FR-007/SC-005.
//
// PHẢI ĐỎ trước T011: `AppModule` (apps/api/src/app.module.ts) chưa tồn tại — mọi test dưới
// đây import (gián tiếp qua `catalog-test-support.ts`) một module chưa có, nên toàn bộ file
// thất bại ngay ở bước "Test suite failed to run" (Cannot find module '../../app.module'),
// đúng khuôn mẫu T008 đã dùng cho `./stock.service` (task-008-report.md §4) — KHÔNG phải lỗi
// cú pháp, KHÔNG phải lỗi kết nối database.
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
import { createTestApp } from './catalog-test-support';

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
});
