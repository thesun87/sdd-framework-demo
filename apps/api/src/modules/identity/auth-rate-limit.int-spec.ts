// apps/api/src/modules/identity/auth-rate-limit.int-spec.ts
import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import request from 'supertest';
import {
  createTestApp,
  createTestPool,
  assertDatabaseReachable,
  truncateAllTables,
  truncateAuthTables,
} from './identity-test-support';

describe('Brute-force Login Rate Limiting (T016 - US4)', () => {
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

  it('khoá đăng nhập trả về HTTP 429 sau 10 lần thử sai trong 15 phút, kể cả nhập đúng mật khẩu ở lần 11 (FR-010)', async () => {
    const email = 'victim@example.com';
    const password = 'CorrectPassword123!';

    // Đăng ký tài khoản hợp lệ
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    // Gửi 10 lần đăng nhập sai liên tiếp
    for (let i = 1; i <= 10; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    }

    // Lần thứ 11: nhập đúng mật khẩu nhưng vẫn bị khoá 429
    const blockedRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

    expect(blockedRes.status).toBe(429);
    const code = blockedRes.body?.error?.code ?? blockedRes.body?.code;
    const message = blockedRes.body?.error?.message ?? blockedRes.body?.message;
    expect(code).toBe('TOO_MANY_ATTEMPTS');
    expect(message).toBe('Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
  });

  it('đăng nhập thành công sẽ reset bộ đếm lần sai (FR-010)', async () => {
    const email = 'reset-user@example.com';
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    // Gửi 5 lần sai
    for (let i = 1; i <= 5; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'BadPassword!' })
        .expect(401);
    }

    // Đăng nhập thành công -> xoá bộ đếm
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    // Kiểm tra trong DB các bản ghi failed_login_attempt đã bị xoá
    const attempts = await pool.query(
      `SELECT * FROM failed_login_attempt WHERE email = $1`,
      [email],
    );
    expect(attempts.rows.length).toBe(0);

    // Sau đó tiếp tục sai thêm 5 lần nữa -> vẫn trả về 401 chứ chưa chạm mốc 10
    for (let i = 1; i <= 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'BadPassword!' });
      expect(res.status).toBe(401);
    }
  });

  it('các lần thử sai quá 15 phút trước không còn tính vào ngưỡng khoá (FR-010)', async () => {
    const email = 'expired-attempts@example.com';
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    // Gửi 10 lần sai
    for (let i = 1; i <= 10; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'BadPassword!' })
        .expect(401);
    }

    // Giả lập 10 lần sai này đã diễn ra từ 16 phút trước
    const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000);
    await pool.query(
      `UPDATE failed_login_attempt SET attempted_at = $1 WHERE email = $2`,
      [sixteenMinutesAgo, email],
    );

    // Giờ thử lại với đúng mật khẩu -> thành công 200, không bị 429
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginRes.status).toBe(200);
  });
});
