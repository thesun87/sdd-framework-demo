// db/drizzle.config.ts — cấu hình Drizzle Kit 0.31.10 (AD-25: migration tuần tự, chỉ tiến,
// áp từ MỘT nơi duy nhất bằng `drizzle-kit migrate`, trước khi app khởi động).
//
// Chuỗi kết nối đọc từ DATABASE_URL — tên biến đã chốt ở T002 (Ruling R4). Không đặt tên khác.
// `db:generate` (sinh migration từ lược đồ TypeScript) và `db:migrate` (áp migration, script
// duy nhất trong package.json gốc) đều dùng đúng file cấu hình này.

import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL chưa được set — xem ops/.env.example.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  // Tên file migration mang dấu thời gian, không phải số đếm (yêu cầu T004).
  migrations: {
    prefix: 'timestamp',
  },
});
