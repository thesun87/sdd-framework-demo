// Cấu hình tối thiểu cho T001 — chỉ đủ để `vite build` và `vitest run` chạy thật.
// `defineConfig` từ "vitest/config" gộp kiểu của Vite lẫn Vitest nên `tsc --noEmit`
// không báo lỗi thiếu trường `test`.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // AD-9: bundle riêng của storefront — thư mục output riêng, không lẫn với bất kỳ
    // workspace nào khác (kể cả `apps/backoffice` khi nó xuất hiện ở feature 006). Đây là
    // giá trị mặc định của Vite (tương đối so với `apps/storefront`), khai tường minh ở đây
    // để không ai đổi nhầm thành thư mục dùng chung sau này.
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
  },
});
