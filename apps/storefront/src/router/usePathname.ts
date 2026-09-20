import { useSyncExternalStore } from "react";
import { getPathname, subscribe } from "./router.js";

/** Đường dẫn hiện tại, tự vẽ lại khi điều hướng (chương trình hoặc back/forward). */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPathname, getPathname);
}
