import { useEffect, useState } from "react";
import type { storefront } from "shared";
import { getCurrentUser, logout } from "../api/auth-client.js";
import { navigate } from "../router/router.js";
import { usePathname } from "../router/usePathname.js";

import { CartIconLink } from "./CartIconLink.js";

export interface AuthHeaderProps {
  onLogout?: () => void;
}

export function AuthHeader({ onLogout }: AuthHeaderProps) {
  const pathname = usePathname();
  const [account, setAccount] = useState<storefront.AccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuth = async () => {
    try {
      const res = await getCurrentUser();
      if (res.kind === "ok") {
        setAccount(res.data.account);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuth();
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setAccount(null);
    if (onLogout) {
      onLogout();
    } else {
      navigate("/");
    }
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        marginBottom: "16px",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "18px" }}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          style={{ textDecoration: "none", color: "#111827" }}
        >
          Shop Online
        </a>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <CartIconLink role={isLoading ? "loading" : account?.role ?? "guest"} />
        <nav aria-label="Tài khoản">
        {isLoading ? (
          <span style={{ fontSize: "14px", color: "#6b7280" }}>Đang tải...</span>
        ) : account ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>{account.email}</span>
            {account.role === "shop_owner" && (
              <span
                style={{
                  fontSize: "12px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "#fef3c7",
                  color: "#92400e",
                  fontWeight: 600,
                }}
              >
                Chủ shop
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                fontSize: "14px",
                color: "#dc2626",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                navigate("/login");
              }}
              style={{ fontSize: "14px", color: "#2563eb", textDecoration: "none" }}
            >
              Đăng nhập
            </a>
            <a
              href="/register"
              onClick={(e) => {
                e.preventDefault();
                navigate("/register");
              }}
              style={{
                fontSize: "14px",
                color: "#ffffff",
                backgroundColor: "#2563eb",
                padding: "6px 12px",
                borderRadius: "4px",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Đăng ký
            </a>
          </div>
        )}
      </nav>
      </div>
    </header>
  );
}
