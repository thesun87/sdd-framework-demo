// apps/api/src/modules/identity/identity-test-support.ts
//
// Hạ tầng test fixture và database helpers cho module `identity` (T002).

import { randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { hashPassword } from './password-hasher';

export {
  createTestPool,
  assertDatabaseReachable,
  truncateAllTables,
} from '../stock/stock-test-support';

export { createTestApp } from '../catalog/catalog-test-support';

/**
 * Xoá dữ liệu các bảng thuộc module identity (account, session, failed_login_attempt).
 */
export async function truncateAuthTables(pool: Pool): Promise<void> {
  await pool.query(
    'TRUNCATE TABLE session, failed_login_attempt, account RESTART IDENTITY CASCADE',
  );
}

export interface SeedAccountOptions {
  email?: string;
  password?: string;
  role?: 'customer' | 'shop_owner';
}

export interface SeededAccount {
  id: number;
  email: string;
  role: 'customer' | 'shop_owner';
  rawPassword: string;
  passwordHash: string;
}

/**
 * Seed một account vào PostgreSQL với mật khẩu đã băm scrypt chuẩn.
 */
export async function seedAccount(
  pool: Pool,
  options: SeedAccountOptions = {},
): Promise<SeededAccount> {
  const email = (options.email ?? `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`)
    .trim()
    .toLowerCase();
  const rawPassword = options.password ?? 'Password123!';
  const role = options.role ?? 'customer';
  const passwordHash = await hashPassword(rawPassword);

  const res = await pool.query<{ id: number; created_at: Date; updated_at: Date }>(
    `INSERT INTO account (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, created_at, updated_at`,
    [email, passwordHash, role],
  );

  return {
    id: res.rows[0].id,
    email,
    role,
    rawPassword,
    passwordHash,
  };
}

export interface SeedSessionOptions {
  token?: string;
  expiresAt?: Date;
  lastActiveAt?: Date;
}

/**
 * Seed một session vào PostgreSQL gắn với accountId.
 */
export async function seedSession(
  pool: Pool,
  accountId: number,
  options: SeedSessionOptions = {},
): Promise<string> {
  const token = options.token ?? randomBytes(32).toString('hex');
  const expiresAt = options.expiresAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const lastActiveAt = options.lastActiveAt ?? new Date();

  await pool.query(
    `INSERT INTO session (id, account_id, expires_at, last_active_at)
     VALUES ($1, $2, $3, $4)`,
    [token, accountId, expiresAt, lastActiveAt],
  );

  return token;
}

/**
 * Ghi nhận một lần đăng nhập sai vào bảng failed_login_attempt.
 */
export async function seedFailedLoginAttempt(
  pool: Pool,
  email: string,
  attemptedAt: Date = new Date(),
): Promise<void> {
  await pool.query(
    `INSERT INTO failed_login_attempt (email, attempted_at)
     VALUES ($1, $2)`,
    [email.trim().toLowerCase(), attemptedAt],
  );
}

/**
 * Trích xuất token từ header Set-Cookie `shop_session=<token>; ...`
 */
export function extractSessionCookie(
  setCookieHeader: string[] | string | undefined,
): string | undefined {
  if (!setCookieHeader) return undefined;
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const h of headers) {
    const match = h.match(/shop_session=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}
