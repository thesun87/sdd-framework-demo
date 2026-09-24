import { useCurrentAccount, type CurrentAccountRole } from "../api/useCurrentAccount.js";
import { useCart } from "../cart/useCart.js";
import { navigate } from "../router/router.js";

export interface CartIconLinkProps {
  role?: CurrentAccountRole;
}

function CartIconLinkView({ role }: { role: CurrentAccountRole }) {
  const { totalQuantity } = useCart();

  if (role === "loading" || role === "shop_owner") {
    return null;
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate("/cart");
  };

  return (
    <a
      href="/cart"
      onClick={handleClick}
      aria-label={`Giỏ hàng, ${totalQuantity} sản phẩm`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "44px",
        minHeight: "44px",
        padding: "6px 10px",
        borderRadius: "6px",
        textDecoration: "none",
        color: "#1f2937",
        position: "relative",
      }}
    >
      <span style={{ fontSize: "15px", fontWeight: 500, marginRight: "4px" }}>
        🛒 Giỏ hàng
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "20px",
          height: "20px",
          padding: "0 6px",
          borderRadius: "10px",
          backgroundColor: "#2563eb",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        {totalQuantity}
      </span>
    </a>
  );
}

function CartIconLinkWithHook() {
  const role = useCurrentAccount();
  return <CartIconLinkView role={role} />;
}

export function CartIconLink({ role }: CartIconLinkProps = {}) {
  if (role !== undefined) {
    return <CartIconLinkView role={role} />;
  }
  return <CartIconLinkWithHook />;
}
