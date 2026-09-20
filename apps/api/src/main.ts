// apps/api/src/main.ts
//
// Điểm vào THẬT của `apps/api` (thay placeholder của T001). Theo đúng hợp đồng bootstrap của
// T010 (`modules/catalog/catalog-test-support.ts`): mọi thứ ảnh hưởng HÌNH DẠNG/HEADER của
// HTTP contract sống BÊN TRONG `AppModule`/`CatalogModule` (tiền tố `/api`, exception filter,
// `Cache-Control`, middleware log) — file này chỉ còn dựng app thật và lắng nghe cổng, không
// gọi `setGlobalPrefix`/`useGlobalPipes`/`useGlobalFilters`.
//
// Cổng lắng nghe đọc từ `Env` đã validate MỘT LẦN qua DI (`app.get(ENV)`) — KHÔNG gọi lại
// `config.loadEnv(process.env)` ở đây lần thứ hai (Requirement #10: "validate MỘT LẦN lúc
// khởi động"); `envProvider` (factory Nest, singleton) đã là nơi validate duy nhất.
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ENV, type AppEnv } from './modules/catalog/env.provider';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const env = app.get<AppEnv>(ENV);
  await app.listen(env.API_PORT);
}

void bootstrap();
