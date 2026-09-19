/**
 * Design token dùng chung cho hai bề mặt UI (storefront ở feature 000,
 * backoffice ở feature 006 sau này). Mức tối thiểu cho feature này: bảng
 * màu, khoảng cách, cỡ chữ — dùng trực tiếp từ React qua style inline.
 *
 * Mọi cặp chữ/nền dưới đây đạt tối thiểu WCAG 2.1 AA (4.5:1 cho chữ thường).
 * Số tương phản thật được tính bằng công thức relative luminance của WCAG và
 * ghi trong `.sdd/000-walking-skeleton/task-007-report.md` — không phỏng đoán.
 */

export const colors = {
  /** Cặp chữ/nền mặc định của ứng dụng. */
  neutral: {
    text: "#1A1A1A",
    background: "#FFFFFF",
  },
  /** Dùng cho nhãn "Còn hàng" — không bao giờ là kênh truyền tải duy nhất. */
  success: {
    text: "#1E4620",
    background: "#E6F4EA",
  },
  /** Dùng cho nhãn "Hết hàng" — không bao giờ là kênh truyền tải duy nhất. */
  danger: {
    text: "#7A271A",
    background: "#FCE8E6",
  },
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
} as const;

export const fontSize = {
  sm: "14px",
  md: "16px",
  lg: "20px",
} as const;

export const tokens = { colors, spacing, fontSize } as const;
