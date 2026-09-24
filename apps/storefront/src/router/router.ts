// Router SPA tối giản — feature 000 chỉ có hai trang (trang chủ, trang chi tiết Sản phẩm),
// KHÔNG cần một thư viện định tuyến đầy đủ. Dùng thẳng History API của trình duyệt +
// `useSyncExternalStore` (React 19) để component tự vẽ lại khi đường dẫn đổi.
//
// Đây KHÔNG phải nơi cache dữ liệu — router chỉ theo dõi `location.pathname`, không giữ
// lại bất kỳ response API nào (AD-20 nằm ở `api/client.ts`, không phải ở đây).

import { safeReturnPath } from "./safeReturnPath.js";

export type Route =
  | { type: "home"; categoryId?: number; q?: string; page?: number }
  | { type: "product-detail"; id: string }
  | { type: "register"; returnTo?: string }
  | { type: "login"; returnTo?: string }
  | { type: "cart" }
  | { type: "place-order" }
  | { type: "not-found" };

const PRODUCT_DETAIL_PATTERN = /^\/products\/([^/?#]+)\/?$/;

/** Diễn giải một `pathname` (kèm query nếu có) thành route — thuần hàm, dễ test không cần DOM. */
export function parseRoute(pathAndQuery: string): Route {
  const [pathname, search] = pathAndQuery.split("?");

  if (pathname === "/" || pathname === "") {
    let categoryId: number | undefined;
    let q: string | undefined;
    let page: number | undefined;

    if (search) {
      const params = new URLSearchParams(search);
      const rawCat = params.get("categoryId");
      if (rawCat) {
        const parsed = Number.parseInt(rawCat, 10);
        if (Number.isInteger(parsed) && parsed > 0) {
          categoryId = parsed;
        }
      }

      const rawQ = params.get("q");
      if (rawQ) {
        const trimmed = rawQ.trim();
        if (trimmed.length > 0) {
          q = trimmed;
          // Nonblank search runs across all products and clears category scope
          categoryId = undefined;
        }
      }

      const rawPage = params.get("page");
      if (rawPage) {
        const parsed = Number.parseInt(rawPage, 10);
        if (Number.isInteger(parsed) && parsed >= 1) {
          page = parsed;
        }
      }
    }

    return {
      type: "home",
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(q !== undefined ? { q } : {}),
      ...(page !== undefined ? { page } : {}),
    };
  }

  if (pathname === "/register") {
    const params = search ? new URLSearchParams(search) : null;
    const returnTo = safeReturnPath(params?.get("returnTo"));
    return {
      type: "register",
      ...(returnTo ? { returnTo } : {}),
    };
  }

  if (pathname === "/login") {
    const params = search ? new URLSearchParams(search) : null;
    const returnTo = safeReturnPath(params?.get("returnTo"));
    return {
      type: "login",
      ...(returnTo ? { returnTo } : {}),
    };
  }

  if (pathname === "/cart") {
    return { type: "cart" };
  }

  if (pathname === "/place-order") {
    return { type: "place-order" };
  }

  const match = pathname.match(PRODUCT_DETAIL_PATTERN);
  if (match) {
    return { type: "product-detail", id: decodeURIComponent(match[1]) };
  }
  return { type: "not-found" };
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Điều hướng lập trình (dùng bởi `<Link>`), tương đương "chuyển trang" của SPA. */
export function navigate(path: string): void {
  const current = window.location.pathname + window.location.search;
  if (path === current) return;
  window.history.pushState({}, "", path);
  notify();
}

/** `useSyncExternalStore` subscribe: lắng cả điều hướng chương trình lẫn nút back/forward. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function getPathname(): string {
  return window.location.pathname + window.location.search;
}
