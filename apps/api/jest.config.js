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
  testRegex: '\\.(int|race)-spec\\.ts$',
  maxWorkers: 1,
  testTimeout: 30_000,
};
