// apps/api/src/modules/catalog/request-logging.middleware.ts
//
// Requirement #9 của brief T011: log có cấu trúc ra stdout kèm `request_id` cho MỖI request.
// T011 SỞ HỮU middleware này (Ruling R8); T014 MỞ RỘNG nó bằng trường thời lượng
// (`duration_ms`, đo từ một mốc thời gian ở đầu hàm tới sự kiện `finish`) và ghi số đo đó vào
// `metrics.store.ts` để `GET /api/internal/metrics` (Ruling R9) tổng hợp p95 — CÙNG một điểm
// ghi log này, không phải một tầng log thứ hai song song. Mọi trường/định dạng T011 đã có
// (`level`, `request_id`, `method`, `path`, `status`, `timestamp`) giữ nguyên tên và vị trí.
//
// Không import kiểu `Request`/`Response`/`NextFunction` từ `express`: không có `@types/express`
// cài trong repo này (ngoài phạm vi dependency được phép trả nợ ở T011 — chỉ `packages/shared`).
// Dùng interface CỤC BỘ, tối thiểu, khớp cấu trúc Express đủ cho những gì middleware này cần.
import { randomUUID } from 'node:crypto';

import { recordRequestDuration } from './metrics.store';

interface MinimalHttpRequest {
  readonly method: string;
  readonly originalUrl?: string;
  readonly url: string;
}

interface MinimalHttpResponse {
  readonly statusCode: number;
  on(event: 'finish', listener: () => void): unknown;
}

type NextFn = () => void;

export function requestLoggingMiddleware(req: MinimalHttpRequest, res: MinimalHttpResponse, next: NextFn): void {
  // `request_id` sinh MỘT LẦN cho mỗi request — không lấy từ header client gửi lên (không có
  // hạ tầng nào ở `000` truyền `request_id` xuyên nhiều dịch vụ để tin tưởng giá trị đó).
  const requestId = randomUUID();
  // Mốc thời gian ở ĐẦU hàm (T014) — `process.hrtime.bigint()` đơn điệu, không bị lệch bởi
  // đồng hồ hệ thống bị chỉnh trong lúc request đang xử lý (khác `Date.now()`).
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const path = req.originalUrl ?? req.url;
    const logLine = {
      level: 'info',
      request_id: requestId,
      method: req.method,
      path,
      status: res.statusCode,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console -- log có cấu trúc ra stdout là chủ ý (Requirement #9).
    console.log(JSON.stringify(logLine));

    // Không đưa chính các lệnh gọi `/api/internal/*` vào mẫu đo — endpoint metrics trả lời
    // cho đường đọc THẬT của storefront/API, tự đưa mình vào mẫu sẽ làm p95 lệch theo tần
    // suất polling của chính nó, không phản ánh đường đọc cần đo.
    if (!path.startsWith('/api/internal/')) {
      recordRequestDuration({ path, method: req.method, durationMs, recordedAt: new Date() });
    }
  });

  next();
}
