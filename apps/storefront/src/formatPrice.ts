// Định dạng hiển thị giá — TẦNG HIỂN THỊ THUẦN TUÝ (brief mục 6). Input luôn là số nguyên
// VND đã gồm VAT (đã được `ProductSummarySchema`/`ProductDetailSchema` của `packages/shared`
// đảm bảo qua `z.int().nonnegative()`). Hàm này KHÔNG làm tròn, KHÔNG chia, KHÔNG thêm phần
// thập phân — chỉ thêm dấu phân cách nghìn và hậu tố "₫".
export function formatPriceVnd(price: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(price)}₫`;
}
