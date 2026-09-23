import { describe, it, expect } from "vitest";
import {
  AccountRoleSchema,
  AccountSummarySchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
  CurrentUserResponseSchema,
} from "./auth.js";

describe("Auth Zod Schemas (T003)", () => {
  describe("AccountRoleSchema", () => {
    it("chấp nhận customer và shop_owner", () => {
      expect(AccountRoleSchema.parse("customer")).toBe("customer");
      expect(AccountRoleSchema.parse("shop_owner")).toBe("shop_owner");
    });

    it("từ chối role không hợp lệ", () => {
      expect(() => AccountRoleSchema.parse("admin")).toThrow();
      expect(() => AccountRoleSchema.parse("guest")).toThrow();
      expect(() => AccountRoleSchema.parse("")).toThrow();
    });
  });

  describe("AccountSummarySchema", () => {
    it("validate tài khoản hợp lệ", () => {
      const valid = { id: 1, email: "user@example.com", role: "customer" };
      expect(AccountSummarySchema.parse(valid)).toEqual(valid);
    });

    it("từ chối id không phải số nguyên dương", () => {
      expect(() =>
        AccountSummarySchema.parse({ id: 0, email: "user@example.com", role: "customer" }),
      ).toThrow();
      expect(() =>
        AccountSummarySchema.parse({ id: -1, email: "user@example.com", role: "customer" }),
      ).toThrow();
    });

    it("từ chối email sai định dạng", () => {
      expect(() =>
        AccountSummarySchema.parse({ id: 1, email: "invalid-email", role: "customer" }),
      ).toThrow();
    });
  });

  describe("RegisterRequestSchema", () => {
    it("chuẩn hoá email: trim và hạ chữ thường", () => {
      const parsed = RegisterRequestSchema.parse({
        email: "  Customer@EXAMPLE.com  ",
        password: "password123",
      });
      expect(parsed.email).toBe("customer@example.com");
      expect(parsed.password).toBe("password123");
    });

    it("từ chối mật khẩu dưới 8 ký tự kèm thông báo tiếng Việt", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "user@example.com",
        password: "1234567",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Mật khẩu phải có tối thiểu 8 ký tự");
      }
    });

    it("từ chối mật khẩu vượt quá 128 ký tự", () => {
      const longPassword = "a".repeat(129);
      expect(() =>
        RegisterRequestSchema.parse({
          email: "user@example.com",
          password: longPassword,
        }),
      ).toThrow();
    });

    it("từ chối email không hợp lệ", () => {
      const result = RegisterRequestSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("LoginRequestSchema", () => {
    it("chuẩn hoá email: trim và hạ chữ thường", () => {
      const parsed = LoginRequestSchema.parse({
        email: "  User@domain.vn ",
        password: "anypassword",
      });
      expect(parsed.email).toBe("user@domain.vn");
      expect(parsed.password).toBe("anypassword");
    });

    it("từ chối mật khẩu rỗng", () => {
      expect(() =>
        LoginRequestSchema.parse({
          email: "user@example.com",
          password: "",
        }),
      ).toThrow();
    });
  });

  describe("AuthResponseSchema & CurrentUserResponseSchema", () => {
    it("AuthResponseSchema yêu cầu đối tượng account", () => {
      const data = { account: { id: 1, email: "user@example.com", role: "customer" } };
      expect(AuthResponseSchema.parse(data)).toEqual(data);
      expect(() => AuthResponseSchema.parse({ account: null })).toThrow();
    });

    it("CurrentUserResponseSchema cho phép account là null khi chưa đăng nhập (Guest)", () => {
      expect(CurrentUserResponseSchema.parse({ account: null })).toEqual({ account: null });
      const data = { account: { id: 1, email: "user@example.com", role: "customer" } };
      expect(CurrentUserResponseSchema.parse(data)).toEqual(data);
    });
  });
});
