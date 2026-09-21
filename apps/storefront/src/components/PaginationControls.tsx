export interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Phân trang"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        marginTop: "24px",
        padding: "12px 0",
      }}
    >
      <button
        type="button"
        disabled={!hasPrev}
        onClick={() => hasPrev && onPageChange(page - 1)}
        aria-label="Trang trước"
        style={{
          padding: "6px 14px",
          fontSize: "14px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          backgroundColor: hasPrev ? "#ffffff" : "#f3f4f6",
          color: hasPrev ? "#111827" : "#9ca3af",
          cursor: hasPrev ? "pointer" : "not-allowed",
        }}
      >
        Trang trước
      </button>

      <span
        aria-current="page"
        style={{
          fontSize: "14px",
          color: "#374151",
          fontWeight: 500,
        }}
      >
        Trang {page} / {totalPages}
      </span>

      <button
        type="button"
        disabled={!hasNext}
        onClick={() => hasNext && onPageChange(page + 1)}
        aria-label="Trang sau"
        style={{
          padding: "6px 14px",
          fontSize: "14px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          backgroundColor: hasNext ? "#ffffff" : "#f3f4f6",
          color: hasNext ? "#111827" : "#9ca3af",
          cursor: hasNext ? "pointer" : "not-allowed",
        }}
      >
        Trang sau
      </button>
    </nav>
  );
}
