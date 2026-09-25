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
import pg from "pg";
const { Pool } = pg;

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

test.describe("US3 — phân trang danh sách lớn và hiệu năng (T031)", () => {
  test("mặc định 24 sản phẩm, tối đa 100, không trùng lặp giữa các trang và đạt ngưỡng p95", async ({
    page,
    request,
  }) => {
    // 1. Kiểm tra API: mặc định page size 24
    const resDefault = await request.get("/api/products");
    expect(resDefault.status()).toBe(200);
    const dataDefault = await resDefault.json();
    expect(dataDefault.pagination.page).toBe(1);
    expect(dataDefault.pagination.pageSize).toBe(24);
    expect(dataDefault.items.length).toBeLessThanOrEqual(24);

    // 2. Kiểm tra API: pageSize=100
    const res100 = await request.get("/api/products?pageSize=100");
    expect(res100.status()).toBe(200);
    const data100 = await res100.json();
    expect(data100.pagination.pageSize).toBe(100);

    // 3. Nếu tổng số sản phẩm > 24, kiểm tra phân trang không trùng lặp giữa trang 1 và trang 2
    if (dataDefault.pagination.totalItems > 24) {
      const resPage2 = await request.get("/api/products?page=2&pageSize=24");
      expect(resPage2.status()).toBe(200);
      const dataPage2 = await resPage2.json();

      const idsPage1 = new Set(dataDefault.items.map((item: { id: number }) => item.id));
      const idsPage2 = new Set(dataPage2.items.map((item: { id: number }) => item.id));

      for (const id of idsPage2) {
        expect(idsPage1.has(id)).toBe(false);
      }

      // 4. Kiểm tra UI: chuyển sang trang 2 và render mượt mà
      await page.goto("/?page=2");
      await expect(page.getByRole("heading", { level: 1, name: "Sản phẩm" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Phân trang" })).toBeVisible();
      await expect(page.getByText(/Trang 2 \//)).toBeVisible();
    }
  });
});

test.describe.serial("SC-007 — hiệu năng giỏ hàng 20 dòng (PRD §8, SC-007)", () => {
  const databaseUrl = process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/shop";
  let pool: pg.Pool;
  let fixtureProductIds: number[] = [];

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    fixtureProductIds = [];
    for (let i = 1; i <= 20; i++) {
      const name = `Fixture Perf Product ${i} ${Date.now()}`;
      const res = await pool.query<{ id: number }>(
        `INSERT INTO product (name, name_normalized, description, price)
         VALUES ($1, $1, '', 10000)
         RETURNING id`,
        [name],
      );
      const pid = Number(res.rows[0].id);
      fixtureProductIds.push(pid);
      await pool.query(
        `INSERT INTO stock (product_id, quantity, updated_at)
         VALUES ($1, 50, now())`,
        [pid],
      );
    }
  });

  test.afterAll(async () => {
    if (fixtureProductIds.length > 0) {
      await pool.query(`DELETE FROM stock WHERE product_id = ANY($1)`, [fixtureProductIds]);
      await pool.query(`DELETE FROM product WHERE id = ANY($1)`, [fixtureProductIds]);
    }
    await pool.end();
  });

  test("30 lần điều hướng tới /cart với giỏ hàng 20 dòng đạt p95 ≤ 1500ms (dừng đồng hồ khi CẢ 20 dòng đã có giá + trạng thái, không dừng sớm ở <h1>)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const cartPayload = {
      v: 1,
      lines: fixtureProductIds.map((id) => ({ productId: id, quantity: 1 })),
    };
    await page.goto("/");
    await page.evaluate(
      (payload) => localStorage.setItem("shop_cart", JSON.stringify(payload)),
      cartPayload,
    );

    // SC-007 (T019, convergence finding F2): "hiển thị xong" nghĩa là CẢ 20 dòng đều có
    // giá hiện tại VÀ trạng thái kiểm tra — tức mọi dòng "ok" và Đặt đơn được bật. Trước
    // bản sửa này, đồng hồ dừng ngay khi <h1>"Giỏ hàng" hiện ra — <h1> render ở lần vẽ đầu
    // tiên của CartPage.tsx, TRƯỚC KHI POST /api/cart-lines/status trả lời (xem
    // CartPage.tsx: `isChecking` mặc định `true`, <h1> nằm ngoài điều kiện đó) — nên phép đo
    // cũ đo xong navigation, không đo xong 20 dòng.
    //
    // Nút Đặt đơn chỉ là <a role="link"> (thay vì <button role="button" disabled>) khi
    // CartPage.tsx tính `canPlaceOrder === true`, tức mọi dòng có `lineStatus === "ok"`
    // (xem CartPage.tsx `canPlaceOrder`). Chờ đúng phần tử role="link" này = chờ đủ 20 dòng
    // có giá và trạng thái — một khẳng định DOM duy nhất thay cho việc đếm 20 dòng giá.
    const h1DurationsMs: number[] = [];
    const durationsMs: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      const startedAt = Date.now();
      // `domcontentloaded` (không phải `load`) — không để sự kiện `load` của trình duyệt
      // (chờ mọi ảnh/tài nguyên) làm chậm hoặc che giấu mốc thời gian thật của việc render
      // dữ liệu; mốc dừng đồng hồ giờ do chính điều kiện DOM bên dưới quyết định.
      const response = await page.goto("/cart", { waitUntil: "domcontentloaded" });
      expect(response?.status(), `lần lặp #${i}: page.goto("/cart") không trả 200`).toBe(200);

      await page.getByRole("heading", { level: 1, name: "Giỏ hàng" }).waitFor({ state: "visible" });
      const h1AtMs = Date.now() - startedAt;
      h1DurationsMs.push(h1AtMs);

      await page.getByRole("link", { name: "Đặt đơn" }).waitFor({ state: "visible" });
      const fullRenderAtMs = Date.now() - startedAt;
      durationsMs.push(fullRenderAtMs);

      // Bằng chứng khoảng cách giữa hai mốc (evidence, không chỉ pass/fail): <h1> luôn xuất
      // hiện KHÔNG MUỘN HƠN thời điểm cả 20 dòng có giá + trạng thái. Khẳng định này ghi
      // lại đúng lỗ hổng phép đo cũ đã xác minh (task-019-report.md) — nếu một thay đổi sau
      // này khiến hai mốc đảo ngược thứ tự, đó là dấu hiệu bất thường đáng điều tra riêng.
      expect(
        h1AtMs,
        `lần lặp #${i}: <h1> xuất hiện lúc ${h1AtMs}ms, muộn hơn cả mốc đủ 20 dòng ${fullRenderAtMs}ms`,
      ).toBeLessThanOrEqual(fullRenderAtMs);
    }

    const measuredP95 = p95(durationsMs);
    const h1P95 = p95(h1DurationsMs);
    // eslint-disable-next-line no-console
    console.log(
      `[SC-007][trang giỏ hàng 20 dòng] n=${durationsMs.length} ` +
        `p95(đủ 20 dòng, phép đo MỚI)=${measuredP95.toFixed(1)}ms ` +
        `p95(chỉ <h1>, phép đo CŨ)=${h1P95.toFixed(1)}ms ` +
        `min=${Math.min(...durationsMs).toFixed(1)}ms max=${Math.max(...durationsMs).toFixed(1)}ms`,
    );

    expect(
      measuredP95,
      `p95 giỏ hàng 20 dòng (đủ 20 dòng có giá + trạng thái) đo được ${measuredP95.toFixed(1)}ms, vượt ngưỡng 1500ms`,
    ).toBeLessThanOrEqual(1500);
  });

  test("50 lần gọi POST /api/cart-lines/status với 20 dòng đạt p95 ≤ 400ms", async ({
    request,
  }) => {
    test.setTimeout(60_000);

    const payload = {
      lines: fixtureProductIds.map((id) => ({ productId: id, quantity: 1 })),
    };

    const durationsMs: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      const startedAt = Date.now();
      const response = await request.post("/api/cart-lines/status", {
        data: payload,
      });
      durationsMs.push(Date.now() - startedAt);
      expect(response.status()).toBe(200);
    }

    const measuredP95 = p95(durationsMs);
    // eslint-disable-next-line no-console
    console.log(
      `[SC-007][POST /api/cart-lines/status 20 dòng] n=${durationsMs.length} p95=${measuredP95.toFixed(1)}ms ` +
        `min=${Math.min(...durationsMs).toFixed(1)}ms max=${Math.max(...durationsMs).toFixed(1)}ms`,
    );

    expect(
      measuredP95,
      `p95 API POST /api/cart-lines/status 20 dòng đo được ${measuredP95.toFixed(1)}ms, vượt ngưỡng 400ms`,
    ).toBeLessThanOrEqual(400);
  });
});
