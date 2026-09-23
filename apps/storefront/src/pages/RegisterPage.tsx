import { useState, type FormEvent } from "react";
import type { storefront } from "shared";
import { register } from "../api/auth-client.js";
import { navigate } from "../router/router.js";

export interface RegisterPageProps {
  onSuccess?: (account: storefront.AccountSummary) => void;
}

export function RegisterPage({ onSuccess }: RegisterPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Vui lòng nhập email.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Mật khẩu phải có tối thiểu 8 ký tự.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({
        email: trimmedEmail,
        password,
      });

      if (result.kind === "ok") {
        if (onSuccess) {
          onSuccess(result.data.account);
        } else {
          navigate("/");
        }
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="auth-page"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: "24px",
      }}
    >
      <div
        className="auth-card"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "20px", textAlign: "center" }}>
          Đăng ký tài khoản
        </h1>

        {errorMessage && (
          <div
            role="alert"
            className="auth-error"
            style={{
              padding: "12px",
              marginBottom: "16px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              color: "#b91c1c",
              fontSize: "14px",
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label
              htmlFor="password"
              style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}
            >
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-submit-btn"
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: "20px", textAlign: "center", fontSize: "14px" }}>
          Đã có tài khoản?{" "}
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              navigate("/login");
            }}
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            Đăng nhập
          </a>
        </p>
      </div>
    </main>
  );
}
