// apps/api/src/modules/catalog/catalog-test-support.ts
//
// Hạ tầng DÙNG CHUNG cho các contract test HTTP của đường đọc (T010) — KHÔNG chứa logic
// nghiệp vụ `catalog` (không phải file hiện thực, T011 không đụng file này ngoài việc đọc).
//
// File này CHỈ làm một việc: dựng một NestJS application THẬT để supertest gọi qua HTTP
// thật. Nó KHÔNG tự làm lại việc kết nối/dọn PostgreSQL — các spec import thẳng
// `createTestPool`, `assertDatabaseReachable`, `truncateAllTables`, `seedProduct`,
// `seedStock` từ `../stock/stock-test-support.ts` (hạ tầng T008 đã có, đọc không sửa) thay
// vì một bản sao thứ hai ở đây — đúng yêu cầu "tái sử dụng helper, không phát minh một cái
// mới" của task-010-brief.md.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// QUYẾT ĐỊNH THIẾT KẾ RÀNG BUỘC T011 — đọc kỹ trước khi viết `app.module.ts`/`main.ts`:
//
// `createTestApp()` dưới đây làm ĐÚNG VÀ CHỈ:
//   1. `NestFactory.create(AppModule, { logger: false })`
//   2. `app.init()`
// KHÔNG có bước thứ ba nào — không `setGlobalPrefix`, không `useGlobalPipes`, không
// `useGlobalFilters`, không `listen()`. Vì vậy:
//
//   - Tiền tố `/api` PHẢI nằm TRONG `AppModule` (vd. `@Controller('api/products')`, hoặc
//     `RouterModule.register([{ path: 'api', module: CatalogModule }])`) — KHÔNG được chỉ
//     gọi `app.setGlobalPrefix('api')` bên trong `main.ts`. Nếu tiền tố chỉ tồn tại ở
//     `main.ts`, app dựng qua `createTestApp()` sẽ không có nó, và mọi request trong bộ test
//     này (gọi thẳng `/api/products`, `/api/products/:id`, `/api/health`) sẽ 404 nhầm lý do.
//   - Bất kỳ pipe/filter/interceptor nào ảnh hưởng tới HÌNH DẠNG response hay HEADER (vd.
//     exception filter tạo `ErrorEnvelopeSchema` cho lỗi 404, interceptor đặt
//     `Cache-Control: no-store`) PHẢI đăng ký BÊN TRONG `AppModule` bằng provider token của
//     `@nestjs/core` (`APP_FILTER`, `APP_PIPE`, `APP_INTERCEPTOR`) — KHÔNG được đăng ký chỉ
//     bằng `app.useGlobalXxx(...)` trong `main.ts`. Nếu không, hành vi sẽ đúng khi chạy
//     `main.ts` thật nhưng SAI (và không bị bộ test này phát hiện) khi chạy qua harness này.
//   - Nói ngắn gọn: `main.ts` nên chỉ còn `NestFactory.create(AppModule)` + `app.listen(...)`
//     (cộng cấu hình cổng/host). Mọi thứ ảnh hưởng tới hợp đồng HTTP phải sống trong
//     `AppModule` để cả `main.ts` lẫn harness test này tự động có nó, không rẽ nhánh.
//
// KHÔNG dùng `@nestjs/testing` (`Test.createTestingModule`) — package đó không có trong
// node_modules của repo này (không phải dependency đã pin), và brief cấm thêm dependency
// mới. `NestFactory` (từ `@nestjs/core`, đã có sẵn) đủ để dựng app thật cho supertest —
// đây là chính nguyên liệu mà `@nestjs/testing` dùng bên trong nó.
//
// `AppModule` CHƯA TỒN TẠI — `apps/api/src/app.module.ts` là của T011. Import dưới đây CỐ Ý
// trỏ tới file chưa có, để mọi spec import (trực tiếp hoặc gián tiếp) từ file này thất bại
// RÕ RÀNG với "Cannot find module '../../app.module'" (TS2307 / Jest module-not-found) —
// đúng lý do ĐỎ mà T008 đã dùng cho `./stock.service` (task-008-report.md §4). KHÔNG được
// thay bằng một stub/mock `AppModule` để né lỗi này — bị cấm tường minh trong brief.
// ─────────────────────────────────────────────────────────────────────────────────────────
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';

/** Dựng một NestJS application THẬT (không mock, không `@nestjs/testing`) cho một file spec. */
export async function createTestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  return app;
}
