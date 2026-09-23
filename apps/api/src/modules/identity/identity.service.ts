// apps/api/src/modules/identity/identity.service.ts
//
// Nghiệp vụ tài khoản, xác thực và phiên làm việc (Feature 002-accounts).
// Tuân thủ AD-5 (Ranh giới module), AD-6 (Email là định danh), AD-8 (Phiên lưu server).

import { randomBytes } from 'node:crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { storefront } from 'shared';
import { IdentityRepository } from './identity.repository';
import { hashPassword, verifyPassword } from './password-hasher';

export const SESSION_COOKIE_NAME = 'shop_session';
export const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 ngày tuyệt đối (FR-009)
export const IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày trượt (FR-009)
export const RATE_LIMIT_ATTEMPTS = 10;
export const RATE_LIMIT_WINDOW_MINUTES = 15;

@Injectable()
export class IdentityService {
  constructor(private readonly identityRepo: IdentityRepository) {}

  /**
   * Đăng ký tài khoản khách hàng mới (US1).
   * Luôn gán role: 'customer' (FR-001, FR-012).
   */
  async register(
    payload: unknown,
  ): Promise<{ account: storefront.AccountSummary; sessionToken: string }> {
    const parseResult = storefront.RegisterRequestSchema.safeParse(payload);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: issue?.message ?? 'Dữ liệu đăng ký không hợp lệ.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { email, password } = parseResult.data;

    // Kiểm tra trùng lặp email (409 Conflict)
    const existing = await this.identityRepo.findAccountByEmail(email);
    if (existing) {
      throw new HttpException(
        {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email này đã được đăng ký tài khoản.',
        },
        HttpStatus.CONFLICT,
      );
    }

    // Băm mật khẩu scrypt (FR-008)
    const passwordHash = await hashPassword(password);

    // Tạo tài khoản (vai trò customer)
    const account = await this.identityRepo.createAccount(email, passwordHash, 'customer');

    // Tạo phiên đăng nhập ngay lập tức (FR-004)
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await this.identityRepo.createSession(sessionToken, account.id, expiresAt);

    return {
      account: {
        id: account.id,
        email: account.email,
        role: account.role,
      },
      sessionToken,
    };
  }

  /**
   * Đăng nhập thiết lập phiên làm việc (US2) kèm bảo vệ brute-force (US4).
   */
  async login(
    payload: unknown,
  ): Promise<{ account: storefront.AccountSummary; sessionToken: string }> {
    const parseResult = storefront.LoginRequestSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new HttpException(
        {
          code: 'INVALID_CREDENTIALS',
          message: 'Email hoặc mật khẩu không chính xác.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { email, password } = parseResult.data;

    // Kiểm tra giới hạn số lần thử đăng nhập sai: 10 lần trong 15 phút (FR-010)
    const failedCount = await this.identityRepo.countFailedAttempts(
      email,
      RATE_LIMIT_WINDOW_MINUTES,
    );
    if (failedCount >= RATE_LIMIT_ATTEMPTS) {
      throw new HttpException(
        {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const account = await this.identityRepo.findAccountByEmail(email);
    if (!account) {
      // Ghi nhận lần sai (thông báo lỗi chung chống tiết lộ định danh)
      await this.identityRepo.recordFailedAttempt(email);
      throw new HttpException(
        {
          code: 'INVALID_CREDENTIALS',
          message: 'Email hoặc mật khẩu không chính xác.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await verifyPassword(password, account.passwordHash);
    if (!isPasswordValid) {
      await this.identityRepo.recordFailedAttempt(email);
      throw new HttpException(
        {
          code: 'INVALID_CREDENTIALS',
          message: 'Email hoặc mật khẩu không chính xác.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Đăng nhập thành công -> Xoá bộ đếm số lần sai của định danh này
    await this.identityRepo.clearFailedAttempts(email);

    // Tạo phiên mới
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await this.identityRepo.createSession(sessionToken, account.id, expiresAt);

    return {
      account: {
        id: account.id,
        email: account.email,
        role: account.role,
      },
      sessionToken,
    };
  }

  /**
   * Đăng xuất và huỷ phiên trong database (US3).
   */
  async logout(sessionToken: string | undefined): Promise<void> {
    if (sessionToken) {
      await this.identityRepo.deleteSession(sessionToken);
    }
  }

  /**
   * Lấy thông tin tài khoản hiện tại từ session token (FR-006, FR-009).
   */
  async getCurrentUser(
    sessionToken: string | undefined,
  ): Promise<storefront.AccountSummary | null> {
    if (!sessionToken) {
      return null;
    }

    const sessionWithAccount = await this.identityRepo.findSessionWithAccount(sessionToken);
    if (!sessionWithAccount) {
      return null;
    }

    const now = new Date();
    const { session, account } = sessionWithAccount;

    // Kiểm tra hết hạn tuyệt đối 90 ngày
    if (now > session.expiresAt) {
      await this.identityRepo.deleteSession(sessionToken);
      return null;
    }

    // Kiểm tra hết hạn trượt 30 ngày không hoạt động
    const idleElapsed = now.getTime() - new Date(session.lastActiveAt).getTime();
    if (idleElapsed > IDLE_TIMEOUT_MS) {
      await this.identityRepo.deleteSession(sessionToken);
      return null;
    }

    // Cập nhật lastActiveAt (cửa sổ trượt)
    await this.identityRepo.touchSession(sessionToken, now);

    return {
      id: account.id,
      email: account.email,
      role: account.role,
    };
  }
}
