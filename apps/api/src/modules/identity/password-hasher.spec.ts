// apps/api/src/modules/identity/password-hasher.spec.ts
import { hashPassword, verifyPassword } from './password-hasher';

describe('password-hasher (T005)', () => {
  it('băm mật khẩu và xác thực mật khẩu chính xác', async () => {
    const password = 'CorrectPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^scrypt\$N=16384\$[a-f0-9]{32}\$[a-f0-9]{128}$/);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('từ chối mật khẩu sai', async () => {
    const password = 'CorrectPassword123!';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword('WrongPassword!', hash);
    expect(isValid).toBe(false);
  });

  it('tạo salt ngẫu nhiên khác nhau cho cùng một mật khẩu', async () => {
    const password = 'SamePassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it('trả về false khi chuỗi hash lưu trữ bị hỏng định dạng', async () => {
    expect(await verifyPassword('any', 'invalid-hash')).toBe(false);
    expect(await verifyPassword('any', 'scrypt$invalid$format')).toBe(false);
    expect(await verifyPassword('any', '')).toBe(false);
  });
});
