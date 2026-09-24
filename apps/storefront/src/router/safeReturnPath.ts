/**
 * Kiểm tra và chuẩn hoá đường dẫn quay về an toàn (T011, research R5, FR-016).
 * Chỉ chấp nhận đường dẫn:
 * - Bắt đầu bằng đúng một dấu "/" (không bắt đầu bằng "//" hay "/\")
 * - Không chứa ký tự điều khiển (control characters)
 * - Thuộc cùng origin với ứng dụng hiện tại
 * Trả về đường dẫn hợp lệ hoặc undefined nếu không an toàn.
 */
export function safeReturnPath(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;

  // Bắt đầu bằng đúng một '/', không bắt đầu bằng '//' hoặc '/\'
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return undefined;
  }

  // Không chứa ký tự điều khiển (ASCII 0-31 và 127-159)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F]/.test(raw)) {
    return undefined;
  }

  try {
    const origin =
      typeof window !== "undefined" && window.location && window.location.origin
        ? window.location.origin
        : "http://localhost";
    const url = new URL(raw, origin);
    if (url.origin !== origin) {
      return undefined;
    }
    return raw;
  } catch {
    return undefined;
  }
}
