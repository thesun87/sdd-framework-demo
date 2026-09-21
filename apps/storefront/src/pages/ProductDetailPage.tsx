import { useEffect, useState } from "react";
import { StockStatusLabel } from "ui";
import type { storefront } from "shared";
import { fetchProductDetail } from "../api/client.js";
import { formatPriceVnd } from "../formatPrice.js";
import { Link } from "../router/Link.js";

export interface DetailPageProps {
  id: string;
}

type ViewState =
  | { status: "loading" }
  | { status: "ready"; product: storefront.ProductDetail }
  | { status: "not-found" }
  | { status: "error"; message: string };

/**
 * Trang chi tiết Sản phẩm — TỐI GIẢN theo quyết định đã chốt (brief mục 2): tên, mô tả,
 * giá, ảnh, nhãn tồn kho. KHÔNG nút thêm vào giỏ, KHÔNG sản phẩm liên quan, KHÔNG đánh giá —
 * thêm bất kỳ thứ nào trong ba thứ đó là scope creep.
 *
 * Gọi lại API mỗi lần `id` đổi hoặc component được dựng lại — cùng kỷ luật không-cache của
 * `HomePage` (AD-20).
 */
export function ProductDetailPage({ id }: DetailPageProps) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchProductDetail(id).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        setState({ status: "ready", product: result.data });
      } else if (result.kind === "not-found") {
        setState({ status: "not-found" });
      } else {
        setState({ status: "error", message: result.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <main>
        <p aria-live="polite">Đang tải…</p>
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main>
        <h1>Không tìm thấy sản phẩm</h1>
        <p>Sản phẩm này không tồn tại.</p>
        <Link to="/">Quay lại trang chủ</Link>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main>
        <p role="alert">Đã có lỗi xảy ra: {state.message}</p>
      </main>
    );
  }

  const { product } = state;
  // `images` sắp theo `position` — ảnh đầu tiên (position nhỏ nhất) là ảnh đại diện
  // (spec.md US1 kịch bản 6). Hợp đồng đảm bảo ít nhất một ảnh cho Sản phẩm hợp lệ; vẫn
  // thủ thế cho mảng rỗng thay vì giả định.
  const sortedImages = [...product.images].sort((a, b) => a.position - b.position);

  return (
    <main>
      <Link to="/">← Trang chủ</Link>
      <h1>{product.name}</h1>
      {sortedImages.length > 0 ? (
        <div data-testid="product-images" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {sortedImages.map((img, idx) => (
            <img
              key={img.path}
              src={img.path}
              alt={idx === 0 ? product.name : `${product.name} - ảnh ${idx + 1}`}
              style={{ maxWidth: "100%", height: "auto", borderRadius: "4px" }}
            />
          ))}
        </div>
      ) : null}
      <p style={{ fontSize: "20px", fontWeight: "bold" }}>{formatPriceVnd(product.price)}</p>
      <StockStatusLabel status={product.stockStatus} />
      <p>{product.description}</p>
    </main>
  );
}
