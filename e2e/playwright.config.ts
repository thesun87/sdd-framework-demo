// Cấu hình Playwright cho các test e2e/*.e2e-spec.ts (T013). `baseURL` trỏ THẲNG vào
// reverse proxy thật (ops/Caddyfile, cổng 80 theo ops/compose.yaml — T002) — MỘT origin duy
// nhất (AD-8), không trỏ vào Vite dev server và không trỏ thẳng vào API. Bằng chứng header
// an toàn (SC-004) chỉ có nghĩa khi request thật sự đi qua lớp phòng thủ mà proxy phát ra.
import { defineConfig, devices } from "@playwright/test";

const PROXY_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost";

export default defineConfig({
  testDir: ".",
  // Tên file test theo brief là `*.e2e-spec.ts` — KHÔNG khớp mặc định `*.spec.ts` của
  // Playwright, nên phải khai `testMatch` tường minh, nếu không hai file này bị bỏ qua
  // hoàn toàn mà `playwright test --pass-with-no-tests` vẫn báo xanh (dương tính giả).
  testMatch: "**/*.e2e-spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: PROXY_BASE_URL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
