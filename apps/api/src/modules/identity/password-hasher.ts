// apps/api/src/modules/identity/password-hasher.ts
//
// Cơ chế băm mật khẩu và so khớp mật khẩu bằng Node.js crypto.scrypt (AD-6, D-1).
// Sử dụng salt ngẫu nhiên 16 bytes, N=16384, r=8, p=1, keylen=64.
// So khớp bằng crypto.timingSafeEqual để chống timing attack.

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_BYTES = 16;

function computeScrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey as Buffer);
      }
    });
  });
}

/**
 * Băm mật khẩu với salt ngẫu nhiên và chuẩn hóa chuỗi kết quả:
 * `scrypt$N=16384$<salt-hex>$<hash-hex>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await computeScrypt(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  const saltHex = salt.toString('hex');
  const hashHex = derivedKey.toString('hex');

  return `scrypt$N=${SCRYPT_N}$${saltHex}$${hashHex}`;
}

/**
 * Xác thực mật khẩu với chuỗi hash đã lưu bằng crypto.timingSafeEqual.
 * Trả về false nếu chuỗi hash không đúng định dạng hoặc sai mật khẩu.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    // Format: ['scrypt', 'N=16384', saltHex, hashHex]
    if (parts.length !== 4 || parts[0] !== 'scrypt' || !parts[1].startsWith('N=')) {
      return false;
    }

    const nParam = Number.parseInt(parts[1].slice(2), 10);
    if (Number.isNaN(nParam) || nParam <= 0) {
      return false;
    }

    const saltHex = parts[2];
    const hashHex = parts[3];

    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(hashHex, 'hex');

    if (salt.length !== SALT_BYTES || expectedKey.length !== KEY_LEN) {
      return false;
    }

    const actualKey = await computeScrypt(password, salt, expectedKey.length, {
      N: nParam,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}
