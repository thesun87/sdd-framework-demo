import { describe, expect, it } from "vitest";
import { createErrorEnvelopeSchema, ErrorEnvelopeSchema } from "./error.js";
import { z } from "zod";

describe("ErrorEnvelopeSchema", () => {
  it("chấp nhận envelope hợp lệ (dùng cho 404 của FR-004)", () => {
    const result = ErrorEnvelopeSchema.safeParse({
      error: { code: "NOT_FOUND", message: "Sản phẩm không tồn tại" },
    });
    expect(result.success).toBe(true);
  });

  it("từ chối khi thiếu code hoặc message", () => {
    expect(ErrorEnvelopeSchema.safeParse({ error: { message: "x" } }).success).toBe(false);
    expect(ErrorEnvelopeSchema.safeParse({ error: { code: "X" } }).success).toBe(false);
  });

  it("từ chối trường lạ ở gốc (không phơi stack trace/field nội bộ)", () => {
    const result = ErrorEnvelopeSchema.safeParse({
      error: { code: "NOT_FOUND", message: "x" },
      stack: "at Object.<anonymous>",
    });
    expect(result.success).toBe(false);
  });
});

describe("createErrorEnvelopeSchema", () => {
  it("cho phép payload details có kiểu cụ thể", () => {
    const schema = createErrorEnvelopeSchema(z.object({ field: z.string() }));
    const result = schema.safeParse({
      error: { code: "VALIDATION_FAILED", message: "x", details: { field: "price" } },
    });
    expect(result.success).toBe(true);
  });

  it("từ chối details sai kiểu", () => {
    const schema = createErrorEnvelopeSchema(z.object({ field: z.string() }));
    const result = schema.safeParse({
      error: { code: "VALIDATION_FAILED", message: "x", details: { field: 123 } },
    });
    expect(result.success).toBe(false);
  });
});
