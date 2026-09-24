import { useEffect, useState } from "react";
import { getCurrentUser } from "./auth-client.js";
import { usePathname } from "../router/usePathname.js";

export type CurrentAccountRole = "loading" | "guest" | "customer" | "shop_owner";

/**
 * Hook xác định vai trò của tài khoản hiện tại (T005, research R7).
 * Tự động kiểm tra lại mỗi khi pathname thay đổi.
 * Trả về một trong 4 giá trị: 'loading' | 'guest' | 'customer' | 'shop_owner'.
 */
export function useCurrentAccount(): CurrentAccountRole {
  const pathname = usePathname();
  const [role, setRole] = useState<CurrentAccountRole>("loading");

  useEffect(() => {
    let cancelled = false;

    async function checkAccount() {
      const result = await getCurrentUser();
      if (cancelled) return;

      if (result.kind === "ok") {
        if (!result.data.account) {
          setRole("guest");
        } else {
          setRole(result.data.account.role);
        }
      } else {
        setRole("guest");
      }
    }

    checkAccount();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return role;
}
