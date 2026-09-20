import { StockStatusLabel } from "ui";
import type { storefront } from "shared";
import { Link } from "../router/Link.js";
import { formatPriceVnd } from "../formatPrice.js";

export interface ProductCardProps {
  product: storefront.ProductSummary;
}

/**
 * Thẻ sản phẩm trong lưới trang chủ. Sản phẩm hết hàng dùng CHÍNH component này — không
 * nhánh riêng để ẩn/disable (FR-008): thẻ luôn là một `<Link>` thật, luôn mở được.
 */
export function ProductCard({ product }: ProductCardProps) {
  return (
    <li style={{ listStyle: "none" }}>
      <Link
        to={`/products/${product.id}`}
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          border: "1px solid #DDDDDD",
          borderRadius: "8px",
          padding: "16px",
        }}
      >
        {product.imagePath ? (
          <img
            src={product.imagePath}
            alt={product.name}
            style={{ width: "100%", height: "auto", borderRadius: "4px" }}
          />
        ) : (
          <div
            role="img"
            aria-label={`${product.name} — chưa có ảnh`}
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              backgroundColor: "#F0F0F0",
              borderRadius: "4px",
            }}
          />
        )}
        <h2 style={{ fontSize: "16px", margin: "8px 0 4px" }}>{product.name}</h2>
        <p style={{ margin: "0 0 8px", fontWeight: "bold" }}>{formatPriceVnd(product.price)}</p>
        <StockStatusLabel status={product.stockStatus} />
      </Link>
    </li>
  );
}
