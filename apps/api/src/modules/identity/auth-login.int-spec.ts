// apps/api/src/modules/identity/auth-login.int-spec.ts
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

describe('POST /api/auth/login and GET /api/auth/me (T010 - US2)', () => {
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

  it('đăng nhập thành công trả về 200, tạo session cookie và truy vấn được /me (FR-006)', async () => {
    // 1. Đăng ký tài khoản trước
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'customer@example.com', password: 'Password123!' })
      .expect(201);

    // 2. Đăng nhập
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'customer@example.com', password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toEqual({
      account: {
        id: expect.any(Number),
        email: 'customer@example.com',
        role: 'customer',
      },
    });

    const token = extractSessionCookie(loginRes.headers['set-cookie']);
    expect(token).toBeDefined();

    // 3. Gọi GET /api/auth/me với cookie vừa nhận
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `shop_session=${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({
      account: {
        id: loginRes.body.account.id,
        email: 'customer@example.com',
        role: 'customer',
      },
    });
  });

  it('chống tiết lộ danh tính (anti-disclosure): email không tồn tại trả về 401 với thông điệp chung (FR-007)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'notfound@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
    const message = res.body?.error?.message ?? res.body?.message;
    expect(message).toBe('Email hoặc mật khẩu không chính xác.');

    // Ghi nhận lần sai vào database
    const failedQuery = await pool.query(
      `SELECT * FROM failed_login_attempt WHERE email = 'notfound@example.com'`,
    );
    expect(failedQuery.rows.length).toBe(1);
  });

  it('chống tiết lộ danh tính (anti-disclosure): sai mật khẩu trả về 401 với thông điệp y hệt (FR-007)', async () => {
    // Tạo tài khoản trước
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'user@example.com', password: 'CorrectPassword123!' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPassword123!' });

    expect(res.status).toBe(401);
    const message = res.body?.error?.message ?? res.body?.message;
    expect(message).toBe('Email hoặc mật khẩu không chính xác.');

    const failedQuery = await pool.query(
      `SELECT * FROM failed_login_attempt WHERE email = 'user@example.com'`,
    );
    expect(failedQuery.rows.length).toBe(1);
  });

  it('GET /api/auth/me trả về { account: null } khi chưa đăng nhập hoặc cookie không hợp lệ', async () => {
    // Không có cookie
    const noCookieRes = await request(app.getHttpServer()).get('/api/auth/me');
    expect(noCookieRes.status).toBe(200);
    expect(noCookieRes.body).toEqual({ account: null });

    // Cookie token bịa đặt
    const fakeCookieRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', 'shop_session=fake_invalid_token_1234567890');
    expect(fakeCookieRes.status).toBe(200);
    expect(fakeCookieRes.body).toEqual({ account: null });
  });

  it('phiên hết hạn trượt sau 30 ngày không hoạt động (FR-009)', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'idle@example.com', password: 'Password123!' })
      .expect(201);

    const token = extractSessionCookie(regRes.headers['set-cookie']);
    expect(token).toBeDefined();

    // Giả lập phiên đã không hoạt động 31 ngày (31 days ago)
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await pool.query(`UPDATE session SET last_active_at = $1 WHERE id = $2`, [
      thirtyOneDaysAgo,
      token,
    ]);

    // Gọi /me -> phải trả về null và xoá phiên trong db
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `shop_session=${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({ account: null });

    const sessionCheck = await pool.query(`SELECT * FROM session WHERE id = $1`, [token]);
    expect(sessionCheck.rows.length).toBe(0);
  });

  it('phiên hết hạn tuyệt đối sau 90 ngày kể từ khi tạo (FR-009)', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'expired@example.com', password: 'Password123!' })
      .expect(201);

    const token = extractSessionCookie(regRes.headers['set-cookie']);
    expect(token).toBeDefined();

    // Giả lập phiên có expires_at trong quá khứ
    const inPast = new Date(Date.now() - 1000);
    await pool.query(`UPDATE session SET expires_at = $1 WHERE id = $2`, [inPast, token]);

    // Gọi /me -> phải trả về null và xoá phiên trong db
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `shop_session=${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({ account: null });

    const sessionCheck = await pool.query(`SELECT * FROM session WHERE id = $1`, [token]);
    expect(sessionCheck.rows.length).toBe(0);
  });
});
