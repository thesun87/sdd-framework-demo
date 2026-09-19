// Cấu hình tối thiểu cho T001 — chỉ đủ để `vite build` và `vitest run` chạy thật.
// `defineConfig` từ "vitest/config" gộp kiểu của Vite lẫn Vitest nên `tsc --noEmit`
// không báo lỗi thiếu trường `test`.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});
