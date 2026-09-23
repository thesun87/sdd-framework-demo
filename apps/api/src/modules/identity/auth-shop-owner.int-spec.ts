// apps/api/src/modules/identity/auth-shop-owner.int-spec.ts
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
import { hashPassword } from './password-hasher';

describe('Shop Owner Account Protection & Authentication (T018 - US5)', () => {
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

  it('chủ shop đăng nhập thành công với role shop_owner và /me phản ánh đúng role (FR-012, FR-013)', async () => {
    const ownerEmail = 'owner@example.com';
    const ownerPassword = 'ShopOwner123!';
    const passwordHash = await hashPassword(ownerPassword);

    // Giả lập tài khoản chủ shop có sẵn từ seed (FR-012)
    await pool.query(
      `INSERT INTO account (email, password_hash, role) VALUES ($1, $2, 'shop_owner')`,
      [ownerEmail, passwordHash],
    );

    // 1. Đăng nhập
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password: ownerPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toEqual({
      account: {
        id: expect.any(Number),
        email: ownerEmail,
        role: 'shop_owner',
      },
    });

    const token = extractSessionCookie(loginRes.headers['set-cookie']);
    expect(token).toBeDefined();

    // 2. Kiểm tra GET /api/auth/me trả về đúng role shop_owner
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `shop_session=${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({
      account: {
        id: loginRes.body.account.id,
        email: ownerEmail,
        role: 'shop_owner',
      },
    });
  });

  it('đăng ký công khai không thể chiếm quyền hoặc tạo tài khoản shop_owner (FR-012)', async () => {
    // Kẻ tấn công cố tình gửi thêm trường role: 'shop_owner' qua form đăng ký
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'hacker@example.com',
        password: 'HackerPassword123!',
        role: 'shop_owner',
      });

    expect(res.status).toBe(201);
    // Role bắt buộc phải là customer, không bao giờ là shop_owner
    expect(res.body.account.role).toBe('customer');

    // Kiểm tra trực tiếp trong database
    const dbAccount = await pool.query(
      `SELECT * FROM account WHERE email = 'hacker@example.com'`,
    );
    expect(dbAccount.rows.length).toBe(1);
    expect(dbAccount.rows[0].role).toBe('customer');
  });

  it('chỉ có duy nhất 1 tài khoản chủ shop trong hệ thống (FR-012)', async () => {
    const ownerEmail = 'owner@example.com';
    const passwordHash = await hashPassword('ShopOwner123!');

    await pool.query(
      `INSERT INTO account (email, password_hash, role) VALUES ($1, $2, 'shop_owner')`,
      [ownerEmail, passwordHash],
    );

    const owners = await pool.query(`SELECT * FROM account WHERE role = 'shop_owner'`);
    expect(owners.rows.length).toBe(1);
  });
});
