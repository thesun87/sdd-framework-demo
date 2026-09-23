// apps/api/src/modules/identity/identity.repository.spec.ts
import type { Pool } from 'pg';
import {
  createTestPool,
  assertDatabaseReachable,
  truncateAllTables,
  truncateAuthTables,
} from './identity-test-support';
import { IdentityRepository } from './identity.repository';

describe('IdentityRepository (T006)', () => {
  let pool: Pool;
  let repo: IdentityRepository;

  beforeAll(async () => {
    pool = createTestPool();
    await assertDatabaseReachable(pool);
    repo = new IdentityRepository(pool);
  });

  beforeEach(async () => {
    await truncateAllTables(pool);
    await truncateAuthTables(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Account operations', () => {
    it('tạo account mới và tìm kiếm bằng email', async () => {
      const created = await repo.createAccount('user@example.com', 'scrypt$hash', 'customer');
      expect(created.id).toBeGreaterThan(0);
      expect(created.email).toBe('user@example.com');
      expect(created.role).toBe('customer');

      const found = await repo.findAccountByEmail('user@example.com');
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.passwordHash).toBe('scrypt$hash');
      expect(found?.role).toBe('customer');
    });

    it('tìm kiếm theo id', async () => {
      const created = await repo.createAccount('user2@example.com', 'scrypt$hash2', 'customer');
      const found = await repo.findAccountById(created.id);
      expect(found?.email).toBe('user2@example.com');
    });

    it('trả về null khi không tìm thấy email hoặc id', async () => {
      expect(await repo.findAccountByEmail('nonexistent@example.com')).toBeNull();
      expect(await repo.findAccountById(999999)).toBeNull();
    });
  });

  describe('Session operations', () => {
    it('tạo session, tra cứu kèm account, cập nhật lastActiveAt và xoá session', async () => {
      const account = await repo.createAccount('sessionuser@example.com', 'scrypt$hash', 'customer');
      const token = 'session-token-12345';
      const expiresAt = new Date(Date.now() + 86400000);

      await repo.createSession(token, account.id, expiresAt);

      const sessionWithAccount = await repo.findSessionWithAccount(token);
      expect(sessionWithAccount).not.toBeNull();
      expect(sessionWithAccount?.session.id).toBe(token);
      expect(sessionWithAccount?.account.id).toBe(account.id);
      expect(sessionWithAccount?.account.email).toBe('sessionuser@example.com');

      // Touch session
      const newActiveAt = new Date(Date.now() + 1000);
      await repo.touchSession(token, newActiveAt);

      const touched = await repo.findSessionWithAccount(token);
      expect(touched?.session.lastActiveAt.getTime()).toBeCloseTo(newActiveAt.getTime(), -2);

      // Delete session
      const deleted = await repo.deleteSession(token);
      expect(deleted).toBe(true);

      expect(await repo.findSessionWithAccount(token)).toBeNull();
    });
  });

  describe('Failed login attempts & rate limit', () => {
    it('ghi nhận và đếm số lần thử đăng nhập sai trong khoảng thời gian', async () => {
      const email = 'target@example.com';

      expect(await repo.countFailedAttempts(email, 15)).toBe(0);

      await repo.recordFailedAttempt(email);
      await repo.recordFailedAttempt(email);
      await repo.recordFailedAttempt(email);

      expect(await repo.countFailedAttempts(email, 15)).toBe(3);

      // Xoá sau khi đăng nhập thành công
      await repo.clearFailedAttempts(email);
      expect(await repo.countFailedAttempts(email, 15)).toBe(0);
    });
  });
});
