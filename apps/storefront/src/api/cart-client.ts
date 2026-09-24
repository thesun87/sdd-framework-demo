import { storefront } from "shared";
import type { FetchResult } from "./client.js";

export type CartLineInput = {
  readonly productId: number;
  readonly quantity: number;
};

/**
 * Gọi API xác định trạng thái các dòng giỏ hàng (T005).
 * Bắt buộc cache: "no-store", credentials: "same-origin", không lưu cache trong module scope (AD-20).
 * Request body chỉ gửi productId và quantity, không bao giờ gửi price (FR-012).
 */
export async function fetchCartLineStatuses(
  lines: readonly CartLineInput[],
): Promise<FetchResult<storefront.CartLinesStatusResponse>> {
  const payload: storefront.CartLinesStatusRequest = {
    lines: lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  };

  let response: Response;
  try {
    response = await fetch("/api/cart-lines/status", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }

  if (!response.ok) {
    return { kind: "error", message: `Máy chủ trả lỗi (HTTP ${response.status}).` };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { kind: "error", message: "Dữ liệu trả về không đúng định dạng JSON." };
  }

  const parsed = storefront.CartLinesStatusResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "error", message: "Dữ liệu trạng thái dòng giỏ không đúng định dạng." };
  }

  return { kind: "ok", data: parsed.data };
}
