import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { navigate } from "./router.js";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  children: ReactNode;
}

/**
 * Thẻ `<a>` thật (giữ được "mở tab mới"/"copy link"/gạch chân focus mặc định của trình
 * duyệt) nhưng chặn điều hướng tải lại trang cho cú click chuột trái đơn giản, thay bằng
 * `history.pushState` — đúng tinh thần SPA. Ctrl/Cmd/Shift/Alt-click và click chuột giữa
 * vẫn đi qua đường mặc định của trình duyệt (mở tab mới), không bị chặn.
 */
export function Link({ to, children, onClick, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
