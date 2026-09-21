import type { storefront } from "shared";
import { Link } from "../router/Link.js";

export interface CategorySidebarProps {
  categories: storefront.CategorySummary[];
  selectedCategoryId?: number;
  onSelectCategory?: (categoryId?: number) => void;
}

/**
 * Sidebar danh mục phẳng (FR-001, FR-005).
 * - "Tất cả sản phẩm" là mục gốc (không nằm trong persisted categories).
 * - Mỗi danh mục hiển thị tên và badge số lượng sản phẩm.
 * - Tuân thủ WCAG 2.1 AA với semantic `<nav>`, `aria-current`, tỷ lệ tương phản cao.
 */
export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySidebarProps) {
  const isAllSelected = selectedCategoryId === undefined;

  return (
    <nav aria-label="Danh mục sản phẩm" style={{ width: "220px", flexShrink: 0 }}>
      <h2 style={{ fontSize: "18px", marginBottom: "12px", marginTop: 0 }}>Danh mục</h2>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <li>
          <Link
            to="/"
            aria-current={isAllSelected ? "page" : undefined}
            onClick={() => onSelectCategory?.(undefined)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: "6px",
              textDecoration: "none",
              color: isAllSelected ? "#1d4ed8" : "#374151",
              backgroundColor: isAllSelected ? "#eff6ff" : "transparent",
              fontWeight: isAllSelected ? 600 : 400,
            }}
          >
            <span>Tất cả sản phẩm</span>
          </Link>
        </li>
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <li key={cat.id}>
              <Link
                to={`/?categoryId=${cat.id}`}
                aria-current={isSelected ? "page" : undefined}
                onClick={() => onSelectCategory?.(cat.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  color: isSelected ? "#1d4ed8" : "#374151",
                  backgroundColor: isSelected ? "#eff6ff" : "transparent",
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                <span>{cat.name}</span>
                <span
                  style={{
                    fontSize: "12px",
                    backgroundColor: isSelected ? "#dbeafe" : "#f3f4f6",
                    color: isSelected ? "#1e40af" : "#4b5563",
                    padding: "2px 8px",
                    borderRadius: "10px",
                  }}
                >
                  {cat.productCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
