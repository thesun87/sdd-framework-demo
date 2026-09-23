// apps/api/src/modules/identity/auth-logout.int-spec.ts
import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';
import {
  createTestApp,
  createTestPool,
  assertDatabaseReachable,
  truncateAllTables,
  truncateAuthTables,
  extractSessionCookie,
} from './identity-test-support';

describe('POST /api/auth/logout (T013 - US3)', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();
    await assertDatabaseReachable(pool);
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAllTables(pool);
    await truncateAuthTables(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('đăng xuất huỷ session trong database và xoá session cookie (FR-011)', async () => {
    // 1. Đăng ký & nhận session cookie
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'logout-user@example.com', password: 'Password123!' })
      .expect(201);

    const token = extractSessionCookie(regRes.headers['set-cookie']);
    expect(token).toBeDefined();

    // Khẳng định session tồn tại trong DB
    const sessionBefore = await pool.query(`SELECT * FROM session WHERE id = $1`, [token]);
    expect(sessionBefore.rows.length).toBe(1);

    // 2. Gọi POST /api/auth/logout kèm session cookie
    const logoutRes = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', `shop_session=${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toEqual({ success: true });

    // Header Set-Cookie phải xoá cookie (Max-Age=0)
    const setCookie = Array.isArray(logoutRes.headers['set-cookie'])
      ? logoutRes.headers['set-cookie'].join('; ')
      : logoutRes.headers['set-cookie'];
    expect(setCookie).toMatch(/shop_session=/);
    expect(setCookie).toMatch(/Max-Age=0/i);

    // 3. Khẳng định session row đã bị xoá khỏi database
    const sessionAfter = await pool.query(`SELECT * FROM session WHERE id = $1`, [token]);
    expect(sessionAfter.rows.length).toBe(0);

    // 4. Gọi lại /api/auth/me với token cũ -> phải trả về unauthenticated Guest
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `shop_session=${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({ account: null });
  });

  it('gọi đăng xuất khi chưa đăng nhập (hoặc token không tồn tại) vẫn thành công không lỗi', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});
