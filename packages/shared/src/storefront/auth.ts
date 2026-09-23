import { z } from "zod";

/**
 * Vai trò tài khoản người dùng theo glossary.md:
 * - `customer`: Khách hàng tự đăng ký
 * - `shop_owner`: Chủ shop duy nhất được tạo sẵn từ seed
 */
export const AccountRoleSchema = z.enum(["customer", "shop_owner"]);
export type AccountRole = z.infer<typeof AccountRoleSchema>;

/**
 * Tóm tắt tài khoản trả về cho client sau khi xác thực thành công.
 */
export const AccountSummarySchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: AccountRoleSchema,
});
export type AccountSummary = z.infer<typeof AccountSummarySchema>;

/**
 * Hợp đồng payload đăng ký tài khoản khách hàng (POST /api/auth/register).
 * AD-6: email là định danh, hạ chữ thường và cắt khoảng trắng.
 * FR-002: mật khẩu tối thiểu 8 ký tự.
 */
export const RegisterRequestSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Email không đúng định dạng").max(255)),
  password: z
    .string()
    .min(8, "Mật khẩu phải có tối thiểu 8 ký tự")
    .max(128, "Mật khẩu tối đa 128 ký tự"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * Hợp đồng payload đăng nhập (POST /api/auth/login).
 */
export const LoginRequestSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Email không đúng định dạng").max(255)),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Response sau khi đăng ký hoặc đăng nhập thành công.
 */
export const AuthResponseSchema = z.object({
  account: AccountSummarySchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Response kiểm tra phiên hiện tại (GET /api/auth/me).
 * Trả về account hoặc null nếu là Guest / phiên hết hạn.
 */
export const CurrentUserResponseSchema = z.object({
  account: AccountSummarySchema.nullable(),
});
export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
