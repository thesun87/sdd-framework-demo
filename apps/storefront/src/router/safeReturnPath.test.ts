import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./safeReturnPath.js";

describe("safeReturnPath (T011)", () => {
  it("chấp nhận đường dẫn nội bộ hợp lệ", () => {
    expect(safeReturnPath("/place-order")).toBe("/place-order");
    expect(safeReturnPath("/cart")).toBe("/cart");
    expect(safeReturnPath("/products/123")).toBe("/products/123");
    expect(safeReturnPath("/")).toBe("/");
    expect(safeReturnPath("/products/1?q=coffee")).toBe("/products/1?q=coffee");
  });

  it("từ chối danh sách các giá trị không an toàn (rejection table)", () => {
    const rejectedInputs = [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "",
      "/\u0000x",
      "http://attacker.com/place-order",
      "//localhost",
      "relative/path",
      "/path\nwith-newline",
      "/path\rwith-cr",
      "/path\twith-tab",
    ];

    for (const input of rejectedInputs) {
      expect(safeReturnPath(input)).toBeUndefined();
    }
  });
});
