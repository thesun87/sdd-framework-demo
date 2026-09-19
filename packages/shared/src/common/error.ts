import { z } from "zod";

/**
 * Envelope lỗi DUY NHẤT cho mọi lỗi HTTP của feature này (AD-10).
 *
 * Dùng chung cho cả hai không gian tên `storefront` và `backoffice` — đây gần như là
 * hình dạng duy nhất ở feature 000 mà cả hai bề mặt cần ở cùng một dạng, nên nó nằm ở
 * `common`, không nằm riêng trong `storefront` hay `backoffice` (xem task-006-brief.md,
 * Requirements #1).
 *
 * Không bao giờ chứa stack trace hay thông điệp nội bộ của framework — chỉ `code` ổn định
 * để client rẽ nhánh và `message` để hiển thị. 404 của `GET /api/products/:id` (FR-004)
 * dùng chính schema này.
 */
export const ErrorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        details: z.unknown().optional(),
      })
      .strict(),
  })
  .strict();

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/**
 * Biến thể của `ErrorEnvelopeSchema` cho khi một lỗi cụ thể cần payload `details` có kiểu
 * rõ ràng thay vì `unknown` — "chỗ cho payload lỗi có kiểu" mà Requirements #4 yêu cầu,
 * không cần khai một envelope hoàn toàn mới cho từng trường hợp.
 */
export function createErrorEnvelopeSchema<TDetails extends z.ZodTypeAny>(
  detailsSchema: TDetails,
) {
  return z
    .object({
      error: z
        .object({
          code: z.string().min(1),
          message: z.string().min(1),
          details: detailsSchema,
        })
        .strict(),
    })
    .strict();
}
