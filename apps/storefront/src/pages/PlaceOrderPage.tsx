import { useEffect, useState } from "react";
import type { storefront } from "shared";
import { useCurrentAccount } from "../api/useCurrentAccount.js";
import { useCart } from "../cart/useCart.js";
import { fetchCartLineStatuses } from "../api/cart-client.js";
import { RegistrationWall } from "../components/RegistrationWall.js";
import { formatPriceVnd } from "../formatPrice.js";
import { Link } from "../router/Link.js";

export function PlaceOrderPage() {
  const role = useCurrentAccount();
  const { lines, unavailable, dropUnknown } = useCart();
  const [lineStatuses, setLineStatuses] = useState<
    Map<number, storefront.CartLineStatusResponseItem>
  >(new Map());

  useEffect(() => {
    if (role !== "customer" || lines.length === 0) return;

    let cancelled = false;

    async function checkStatuses() {
      const result = await fetchCartLineStatuses(lines);
      if (cancelled) return;

      if (result.kind === "ok") {
        const map = new Map<number, storefront.CartLineStatusResponseItem>();
        const notFoundIds: number[] = [];

        for (const item of result.data.lines) {
          map.set(item.productId, item);
          if (
            item.lineStatus === "not_found" &&
            lines.some((l) => l.productId === item.productId)
          ) {
            notFoundIds.push(item.productId);
          }
        }

        setLineStatuses(map);

        if (notFoundIds.length > 0) {
          dropUnknown(notFoundIds);
        }
      }
    }

    checkStatuses();

    return () => {
      cancelled = true;
    };
  }, [lines, role, dropUnknown]);

  // Đang tải phiên người dùng
  if (role === "loading") {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Đặt đơn</h1>
      </main>
    );
  }

  // Khách vãng lai (Guest) gặp Tường đăng ký (FR-014)
  if (role === "guest") {
    return <RegistrationWall />;
  }

  // Tài khoản chủ shop không thể đặt đơn (FR-018)
  if (role === "shop_owner") {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Đặt đơn</h1>
        <p>Tài khoản chủ shop không đặt đơn được.</p>
      </main>
    );
  }

  // Khách hàng (Customer) vào trang Đặt đơn (FR-019)
  if (unavailable) {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Đặt đơn</h1>
        <p>Không lưu được giỏ hàng trên trình duyệt này.</p>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Đặt đơn</h1>
        <p style={{ margin: "16px 0", color: "#4B5563" }}>Chức năng đặt đơn chưa sẵn sàng.</p>
        <p style={{ margin: "16px 0" }}>Giỏ hàng của bạn đang trống.</p>
        <Link
          to="/"
          style={{
            display: "inline-block",
            color: "#2563EB",
            textDecoration: "underline",
          }}
        >
          Trang chủ
        </Link>
      </main>
    );
  }

  let lineSubtotal = 0;
  for (const line of lines) {
    const status = lineStatuses.get(line.productId);
    if (status?.product) {
      lineSubtotal += status.product.price * line.quantity;
    }
  }

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Đặt đơn</h1>
      <p style={{ margin: "16px 0", color: "#4B5563" }}>Chức năng đặt đơn chưa sẵn sàng.</p>

      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "24px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          Tóm tắt đơn hàng
        </h2>

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {lines.map((line) => {
            const status = lineStatuses.get(line.productId);
            const product = status?.product;
            const currentPrice = product?.price ?? 0;
            const lineTotal = currentPrice * line.quantity;
            const productName = product?.name ?? `Sản phẩm #${line.productId}`;

            let flagMessage: string | null = null;
            if (status?.lineStatus === "exceeds_stock") {
              flagMessage =
                "Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn.";
            } else if (status?.lineStatus === "out_of_stock") {
              flagMessage = "Sản phẩm này đang hết hàng.";
            }

            return (
              <li
                key={line.productId}
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                {product?.imagePath ? (
                  <img
                    src={product.imagePath}
                    alt={product.name}
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={`${productName} — chưa có ảnh`}
                    style={{
                      width: "64px",
                      height: "64px",
                      backgroundColor: "#F0F0F0",
                      borderRadius: "4px",
                    }}
                  />
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>
                    {productName}
                  </div>
                  <div style={{ color: "#6B7280", fontSize: "14px" }}>
                    {formatPriceVnd(currentPrice)} × {line.quantity} ={" "}
                    <strong>{formatPriceVnd(lineTotal)}</strong>
                  </div>

                  {flagMessage && (
                    <div
                      style={{
                        marginTop: "6px",
                        padding: "6px 10px",
                        backgroundColor: "#FEF2F2",
                        border: "1px solid #FECACA",
                        borderRadius: "4px",
                        color: "#DC2626",
                        fontSize: "13px",
                      }}
                    >
                      {flagMessage}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        >
          <span>Tổng tiền hàng:</span>
          <span>{formatPriceVnd(lineSubtotal)}</span>
        </div>
      </div>
    </main>
  );
}
