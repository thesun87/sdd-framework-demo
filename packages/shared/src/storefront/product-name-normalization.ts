/**
 * Quy tắc chuẩn hoá tên sản phẩm tiếng Việt (AD-11).
 * Áp dụng thống nhất cho cả việc tạo seed/lưu name_normalized trong DB và xử lý truy vấn tìm kiếm:
 * 1. .toLowerCase() — hạ chữ thường (kể cả Đ -> đ).
 * 2. Thay mọi "đ" bằng "d" — "đ" (U+0111) là chữ cái riêng, Unicode NFD không tự tách thành "d" + dấu.
 * 3. .normalize('NFD') rồi xoá mọi dấu kết hợp Unicode (U+0300 - U+036F).
 * 4. .trim() hai đầu.
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Kiểm tra xem query tìm kiếm có rỗng hoặc chỉ toàn khoảng trắng hay không.
 */
export function isSearchQueryBlank(q: string | null | undefined): boolean {
  if (q === null || q === undefined) return true;
  return q.trim().length === 0;
}

/**
 * Chuẩn hoá query tìm kiếm: trả về undefined nếu rỗng/khoảng trắng, hoặc chuỗi đã chuẩn hoá nếu có giá trị.
 */
export function normalizeSearchQuery(q: string | null | undefined): string | undefined {
  if (isSearchQueryBlank(q)) return undefined;
  return normalizeProductName(q as string);
}
