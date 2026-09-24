// apps/api/src/modules/catalog/catalog.module.ts
//
// Hợp đồng bootstrap của T010 (xem `catalog-test-support.ts`) bắt buộc: tiền tố `/api` và
// MỌI pipe/filter/interceptor ảnh hưởng hợp đồng HTTP phải đăng ký BÊN TRONG cây provider của
// `AppModule` (route ở cấp controller — đã làm ở `catalog.controller.ts`/`health.controller.ts`
// — và token `APP_FILTER` của `@nestjs/core`), KHÔNG chỉ bằng `app.useGlobalFilters(...)`
// trong `main.ts`. `APP_FILTER` có hiệu lực TOÀN ỨNG DỤNG bất kể module nào khai nó, miễn
// module đó nằm trong cây `imports` — nên khai ở đây (không phải ở `AppModule`) không làm
// giảm phạm vi.
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { CartLinesController } from './cart-lines.controller';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategoriesController } from './categories.controller';
import { envProvider } from './env.provider';
import { ErrorEnvelopeFilter } from './error-envelope.filter';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { PgPoolLifecycle, pgPoolProvider } from './pg-pool.provider';
import { requestLoggingMiddleware } from './request-logging.middleware';

@Module({
  // `MetricsController` (T014, Ruling R9) — `/api/internal/metrics`, không liên kết từ
  // storefront, chỉ đo thời lượng (xem metrics.controller.ts).
  controllers: [
    CatalogController,
    CategoriesController,
    HealthController,
    MetricsController,
    CartLinesController,
  ],
  providers: [
    envProvider,
    pgPoolProvider,
    PgPoolLifecycle,
    CatalogService,
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
  ],
})
export class CatalogModule implements NestModule {
  // Requirement #9 — log có cấu trúc kèm `request_id` cho MỌI request, không chỉ route của
  // `catalog`. `forRoutes('*')` áp cho toàn ứng dụng dù middleware được khai trong module này.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestLoggingMiddleware).forRoutes('*');
  }
}
