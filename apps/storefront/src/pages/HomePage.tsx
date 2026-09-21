import { useEffect, useState } from "react";
import type { storefront } from "shared";
import { fetchCategories, fetchProducts } from "../api/client.js";
import { CategorySidebar } from "../components/CategorySidebar.js";
import { PaginationControls } from "../components/PaginationControls.js";
import { ProductCard } from "../components/ProductCard.js";
import { navigate } from "../router/router.js";

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
  const [searchTerm, setSearchTerm] = useState(props?.q ?? "");

  useEffect(() => {
    setSearchTerm(props?.q ?? "");
  }, [props?.q]);

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

    const effectiveQ = props?.categoryId !== undefined ? undefined : props?.q?.trim();
    const effectiveCategoryId = effectiveQ ? undefined : props?.categoryId;

    const handlePageChange = (newPage: number) => {
      const params = new URLSearchParams();
      if (effectiveQ) {
        params.set("q", effectiveQ);
      } else if (effectiveCategoryId !== undefined) {
        params.set("categoryId", String(effectiveCategoryId));
      }
      if (newPage > 1) {
        params.set("page", String(newPage));
      }
      const qs = params.toString();
      navigate(qs ? `/?${qs}` : "/");
    };

    return (
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
        <h1>Sản phẩm</h1>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = searchTerm.trim();
            if (trimmed.length > 0) {
              navigate(`/?q=${encodeURIComponent(trimmed)}`);
            } else {
              navigate("/");
            }
          }}
          style={{ marginBottom: "20px", display: "flex", gap: "8px" }}
        >
          <label
            htmlFor="search-input"
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
            }}
          >
            Tìm kiếm sản phẩm
          </label>
          <input
            id="search-input"
            type="search"
            role="searchbox"
            aria-label="Tìm kiếm sản phẩm"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              flex: 1,
              maxWidth: "400px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Tìm
          </button>
        </form>

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
              <p>
                {effectiveQ
                  ? `Không có sản phẩm nào khớp với «${effectiveQ}».`
                  : "Danh mục này chưa có sản phẩm nào."}
              </p>
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
            {state.status === "ready" && state.pagination && (
              <PaginationControls
                page={state.pagination.page}
                totalPages={state.pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </section>
        </div>
      </main>
    );
}

