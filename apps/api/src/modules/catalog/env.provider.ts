// apps/api/src/modules/catalog/env.provider.ts
//
// Điểm ĐỌC `process.env` DUY NHẤT của `apps/api` (Requirement #10 — "không đọc process.env
// rải rác trong mã"). Validate cấu hình triển khai MỘT LẦN lúc khởi động bằng schema của
// `packages/shared` (`config.EnvSchema`/`config.loadEnv`, T006) — không tự suy diễn lại hình
// dạng `Env`.
//
// "Một lần" ở đây nghĩa là: Nest provider mặc định là singleton trong phạm vi một cây DI, và
// `envProvider` chỉ được list MỘT LẦN (ở `catalog.module.ts`) — factory bên dưới chạy đúng
// một lần cho mỗi lần `NestFactory.create(AppModule)` dựng lại toàn bộ cây provider, bất kể
// gọi từ `main.ts` (chạy thật) hay từ `createTestApp()` của T010 (test). `main.ts` KHÔNG tự
// gọi `config.loadEnv` lần thứ hai — nó đọc `Env` đã validate qua DI bằng `app.get(ENV)`.
import type { Provider } from '@nestjs/common';
import { config } from 'shared';

export type AppEnv = ReturnType<typeof config.loadEnv>;

export const ENV = Symbol('ENV');

export const envProvider: Provider = {
  provide: ENV,
  useFactory: (): AppEnv => config.loadEnv(process.env),
};
