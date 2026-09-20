// T013 — bằng chứng SC-004: 100% phản hồi trang mang đủ header an toàn của AD-29, đo trên
// CẢ đường dẫn bán hàng (`/`) LẪN đường dẫn quản trị (`/admin/*`), qua trình duyệt thật đi
// qua reverse proxy thật (baseURL trong playwright.config.ts trỏ vào Caddy — ops/Caddyfile).
//
// Nội dung header khẳng định dưới đây chép NGUYÊN VĂN từ `ops/Caddyfile` (T003) và
// `specs/000-walking-skeleton/contracts/storefront-http.md` §Hợp đồng của reverse proxy —
// không suy diễn, không nới lỏng bất kỳ directive nào (AD-29). Nếu một khẳng định ở đây phải
// nới ra mới xanh, đó là dấu hiệu Caddyfile/baseline sai, không phải lý do sửa test.
import { test, expect, type Page } from "@playwright/test";

type CspDirectives = Record<string, string[]>;

/**
 * Phân tách chuỗi `Content-Security-Policy` thành map directive → danh sách token nguồn.
 * Cố ý KHÔNG dùng `includes()` trên cả chuỗi thô — brief yêu cầu đọc TỪNG directive riêng,
 * vì `includes("unsafe-inline")` trên cả chuỗi không phân biệt được nó nằm ở `style-src`
 * (được phép) hay lọt sang `script-src` (không được phép).
 */
function parseCsp(header: string): CspDirectives {
  const directives: CspDirectives = {};
  for (const rawPart of header.split(";")) {
    const trimmed = rawPart.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    directives[name] = sources;
  }
  return directives;
}

/** Header trả về từ Playwright có thể khác hoa/thường tuỳ tầng — chuẩn hoá về chữ thường
 *  trước khi đọc, để test không phụ thuộc vào cách viết hoa của một implementation cụ thể. */
function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

/** Một token nguồn "an toàn" theo baseline chỉ có thể là từ khoá trong dấu nháy đơn — ví dụ
 *  `'self'`, `'none'`, `'unsafe-inline'`. Bất kỳ token nào KHÔNG khớp dạng này là một URL/
 *  domain thật, tức một CDN hoặc một origin thứ hai — điều SC-004 cấm tuyệt đối (AD-8: một
 *  origin duy nhất cho cả bán hàng lẫn quản trị). */
const KEYWORD_SOURCE = /^'[a-z-]+'$/;

/**
 * Khẳng định đầy đủ ba header an toàn của AD-29 trên MỘT phản hồi HTTP, đọc CSP theo từng
 * directive (không so chuỗi thô). Dùng chung cho cả đường dẫn bán hàng và quản trị — đây
 * chính là điểm SC-004 đòi hỏi: cùng MỘT bộ khẳng định, áp cho CẢ hai đường dẫn.
 */
function assertSecurityHeaders(rawHeaders: Record<string, string>): void {
  const headers = normalizeHeaders(rawHeaders);

  const csp = headers["content-security-policy"];
  expect(csp, "thiếu header Content-Security-Policy").toBeTruthy();
  const directives = parseCsp(csp);

  // Danh sách directive tối thiểu — nguyên văn ops/Caddyfile / contract.
  expect(directives["default-src"]).toEqual(["'self'"]);
  expect(directives["script-src"]).toEqual(["'self'"]);
  expect(directives["object-src"]).toEqual(["'none'"]);
  expect(directives["base-uri"]).toEqual(["'self'"]);
  expect(directives["frame-ancestors"]).toEqual(["'none'"]);
  expect(directives["connect-src"]).toEqual(["'self'"]);
  expect(directives["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);

  // script-src: không unsafe-inline, không unsafe-eval — đọc trực tiếp mảng token của
  // riêng directive này, không phải substring trên cả chuỗi CSP.
  expect(directives["script-src"]).not.toContain("'unsafe-inline'");
  expect(directives["script-src"]).not.toContain("'unsafe-eval'");

  // 'unsafe-inline' CHỈ được phép xuất hiện ở style-src — quét TẤT CẢ directive khác và
  // khẳng định không directive nào ngoài style-src chứa nó.
  for (const [name, sources] of Object.entries(directives)) {
    if (name === "style-src") continue;
    expect(sources, `directive "${name}" không được chứa 'unsafe-inline'`).not.toContain(
      "'unsafe-inline'",
    );
  }

  // Không nguồn CDN/origin thứ hai nào ở bất kỳ directive nào: mọi token phải là từ khoá
  // dạng 'xxx', không phải URL/domain (http://, https://, *.example.com, v.v.)
  for (const [name, sources] of Object.entries(directives)) {
    for (const source of sources) {
      expect(source, `directive "${name}" chứa nguồn không phải từ khoá: "${source}"`).toMatch(
        KEYWORD_SOURCE,
      );
    }
  }

  expect(headers["referrer-policy"]).toBe("same-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
}

/** Điều hướng bằng trình duyệt thật (không phải APIRequestContext) — đúng nghĩa đen "bằng
 *  trình duyệt thật, qua reverse proxy thật" của brief — rồi trả về header của phản hồi
 *  tài liệu chính, bất kể status code. */
async function gotoAndGetHeaders(
  page: Page,
  path: string,
): Promise<{ status: number; headers: Record<string, string> }> {
  const response = await page.goto(path);
  expect(response, `page.goto("${path}") không trả về response nào`).not.toBeNull();
  return { status: response!.status(), headers: response!.headers() };
}

test.describe("SC-004 — header an toàn trên CẢ HAI đường dẫn", () => {
  test("đường dẫn bán hàng (/) trả 200 và mang đủ header, CSP đúng từng directive", async ({
    page,
  }) => {
    const { status, headers } = await gotoAndGetHeaders(page, "/");
    expect(status).toBe(200);
    assertSecurityHeaders(headers);
  });

  test("đường dẫn quản trị (/admin/) trả 404 (chưa có bundle ở 000) nhưng VẪN mang đủ header", async ({
    page,
  }) => {
    // Đây là điểm dễ trượt nhất của cấu hình proxy (brief cảnh báo tường minh): lớp phòng
    // thủ phải có mặt TRƯỚC khi có nội dung phía sau /admin/*, không phải sau. Test này
    // khẳng định tường minh trên chính phản hồi lỗi — không giả định 404 "không cần" header.
    const { status, headers } = await gotoAndGetHeaders(page, "/admin/");
    expect(status).toBe(404);
    assertSecurityHeaders(headers);
  });

  test("đường dẫn quản trị không có dấu / cuối (/admin) cũng trả 404 kèm đủ header", async ({
    page,
  }) => {
    // Caddyfile khai matcher riêng cho dạng trần `/admin` (không "/" cuối) vì `/admin/*`
    // không khớp nó — kiểm cả hai dạng để không bỏ sót đường người dùng thật hay gõ.
    const { status, headers } = await gotoAndGetHeaders(page, "/admin");
    expect(status).toBe(404);
    assertSecurityHeaders(headers);
  });
});
