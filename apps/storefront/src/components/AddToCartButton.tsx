import { useState } from "react";
import type { storefront } from "shared";
import { useCurrentAccount } from "../api/useCurrentAccount.js";
import { cartStore } from "../cart/cartStore.js";

export interface AddToCartButtonProps {
  productId: number;
  stockStatus: storefront.StockStatus;
}

export function AddToCartButton({ productId, stockStatus }: AddToCartButtonProps) {
  const accountRole = useCurrentAccount();
  const [announcement, setAnnouncement] = useState<string>("");
  // Cờ điều khiển thông báo lưu-thất-bại NHÌN THẤY ĐƯỢC (F-1) — trước đây thông báo này chỉ
  // nằm trong vùng aria-live ẩn (sr-only), không đáp ứng Edge Case "Browser storage
  // unavailable" của spec: người dùng (không chỉ trình đọc màn hình) phải được báo.
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  if (accountRole === "loading" || accountRole === "shop_owner") {
    return null;
  }

  const isOutOfStock = stockStatus === "out_of_stock";

  const handleAdd = () => {
    if (isOutOfStock) return;
    const result = cartStore.add(productId);
    if (result === "invalid") {
      // Lỗi dữ liệu đầu vào (productId/quantity không hợp lệ) không phải là "không lưu được
      // vào storage" — không được báo nhầm thành lỗi storage (F-4); đây không phải điều
      // người dùng gây ra nên không có gì để thông báo cho họ.
      return;
    }
    const added = result === "added";
    // Không nói đã thêm khi thực ra không ghi được vào storage (T017, FR-006 tinh thần
    // "không nói dối") — ví dụ trình duyệt ở chế độ riêng tư chặn localStorage.
    setAnnouncement(
      added ? "Đã thêm vào giỏ hàng." : "Không lưu được giỏ hàng trên trình duyệt này.",
    );
    setStorageUnavailable(!added);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
      <button
        type="button"
        disabled={isOutOfStock}
        onClick={handleAdd}
        style={{
          minWidth: "44px",
          minHeight: "44px",
          padding: "10px 20px",
          fontSize: "16px",
          fontWeight: 600,
          borderRadius: "6px",
          backgroundColor: isOutOfStock ? "#9ca3af" : "#2563eb",
          color: "#ffffff",
          border: "none",
          cursor: isOutOfStock ? "not-allowed" : "pointer",
        }}
      >
        Thêm vào giỏ hàng
      </button>

      {isOutOfStock && (
        <span style={{ fontSize: "14px", color: "#dc2626", fontWeight: 500 }}>
          Sản phẩm này đang hết hàng.
        </span>
      )}

      {storageUnavailable && (
        <span style={{ fontSize: "14px", color: "#dc2626", fontWeight: 500 }}>
          Không lưu được giỏ hàng trên trình duyệt này.
        </span>
      )}

      <span
        aria-live="polite"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {announcement}
      </span>
    </div>
  );
}
