import { navigate } from "../router/router.js";

export function RegistrationWall() {
  const registerPath = "/register?returnTo=/place-order";
  const loginPath = "/login?returnTo=/place-order";

  return (
    <main
      className="registration-wall"
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "48px 16px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "16px",
        }}
      >
        Bạn cần một tài khoản để đặt đơn
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "#374151",
          marginBottom: "32px",
          lineHeight: "1.5",
        }}
      >
        Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên.
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <a
          href={registerPath}
          onClick={(e) => {
            e.preventDefault();
            navigate(registerPath);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "120px",
            minHeight: "44px",
            padding: "10px 20px",
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            borderRadius: "6px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Đăng ký
        </a>
        <a
          href={loginPath}
          onClick={(e) => {
            e.preventDefault();
            navigate(loginPath);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "120px",
            minHeight: "44px",
            padding: "10px 20px",
            backgroundColor: "#FFFFFF",
            color: "#2563EB",
            border: "1px solid #2563EB",
            borderRadius: "6px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Đăng nhập
        </a>
      </div>
    </main>
  );
}
