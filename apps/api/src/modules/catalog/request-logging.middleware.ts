// apps/api/src/modules/catalog/request-logging.middleware.ts
//
// Requirement #9 của brief: log có cấu trúc ra stdout kèm `request_id` cho MỖI request. T011
// SỞ HỮU middleware này (Ruling R8); T014 sẽ MỞ RỘNG bằng thời lượng request và endpoint p95
// tổng hợp — vì vậy middleware dưới đây ghi log ở sự kiện `finish` của response (đã biết
// `statusCode` cuối cùng) và không tính/gắn bất kỳ số đo thời lượng nào, để T014 chỉ cần
// CỘNG THÊM một trường (`durationMs`, đo từ một mốc thời gian ở đầu hàm) vào CÙNG một điểm ghi
// log này, không phải thay thế nó.
//
// Không import kiểu `Request`/`Response`/`NextFunction` từ `express`: không có `@types/express`
// cài trong repo này (ngoài phạm vi dependency được phép trả nợ ở T011 — chỉ `packages/shared`).
// Dùng interface CỤC BỘ, tối thiểu, khớp cấu trúc Express đủ cho những gì middleware này cần.
import { randomUUID } from 'node:crypto';

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

  res.on('finish', () => {
    const logLine = {
      level: 'info',
      request_id: requestId,
      method: req.method,
      path: req.originalUrl ?? req.url,
      status: res.statusCode,
      timestamp: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console -- log có cấu trúc ra stdout là chủ ý (Requirement #9).
    console.log(JSON.stringify(logLine));
  });

  next();
}
