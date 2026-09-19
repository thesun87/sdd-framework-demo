// Cấu hình tối thiểu cho T001 — chỉ đủ để `playwright test --pass-with-no-tests` chạy thật.
// T013 (sở hữu test e2e đầu tiên) sẽ bổ sung baseURL/projects khi có storefront thật để trỏ tới.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
});
