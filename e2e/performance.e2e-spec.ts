// T014 — SC-003: đo và khẳng định hai ngưỡng p95 của PRD §8 bằng trình duyệt/HTTP thật, qua
// reverse proxy thật (baseURL trong playwright.config.ts — file của T013, KHÔNG sửa ở đây).
//
// Ngưỡng dưới đây chép ĐÚNG NGUYÊN VĂN PRD — không nới, không bỏ khẳng định, không đo thứ dễ
// hơn nếu hệ thống không đạt (Requirement #5 của task-014-brief.md):
//   - trang chủ hiển thị xong ở p95 ≤ 1500 ms;
//   - đường đọc API (GET /api/products — chính là nguồn dữ liệu trang chủ gọi để render danh
//     sách sản phẩm) trả lời ở p95 ≤ 400 ms.
//
// File này là file MỚI DUY NHẤT được thêm vào `e2e/` (Ruling R8b) — không sửa
// `security-headers.e2e-spec.ts`/`storefront-journey.e2e-spec.ts` (T013 sở hữu).
import { test, expect } from "@playwright/test";

/**
 * p95 kiểu "nearest-rank": sắp tăng dần rồi lấy phần tử ở vị trí ceil(0.95 * n) − 1 (0-based).
 * CÙNG một công thức với `apps/api/src/modules/catalog/metrics.store.ts` (phía server) — để
 * số đo phía trình duyệt/HTTP ở đây và số đo tổng hợp qua `/api/internal/metrics` không lệch
 * nhau chỉ vì khác định nghĩa percentile.
 */
function p95(durationsMs: number[]): number {
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const rank = Math.ceil(0.95 * sorted.length) - 1;
  const index = Math.min(Math.max(rank, 0), sorted.length - 1);
  return sorted[index];
}

// 30 lần ĐIỀU HƯỚNG TRÌNH DUYỆT THẬT (full navigation, chờ sự kiện `load`) cho trang chủ.
// Lý do chọn 30, không phải 1: một mẫu duy nhất không có "phân vị" nào cả — p95 chỉ có nghĩa
// khi có đủ mẫu để 5% "tệ nhất" tách biệt được khỏi phần còn lại. Với n=30, bước nhảy giữa
// các mẫu liền kề khi sắp xếp là 1/30 ≈ 3,3% — mịn hơn ngưỡng 5% của định nghĩa p95, và vẫn
// chạy xong trong một test Playwright (mỗi lần điều hướng trang chủ walking-skeleton này chỉ
// vài trăm ms trên máy dev cục bộ — xem số đo thật trong task-014-report.md).
const HOME_PAGE_SAMPLE_SIZE = 30;

// 50 lần GỌI HTTP THẲNG (không qua trình duyệt, qua `request` fixture — vẫn qua proxy thật vì
// dùng chung `baseURL`) tới đường đọc API. Một lệnh gọi HTTP rẻ hơn nhiều một navigation trình
// duyệt đầy đủ, nên lấy mẫu lớn hơn cho bước nhảy percentile mịn hơn nữa (1/50 = 2%).
const API_SAMPLE_SIZE = 50;

test.describe("SC-003 — ngưỡng hiệu năng PRD §8 (bằng số đo thật, không phải một request)", () => {
  test(`trang chủ hiển thị xong ở p95 ≤ 1500ms (n=${HOME_PAGE_SAMPLE_SIZE} lần điều hướng thật)`, async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const durationsMs: number[] = [];
    for (let i = 0; i < HOME_PAGE_SAMPLE_SIZE; i += 1) {
      const startedAt = Date.now();
      // `waitUntil: "load"` — chờ đúng sự kiện `load` (mọi tài nguyên trang chủ, kể cả ảnh,
      // đã tải xong), khớp nghĩa "hiển thị xong" của PRD, không dừng sớm ở `domcontentloaded`.
      const response = await page.goto("/", { waitUntil: "load" });
      durationsMs.push(Date.now() - startedAt);
      expect(response?.status(), `lần lặp #${i}: page.goto("/") không trả 200`).toBe(200);
    }

    const measuredP95 = p95(durationsMs);
    // In số đo thật ra output test — bằng chứng cho report, không chỉ pass/fail (Requirement #4).
    // eslint-disable-next-line no-console -- bằng chứng số đo thật, cố ý in ra stdout của test.
    console.log(
      `[SC-003][trang chủ] n=${durationsMs.length} p95=${measuredP95.toFixed(1)}ms ` +
        `min=${Math.min(...durationsMs).toFixed(1)}ms max=${Math.max(...durationsMs).toFixed(1)}ms ` +
        `mẫu=${JSON.stringify(durationsMs.map((d) => Math.round(d)))}`,
    );

    expect(
      measuredP95,
      `p95 trang chủ đo được ${measuredP95.toFixed(1)}ms, vượt ngưỡng PRD 1500ms`,
    ).toBeLessThanOrEqual(1500);
  });

  test(`đường đọc API GET /api/products ở p95 ≤ 400ms (n=${API_SAMPLE_SIZE} lần gọi thật)`, async ({
    request,
  }) => {
    test.setTimeout(60_000);

    const durationsMs: number[] = [];
    for (let i = 0; i < API_SAMPLE_SIZE; i += 1) {
      const startedAt = Date.now();
      const response = await request.get("/api/products");
      durationsMs.push(Date.now() - startedAt);
      expect(response.status(), `lần lặp #${i}: GET /api/products không trả 200`).toBe(200);
    }

    const measuredP95 = p95(durationsMs);
    // eslint-disable-next-line no-console -- bằng chứng số đo thật, cố ý in ra stdout của test.
    console.log(
      `[SC-003][GET /api/products] n=${durationsMs.length} p95=${measuredP95.toFixed(1)}ms ` +
        `min=${Math.min(...durationsMs).toFixed(1)}ms max=${Math.max(...durationsMs).toFixed(1)}ms ` +
        `mẫu=${JSON.stringify(durationsMs.map((d) => Math.round(d)))}`,
    );

    expect(
      measuredP95,
      `p95 API đo được ${measuredP95.toFixed(1)}ms, vượt ngưỡng PRD 400ms`,
    ).toBeLessThanOrEqual(400);
  });

  test("GET /api/internal/metrics trả p95 hợp lệ và KHÔNG lộ dữ liệu tồn kho/khách hàng (Ruling R9)", async ({
    request,
  }) => {
    // Tạo thêm vài request thật ngay trước khi đọc, để endpoint chắc chắn có mẫu của "hôm
    // nay" kể cả khi test này được chạy độc lập (vd `playwright test -g metrics`), không phụ
    // thuộc thứ tự chạy trước hai test bên trên trong cùng file.
    for (let i = 0; i < 5; i += 1) {
      await request.get("/api/products");
    }

    const response = await request.get("/api/internal/metrics");
    expect(response.status()).toBe(200);

    const body: unknown = await response.json();
    const rawBody = JSON.stringify(body);
    // eslint-disable-next-line no-console -- bằng chứng output thật của endpoint (yêu cầu acceptance).
    console.log(`[SC-003][GET /api/internal/metrics] ${rawBody}`);

    expect(body).toMatchObject({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      sampleSize: expect.any(Number),
      p95DurationMs: expect.any(Number),
      minDurationMs: expect.any(Number),
      maxDurationMs: expect.any(Number),
    });
    expect((body as { sampleSize: number }).sampleSize).toBeGreaterThan(0);

    // Ruling R9 — endpoint chỉ số đo thời lượng, không bao giờ số tồn kho hay dữ liệu khách
    // hàng. Quét THẲNG trên JSON thật trả về (không chỉ trên mã nguồn) để bắt cả trường hợp
    // một bản vá sau này vô tình thêm trường rò rỉ vào response.
    expect(rawBody).not.toMatch(/quantity/i);
    expect(rawBody).not.toMatch(/stock/i);
    expect(rawBody).not.toMatch(/email|phone|customer|address/i);
  });
});
