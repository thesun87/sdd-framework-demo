import { useEffect, useState } from "react";
import type { storefront } from "shared";
import { fetchCategories, fetchProducts } from "../api/client.js";
import { CategorySidebar } from "../components/CategorySidebar.js";
import { ProductCard } from "../components/ProductCard.js";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; items: storefront.ProductSummary[]; pagination?: storefront.Pagination }
  | { status: "error"; message: string };

export interface HomePageProps {
  categoryId?: number;
  q?: string;
  page?: number;
}

/**
 * Trang chủ — duyệt danh mục phẳng và lưới sản phẩm.
 * Gọi lại API mỗi lần component được dựng hoặc filter thay đổi (AD-20).
 */
export function HomePage(props?: HomePageProps) {
  const [categories, setCategories] = useState<storefront.CategorySummary[]>([]);
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchCategories().then((res) => {
      if (!cancelled && res.kind === "ok") {
        setCategories(res.data.items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    const trimmedQ = props?.q?.trim();
    // Clarification 1: Nonblank search clears category scope.
    // Selecting category clears search keywords.
    const effectiveQ = props?.categoryId !== undefined ? undefined : trimmedQ;
    const effectiveCategoryId = effectiveQ ? undefined : props?.categoryId;

    fetchProducts({
      ...(effectiveCategoryId !== undefined ? { categoryId: effectiveCategoryId } : {}),
      ...(effectiveQ ? { q: effectiveQ } : {}),
      ...(props?.page !== undefined ? { page: props.page } : {}),
    }).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        setState({
          status: "ready",
          items: result.data.items,
          pagination: result.data.pagination,
        });
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
  }, [props?.categoryId, props?.q, props?.page]);

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
      <h1>Sản phẩm</h1>
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        <CategorySidebar
          categories={categories}
          selectedCategoryId={props?.categoryId}
        />
        <section style={{ flex: 1, minWidth: 0 }} aria-label="Danh sách sản phẩm">
          {state.status === "loading" && <p aria-live="polite">Đang tải…</p>}
          {state.status === "error" && (
            <p role="alert">Đã có lỗi xảy ra: {state.message}</p>
          )}
          {state.status === "ready" && state.items.length === 0 && (
            <p>Danh mục này chưa có sản phẩm nào.</p>
          )}
          {state.status === "ready" && state.items.length > 0 && (
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
          )}
        </section>
      </div>
    </main>
  );
}

