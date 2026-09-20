// apps/api/src/modules/catalog/catalog-health.int-spec.ts
//
// Contract test cho `GET /api/health` (T010, xem contracts/storefront-http.md
// §GET /api/health). Hợp đồng không định nghĩa hình dạng thân response cho endpoint này —
// chỉ định nghĩa mã trạng thái: 200 khi hệ thống lành mạnh. Vì vậy test này CHỈ khẳng định
// mã trạng thái, không bịa thêm hình dạng thân response mà hợp đồng không yêu cầu.
//
// PHẢI ĐỎ trước T011: `AppModule` (apps/api/src/app.module.ts) chưa tồn tại.
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './catalog-test-support';

describe('GET /api/health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('trả 200 khi hệ thống lành mạnh', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
  });
});
