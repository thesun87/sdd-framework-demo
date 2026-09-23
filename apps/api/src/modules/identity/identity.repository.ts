// apps/api/src/modules/identity/identity.repository.ts
//
// Lớp truy xuất cơ sở dữ liệu cho module `identity` (T006).
// Tuân thủ AD-5: Ranh giới module là ranh giới dữ liệu — chỉ module identity
// truy cập trực tiếp các bảng account, session, failed_login_attempt.

import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../catalog/pg-pool.provider';

export interface AccountRecord {
  id: number;
  email: string;
  passwordHash: string;
  role: 'customer' | 'shop_owner';
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  accountId: number;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
}

export interface SessionWithAccount {
  session: SessionRecord;
  account: {
    id: number;
    email: string;
    role: 'customer' | 'shop_owner';
  };
}

@Injectable()
export class IdentityRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Tạo tài khoản mới.
   */
  async createAccount(
    email: string,
    passwordHash: string,
    role: 'customer' | 'shop_owner' = 'customer',
  ): Promise<{ id: number; email: string; role: 'customer' | 'shop_owner' }> {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await this.pool.query<{ id: number; email: string; role: 'customer' | 'shop_owner' }>(
      `INSERT INTO account (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [normalizedEmail, passwordHash, role],
    );
    return res.rows[0];
  }

  /**
   * Tra cứu tài khoản theo email (chuẩn hoá chữ thường).
   */
  async findAccountByEmail(email: string): Promise<AccountRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await this.pool.query<{
      id: number;
      email: string;
      password_hash: string;
      role: 'customer' | 'shop_owner';
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, email, password_hash, role, created_at, updated_at
       FROM account
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Tra cứu tài khoản theo id.
   */
  async findAccountById(
    id: number,
  ): Promise<{ id: number; email: string; role: 'customer' | 'shop_owner' } | null> {
    const res = await this.pool.query<{
      id: number;
      email: string;
      role: 'customer' | 'shop_owner';
    }>(
      `SELECT id, email, role
       FROM account
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  /**
   * Tạo phiên đăng nhập mới trong PostgreSQL.
   */
  async createSession(token: string, accountId: number, expiresAt: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO session (id, account_id, expires_at, last_active_at)
       VALUES ($1, $2, $3, NOW())`,
      [token, accountId, expiresAt],
    );
  }

  /**
   * Tra cứu session kèm account thông qua token.
   */
  async findSessionWithAccount(token: string): Promise<SessionWithAccount | null> {
    const res = await this.pool.query<{
      session_id: string;
      account_id: number;
      expires_at: Date;
      last_active_at: Date;
      session_created_at: Date;
      email: string;
      role: 'customer' | 'shop_owner';
    }>(
      `SELECT s.id as session_id, s.account_id, s.expires_at, s.last_active_at, s.created_at as session_created_at,
              a.email, a.role
       FROM session s
       JOIN account a ON a.id = s.account_id
       WHERE s.id = $1
       LIMIT 1`,
      [token],
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      session: {
        id: r.session_id,
        accountId: r.account_id,
        expiresAt: r.expires_at,
        lastActiveAt: r.last_active_at,
        createdAt: r.session_created_at,
      },
      account: {
        id: r.account_id,
        email: r.email,
        role: r.role,
      },
    };
  }

  /**
   * Cập nhật thời điểm hoạt động cuối cùng của session (sliding expiration).
   */
  async touchSession(token: string, activeAt: Date = new Date()): Promise<void> {
    await this.pool.query(
      `UPDATE session
       SET last_active_at = $2
       WHERE id = $1`,
      [token, activeAt],
    );
  }

  /**
   * Xoá phiên đăng nhập (thu hồi phiên khi logout hoặc hết hạn).
   */
  async deleteSession(token: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM session
       WHERE id = $1`,
      [token],
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Đếm số lần đăng nhập sai theo email trong cửa sổ trượt (windowMinutes).
   */
  async countFailedAttempts(email: string, windowMinutes: number = 15): Promise<number> {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM failed_login_attempt
       WHERE email = $1
         AND attempted_at >= NOW() - ($2 || ' minutes')::interval`,
      [normalizedEmail, windowMinutes],
    );
    return Number.parseInt(res.rows[0]?.count ?? '0', 10);
  }

  /**
   * Ghi nhận một lần đăng nhập sai.
   */
  async recordFailedAttempt(email: string, attemptedAt: Date = new Date()): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    await this.pool.query(
      `INSERT INTO failed_login_attempt (email, attempted_at)
       VALUES ($1, $2)`,
      [normalizedEmail, attemptedAt],
    );
  }

  /**
   * Xoá các lần đăng nhập sai sau khi đăng nhập thành công.
   */
  async clearFailedAttempts(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    await this.pool.query(
      `DELETE FROM failed_login_attempt
       WHERE email = $1`,
      [normalizedEmail],
    );
  }
}
