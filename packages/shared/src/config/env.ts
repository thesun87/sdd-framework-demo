import { z } from "zod";

/**
 * Bốn tên biến môi trường đã chốt ở T002 (Ruling R4) — không thêm, không đổi tên.
 * Ý nghĩa và ràng buộc triển khai của từng biến nằm ở `ops/.env.example` (bản kê duy nhất).
 *
 * Package này KHÔNG tự đọc `process.env` — nó chỉ cung cấp schema và hàm validate.
 * `apps/api` (và các workspace khác cần cấu hình) gọi `loadEnv(process.env)` MỘT LẦN lúc
 * khởi động (architecture.md §Consistency).
 */
export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL là bắt buộc"),
  API_PORT: z
    .string()
    .min(1, "API_PORT là bắt buộc")
    .regex(/^\d+$/, "API_PORT phải là chuỗi số nguyên dương")
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.int().positive()),
  NODE_ENV: z.enum(["development", "production"]),
  PRODUCT_IMAGE_PATH: z.string().min(1, "PRODUCT_IMAGE_PATH là bắt buộc"),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validate cấu hình triển khai. Ném lỗi rõ ràng (liệt kê từng biến thiếu/sai định dạng)
 * thay vì để chương trình chạy tiếp với cấu hình một phần.
 */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(gốc)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Cấu hình triển khai không hợp lệ — ${detail}`);
  }
  return result.data;
}
