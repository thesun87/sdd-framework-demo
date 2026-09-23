import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { register, login, logout, getCurrentUser } from "./auth-client.js";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("auth-client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("register", () => {
    it("gửi request POST /api/auth/register với credentials same-origin và cache no-store", async () => {
      const mockAccount = { id: 1, email: "khach@example.com", role: "customer" as const };
      fetchMock.mockResolvedValueOnce(jsonResponse({ account: mockAccount }, { status: 201 }));

      const result = await register({ email: "khach@example.com", password: "Password123!" });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }),
      );

      expect(result).toEqual({
        kind: "ok",
        data: { account: mockAccount },
      });
    });

    it("xử lý lỗi 409 conflict email đã tồn tại", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { code: "EMAIL_ALREADY_EXISTS", message: "Email này đã được đăng ký tài khoản." },
          { status: 409 },
        ),
      );

      const result = await register({ email: "trung@example.com", password: "Password123!" });

      expect(result).toEqual({
        kind: "error",
        code: "EMAIL_ALREADY_EXISTS",
        message: "Email này đã được đăng ký tài khoản.",
      });
    });

    it("xử lý lỗi 400 validation error", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { code: "VALIDATION_ERROR", message: "Mật khẩu phải có tối thiểu 8 ký tự." },
          { status: 400 },
        ),
      );

      const result = await register({ email: "user@example.com", password: "123" });

      expect(result).toEqual({
        kind: "error",
        code: "VALIDATION_ERROR",
        message: "Mật khẩu phải có tối thiểu 8 ký tự.",
      });
    });

    it("xử lý lỗi mạng khi fetch ném lỗi", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const result = await register({ email: "user@example.com", password: "Password123!" });

      expect(result).toEqual({
        kind: "error",
        message: "Không thể kết nối tới máy chủ.",
      });
    });
  });

  describe("getCurrentUser", () => {
    it("trả về tài khoản khi đã đăng nhập", async () => {
      const mockAccount = { id: 2, email: "customer@example.com", role: "customer" as const };
      fetchMock.mockResolvedValueOnce(jsonResponse({ account: mockAccount }));

      const result = await getCurrentUser();

      expect(result).toEqual({
        kind: "ok",
        data: { account: mockAccount },
      });
    });

    it("trả về account null khi chưa đăng nhập", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ account: null }));

      const result = await getCurrentUser();

      expect(result).toEqual({
        kind: "ok",
        data: { account: null },
      });
    });
  });
});
