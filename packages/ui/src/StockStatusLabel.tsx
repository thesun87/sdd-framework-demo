import type { CSSProperties } from "react";
import type { storefront } from "shared";
import { tokens } from "./tokens.js";

/**
 * Re-export kiểu canonical từ `packages/shared` (fix wave I-2/I-3, final whole-branch
 * review) — `packages/shared` không phụ thuộc `packages/ui`, và `apps/storefront` đã phụ
 * thuộc cả hai cùng lúc mà không có phụ thuộc vòng nào, nên không có lý do gì để giữ một bản
 * khai lại cục bộ ở đây.
 */
export type StockStatus = storefront.StockStatus;

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "Còn hàng",
  out_of_stock: "Hết hàng",
};

const STOCK_STATUS_STYLES: Record<StockStatus, CSSProperties> = {
  in_stock: {
    color: tokens.colors.success.text,
    backgroundColor: tokens.colors.success.background,
  },
  out_of_stock: {
    color: tokens.colors.danger.text,
    backgroundColor: tokens.colors.danger.background,
  },
};

export interface StockStatusLabelProps {
  status: StockStatus;
}

/**
 * Nhãn tình trạng tồn kho — LUÔN hiển thị bằng chữ tiếng Việt, KHÔNG BAO GIỜ
 * chỉ dựa vào màu sắc để truyền tải thông tin (`spec.md` US2 kịch bản 1,
 * UX §706). Màu ở đây chỉ là gia cố thị giác thêm cho người còn nhìn được
 * màu; người không phân biệt được màu vẫn đọc được nội dung chữ.
 */
export function StockStatusLabel({ status }: StockStatusLabelProps) {
  const style: CSSProperties = {
    ...STOCK_STATUS_STYLES[status],
    fontSize: tokens.fontSize.sm,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
  };

  return (
    <span data-stock-status={status} style={style}>
      {STOCK_STATUS_LABELS[status]}
    </span>
  );
}
