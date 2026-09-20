// apps/api/src/app.module.ts
//
// Điểm ghép DUY NHẤT của `apps/api` — sở hữu bởi T011. Bản thân module này chỉ import
// `CatalogModule`; mọi hành vi ảnh hưởng hợp đồng HTTP (tiền tố `/api`, exception filter,
// header `Cache-Control`, middleware log) đã đăng ký BÊN TRONG `CatalogModule` (bắt buộc theo
// hợp đồng bootstrap của T010 — xem `modules/catalog/catalog-test-support.ts` và
// `modules/catalog/catalog.module.ts`), nên `AppModule` không cần biết chi tiết đó.
//
// `createTestApp()` (T010) dựng đúng `NestFactory.create(AppModule, { logger: false })` +
// `app.init()` — không `setGlobalPrefix`, không `useGlobalPipes/Filters`, không `listen()` —
// nên mọi thứ import ở đây phải tự đủ để app hoạt động đúng khi KHÔNG có ba bước đó.
import { Module } from '@nestjs/common';

import { CatalogModule } from './modules/catalog/catalog.module';

@Module({
  imports: [CatalogModule],
})
export class AppModule {}
