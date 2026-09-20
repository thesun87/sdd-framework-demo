// apps/api/src/modules/catalog/metrics.controller.ts
//
// `GET /api/internal/metrics` (T014, Ruling R9) — endpoint NỘI BỘ trả lời "p95 hôm nay bao
// nhiêu" cho đường đọc HTTP của toàn ứng dụng (thời lượng do `request-logging.middleware.ts`
// đo, tổng hợp qua `metrics.store.ts`). KHÔNG liên kết từ storefront (`apps/storefront/**`
// không tham chiếu đường dẫn này). KHÔNG chứa số tồn kho hay dữ liệu khách hàng — chỉ số đo
// thời lượng (`MetricsSnapshot`), không một trường nào lấy từ `stock`/`catalog` nghiệp vụ.
// Việc chặn đường dẫn này ở tầng reverse proxy hoãn sang feature sau (đã ghi ở ledger) —
// không sửa `ops/Caddyfile` (T003 sở hữu).
import { Controller, Get } from '@nestjs/common';

import { getTodayMetrics, type MetricsSnapshot } from './metrics.store';

@Controller('api/internal/metrics')
export class MetricsController {
  @Get()
  getMetrics(): MetricsSnapshot {
    return getTodayMetrics();
  }
}
