// apps/api/src/modules/identity/auth-register.int-spec.ts
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

describe('POST /api/auth/register (T007 - US1)', () => {
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

  it('đăng ký thành công trả về 201, tạo session cookie và lưu mật khẩu băm trong db', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: '  NewCustomer@Example.com  ',
        password: 'ValidPassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      account: {
        id: expect.any(Number),
        email: 'newcustomer@example.com',
        role: 'customer',
      },
    });

    // Kiểm tra cookie shop_session
    const token = extractSessionCookie(res.headers['set-cookie']);
    expect(token).toBeDefined();
    expect(token?.length).toBeGreaterThanOrEqual(32);

    const setCookie = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie'].join('; ')
      : res.headers['set-cookie'];
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toMatch(/SameSite=Lax/i);

    // Kiểm tra account trong database
    const accResult = await pool.query<{ id: number; email: string; password_hash: string; role: string }>(
      'SELECT id, email, password_hash, role FROM account WHERE email = $1',
      ['newcustomer@example.com'],
    );
    expect(accResult.rows).toHaveLength(1);
    const acc = accResult.rows[0];
    expect(acc.role).toBe('customer');
    expect(acc.password_hash).toMatch(/^scrypt\$N=16384\$/);
    expect(acc.password_hash).not.toContain('ValidPassword123!');

    // Kiểm tra session trong database
    const sessResult = await pool.query<{ id: string; account_id: number; expires_at: Date }>(
      'SELECT id, account_id, expires_at FROM session WHERE id = $1',
      [token],
    );
    expect(sessResult.rows).toHaveLength(1);
    expect(sessResult.rows[0].account_id).toBe(acc.id);
  });

  it('từ chối email trùng lặp với mã lỗi 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'user@example.com',
        password: 'Password123!',
      });

    const duplicateRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'USER@example.com',
        password: 'OtherPassword123!',
      });

    expect(duplicateRes.status).toBe(409);
    const dupErr = duplicateRes.body.error ?? duplicateRes.body;
    expect(dupErr.code).toBe('EMAIL_ALREADY_EXISTS');
    expect(dupErr.message).toBe('Email này đã được đăng ký tài khoản.');
  });

  it('từ chối mật khẩu dưới 8 ký tự với mã lỗi 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'shortpass@example.com',
        password: '1234567',
      });

    expect(res.status).toBe(400);
    const err = res.body.error ?? res.body;
    expect(err.message).toContain('Mật khẩu phải có tối thiểu 8 ký tự');
  });

  it('từ chối email sai định dạng với mã lỗi 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'invalid-email-format',
        password: 'ValidPassword123!',
      });

    expect(res.status).toBe(400);
  });

  it('luôn gán role customer dù client gửi role shop_owner', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'hacker@example.com',
        password: 'ValidPassword123!',
        role: 'shop_owner',
      });

    expect(res.status).toBe(201);
    expect(res.body.account.role).toBe('customer');

    const dbRes = await pool.query('SELECT role FROM account WHERE email = $1', ['hacker@example.com']);
    expect(dbRes.rows[0].role).toBe('customer');
  });
});
