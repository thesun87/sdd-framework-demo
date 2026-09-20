// apps/api/src/modules/catalog/error-envelope.filter.ts
//
// Exception filter TOÀN CỤC (đăng ký qua token `APP_FILTER` ở `catalog.module.ts`, KHÔNG chỉ
// `app.useGlobalFilters(...)` trong `main.ts` — bắt buộc theo hợp đồng bootstrap của T010,
// xem `catalog-test-support.ts`) — biến MỌI exception thành đúng hình dạng
// `common.ErrorEnvelopeSchema` của `packages/shared`: `{ error: { code, message } }`.
//
// Yêu cầu #6 của brief: "Không stack trace ra client, không thông điệp nội bộ của framework,
// ở BẤT KỲ mã lỗi nào" — kể cả lỗi không lường trước (500). Với exception không phải
// `HttpException` (lỗi driver `pg`, lỗi lập trình, v.v.), filter KHÔNG BAO GIỜ đưa
// `exception.message`/`exception.stack` ra response — chỉ log THÔ ra stdout (cho vận hành
// viên đọc, không phải cho client) rồi trả một thông điệp an toàn cố định.
//
// Không import kiểu `Request`/`Response` từ `express`: package `express` không có
// `@types/express` cài trong repo này (không phải dependency đã pin của `apps/api`, thêm nó
// ngoài phạm vi Allowed của T011 — chỉ `packages/shared` là khoản nợ dependency được phép trả
// ở task này). Dùng interface CỤC BỘ, tối thiểu, khớp cấu trúc Express đủ cho hai lệnh gọi
// cần dùng (`status().json()`), tránh phụ thuộc không cần thiết.
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';

interface MinimalHttpResponse {
  status(code: number): MinimalHttpResponse;
  json(body: unknown): void;
}

interface ErrorBody {
  readonly code: string;
  readonly message: string;
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    typeof (value as Record<string, unknown>).message === 'string'
  );
}

function isMessageBody(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>).message === 'string'
  );
}

const DEFAULT_CODE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

const DEFAULT_MESSAGE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Yêu cầu không hợp lệ.',
  [HttpStatus.NOT_FOUND]: 'Không tìm thấy tài nguyên.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Đã có lỗi ở máy chủ. Vui lòng thử lại sau.',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Dịch vụ hiện không sẵn sàng.',
};

@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<MinimalHttpResponse>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = DEFAULT_CODE_BY_STATUS[status] ?? 'ERROR';
    let message = DEFAULT_MESSAGE_BY_STATUS[status] ?? 'Đã có lỗi xảy ra.';

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (isErrorBody(body)) {
        // Exception tự khai đúng hình dạng envelope (vd. ProductNotFoundException) — dùng
        // nguyên văn, không phải thông điệp nội bộ của framework.
        code = body.code;
        message = body.message;
      } else if (typeof body === 'string') {
        message = body;
      } else if (isMessageBody(body)) {
        message = body.message;
      }
    } else {
      // KHÔNG đưa exception.message/exception.stack ra client — chỉ log THÔ ra stdout để vận
      // hành viên đọc (structured, không phải để hiển thị). Response tới client luôn dùng
      // thông điệp an toàn cố định ở trên.
      // eslint-disable-next-line no-console -- log có cấu trúc ra stdout là chủ ý (§Consistency).
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'Lỗi không mong đợi ở đường đọc catalog',
          error: exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
          timestamp: new Date().toISOString(),
        }),
      );
    }

    response.status(status).json({ error: { code, message } });
  }
}
