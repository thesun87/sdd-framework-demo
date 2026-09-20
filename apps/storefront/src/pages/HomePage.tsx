import { useEffect, useState } from "react";
import type { storefront } from "shared";
import { fetchProducts } from "../api/client.js";
import { ProductCard } from "../components/ProductCard.js";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; items: storefront.ProductSummary[] }
  | { status: "error"; message: string };

/**
 * Trang chủ — lưới sản phẩm. Gọi lại API mỗi lần component được dựng (mount), KHÔNG giữ
 * kết quả trong bất kỳ state/module nào sống qua lần dựng khác — đúng đường "đơn giản nhất
 * là đường đúng" mà AD-20 đòi hỏi (brief mục 7).
 */
export function HomePage() {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchProducts().then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        setState({ status: "ready", items: result.data.items });
      } else if (result.kind === "error") {
        setState({ status: "error", message: result.message });
      } else {
        // `fetchProducts` không bao giờ trả "not-found" — nhánh này chỉ để TypeScript
        // vét cạn union; giữ lại một thông điệp an toàn nếu hình dạng đổi trong tương lai.
        setState({ status: "error", message: "Phản hồi không như mong đợi." });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main>
        <h1>Sản phẩm</h1>
        <p aria-live="polite">Đang tải…</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main>
        <h1>Sản phẩm</h1>
        <p role="alert">Đã có lỗi xảy ra: {state.message}</p>
      </main>
    );
  }

  // Lưới rỗng là DANH SÁCH RỖNG, không phải lỗi — không role="alert", không icon lỗi,
  // không nút thử lại (spec.md §Edge Cases, brief mục 5).
  if (state.items.length === 0) {
    return (
      <main>
        <h1>Sản phẩm</h1>
        <p>Danh mục này chưa có sản phẩm nào.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Sản phẩm</h1>
      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px",
          padding: 0,
          margin: 0,
        }}
      >
        {state.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
    </main>
  );
}
