import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const validEnv = {
  DATABASE_URL: "postgres://app:app@localhost:5432/shop",
  API_PORT: "3000",
  NODE_ENV: "development",
  PRODUCT_IMAGE_PATH: "/data/product-images",
};

describe("loadEnv", () => {
  it("trả cấu hình đã validate khi đủ bốn biến hợp lệ", () => {
    const env = loadEnv(validEnv);
    expect(env).toEqual({
      DATABASE_URL: validEnv.DATABASE_URL,
      API_PORT: 3000,
      NODE_ENV: "development",
      PRODUCT_IMAGE_PATH: validEnv.PRODUCT_IMAGE_PATH,
    });
  });

  it("ném lỗi rõ ràng khi thiếu DATABASE_URL", () => {
    const { DATABASE_URL, ...rest } = validEnv;
    expect(() => loadEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("ném lỗi rõ ràng khi thiếu toàn bộ biến", () => {
    expect(() => loadEnv({})).toThrow(/Cấu hình triển khai không hợp lệ/);
  });

  it("từ chối NODE_ENV ngoài development|production", () => {
    expect(() => loadEnv({ ...validEnv, NODE_ENV: "staging" })).toThrow();
  });

  it("từ chối API_PORT không phải số", () => {
    expect(() => loadEnv({ ...validEnv, API_PORT: "abc" })).toThrow(/API_PORT/);
  });
});
