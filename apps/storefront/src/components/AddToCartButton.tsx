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

  if (accountRole === "loading" || accountRole === "shop_owner") {
    return null;
  }

  const isOutOfStock = stockStatus === "out_of_stock";

  const handleAdd = () => {
    if (isOutOfStock) return;
    cartStore.add(productId);
    setAnnouncement("Đã thêm vào giỏ hàng.");
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
