// apps/api/jest.config.js — cấu hình Jest 30.4.2 cho apps/api (T008).
//
// Thay cho khối "jest" từng nhúng trong package.json (T001) — chuyển hẳn sang file
// jest.config.* để chạy được *.int-spec.ts và *.race-spec.ts (T004+ áp lược đồ database
// thật; T008 thêm bốn test chạm database này).
//
// maxWorkers: 1 — race-spec (task-008-brief.md §Luật cô lập, AD-28) KHÔNG được chạy song
// song với các file test khác chạm cùng năm bảng (mọi test hiện có trong apps/api ĐỀU chạm
// DB, dùng TRUNCATE để dọn dẹp). Cách đơn giản và an toàn nhất với bộ test hiện tại là chạy
// TOÀN BỘ file test tuần tự trong một worker duy nhất — không file nào (kể cả race-spec)
// chạy song song với file khác. Song song *bên trong* race-spec (N kết nối `pg` độc lập
// trong Promise.allSettled, xem stock-conditional-delta.race-spec.ts) không bị ảnh hưởng —
// đó là song song ở tầng connection, không phải song song ở tầng Jest worker.
// Nếu sau này thêm unit test thuần (không chạm DB) vào apps/api, đây là điểm cần xét lại
// (ví dụ: Jest "projects" tách riêng test chạm DB khỏi test thuần) — ngoài phạm vi T008.
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '\\.(spec|int|race)(-spec)?\\.ts$',
  maxWorkers: 1,
  testTimeout: 30_000,
  // T010 — cho phép Jest require() được `packages/shared` (AD-10: schema hợp đồng HTTP
  // DUY NHẤT nằm ở đó, contract test không được khai lại hình dạng). `packages/shared` là
  // ESM thuần (package.json#type=module, build ra `dist/**/*.js` chỉ chứa `export`/`import`);
  // `apps/api` là CommonJS. `tsc` (lint/build) đọc `dist/index.d.ts` bình thường (chỉ là một
  // khai báo kiểu, không phải input cần biên dịch) nên KHÔNG bị ảnh hưởng — vấn đề CHỈ xảy ra
  // lúc CHẠY test: Jest tự thực hiện `require()` bằng module system RIÊNG của nó (không phải
  // `require()` gốc của Node), nên khả năng "require(esm)" của Node 22+ không áp dụng được ở
  // đây, và cú pháp `export * as storefront from "..."` trong `dist/**/*.js` khiến Jest ném
  // "Unexpected token 'export'" vì preset `ts-jest` mặc định chỉ transform `.ts`/`.tsx`, không
  // transform `.js`. Entry dưới đây thêm ĐÚNG MỘT transform CHỈ khớp các file `.js` đã build
  // của `packages/shared` (không khớp `.js` của bất kỳ package nào khác trong node_modules —
  // không nới lỏng gì thêm), dùng `ts-jest` sẵn có (KHÔNG thêm dependency mới) với
  // `allowJs: true` để biên dịch chúng sang CommonJS ngay trước khi Jest require(). Merge với
  // `transform` mặc định của preset `ts-jest` (Jest merge, không ghi đè, hai key khác pattern).
  transform: {
    'packages/shared/dist/.+\\.js$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: { allowJs: true, module: 'CommonJS' } },
    ],
  },
};
