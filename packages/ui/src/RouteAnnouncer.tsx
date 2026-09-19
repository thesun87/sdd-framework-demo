import type { CSSProperties } from "react";

/**
 * Ẩn khỏi màn hình nhưng vẫn nằm trong cây accessibility — cách chuẩn để có
 * một vùng chỉ dành cho screen reader.
 */
const visuallyHiddenStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export interface RouteAnnouncerProps {
  /**
   * Nội dung cần đọc cho screen reader. `storefront` cập nhật chuỗi này mỗi
   * khi điều hướng route thành công; đổi nội dung là thứ kích hoạt thông báo
   * của vùng aria-live.
   */
  message: string;
}

/**
 * Vùng aria-live dùng chung để báo cho screen reader biết route (trang) đã
 * đổi. SPA không có ranh giới tải trang như MPA nên trình đọc màn hình không
 * tự biết "trang đã đổi" — `storefront` phải tự gọi lại component này với
 * `message` mới sau mỗi lần điều hướng.
 *
 * politeness cố định là "polite": đủ để được đọc khi trình đọc rảnh, nhưng
 * không ngắt ngang thao tác đang có của người dùng — mức phù hợp cho một
 * thông báo đổi trang, không phải cảnh báo khẩn cấp.
 */
export function RouteAnnouncer({ message }: RouteAnnouncerProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
      {message}
    </div>
  );
}
