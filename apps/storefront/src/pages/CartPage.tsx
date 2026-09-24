import { useEffect, useState } from "react";
import type { storefront } from "shared";
import { QuantityStepper } from "ui";
import { useCart } from "../cart/useCart.js";
import { useCurrentAccount } from "../api/useCurrentAccount.js";
import { fetchCartLineStatuses } from "../api/cart-client.js";
import { formatPriceVnd } from "../formatPrice.js";
import { Link } from "../router/Link.js";

export function CartPage() {
  const role = useCurrentAccount();
  const { lines, unavailable, dropUnknown, setQuantity, remove } = useCart();
  const [lineStatuses, setLineStatuses] = useState<
    Map<number, storefront.CartLineStatusResponseItem>
  >(new Map());
  const [checkError, setCheckError] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Khi đang xác thực tài khoản hoặc là chủ shop thì không kiểm tra giỏ hàng (FR-018)
    if (role === "loading" || role === "shop_owner") return;
    if (lines.length === 0) return;

    let cancelled = false;

    async function checkStatuses() {
      const result = await fetchCartLineStatuses(lines);
      if (cancelled) return;

      if (result.kind === "ok") {
        setCheckError(false);
        const map = new Map<number, storefront.CartLineStatusResponseItem>();
        const notFoundIds: number[] = [];
        let hasAnyFlags = false;

        for (const item of result.data.lines) {
          map.set(item.productId, item);
          if (
            item.lineStatus === "not_found" &&
            lines.some((l) => l.productId === item.productId)
          ) {
            notFoundIds.push(item.productId);
          }
          if (item.lineStatus === "exceeds_stock" || item.lineStatus === "out_of_stock") {
            hasAnyFlags = true;
          }
        }

        setLineStatuses(map);

        if (hasAnyFlags) {
          setAnnouncement("Có dòng trong giỏ hàng cần xử lý.");
        }

        // Loại bỏ các sản phẩm không còn tồn tại khỏi giỏ hàng
        if (notFoundIds.length > 0) {
          dropUnknown(notFoundIds);
        }
      } else {
        setCheckError(true);
      }
    }

    checkStatuses();

    return () => {
      cancelled = true;
    };
  }, [lines, role, dropUnknown]);

  // Đang kiểm tra phiên tài khoản
  if (role === "loading") {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Giỏ hàng</h1>
      </main>
    );
  }

  // Quyền chủ shop: hiển thị thông báo đặc biệt và không can thiệp giỏ hàng (FR-018)
  if (role === "shop_owner") {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Giỏ hàng</h1>
        <p>Tài khoản chủ shop không đặt đơn được.</p>
      </main>
    );
  }

  // Trình duyệt không hỗ trợ hoặc bị chặn storage
  if (unavailable) {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Giỏ hàng</h1>
        <p>Không lưu được giỏ hàng trên trình duyệt này.</p>
      </main>
    );
  }

  const liveRegion = (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {announcement}
    </div>
  );

  // Giỏ hàng rỗng
  if (lines.length === 0) {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
        {liveRegion}
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Giỏ hàng</h1>
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

  // Tính Tổng tiền hàng (Line subtotal) từ giá hiện tại
  let lineSubtotal = 0;
  for (const line of lines) {
    const status = lineStatuses.get(line.productId);
    if (status?.product) {
      lineSubtotal += status.product.price * line.quantity;
    }
  }

  const hasFlaggedLines = lines.some((l) => {
    const s = lineStatuses.get(l.productId);
    return s?.lineStatus === "exceeds_stock" || s?.lineStatus === "out_of_stock";
  });

  const checkSucceeded = !checkError && lineStatuses.size > 0;
  const canPlaceOrder =
    lines.length > 0 &&
    checkSucceeded &&
    !hasFlaggedLines &&
    lines.every((l) => lineStatuses.get(l.productId)?.lineStatus === "ok");

  let disabledReason: string | null = null;
  if (checkError) {
    disabledReason = "Chưa kiểm tra được tình trạng hàng. Bạn thử tải lại trang.";
  } else if (hasFlaggedLines) {
    disabledReason = "Bạn sửa các dòng được đánh dấu để đặt đơn.";
  } else if (lines.length === 0) {
    disabledReason = "Giỏ hàng của bạn đang trống.";
  }

  const handleQuantityChange = (productId: number, newQty: number, productName: string) => {
    if (newQty <= 0) {
      remove(productId);
      setAnnouncement(`Đã xoá ${productName} khỏi giỏ hàng.`);
    } else {
      setQuantity(productId, newQty);
      setAnnouncement(`Đã cập nhật số lượng ${productName}.`);
    }
  };

  const handleRemove = (productId: number, productName: string) => {
    remove(productId);
    setAnnouncement(`Đã xoá ${productName} khỏi giỏ hàng.`);
  };

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
      {liveRegion}

      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>Giỏ hàng</h1>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {lines.map((line) => {
          const status = lineStatuses.get(line.productId);
          const product = status?.product;
          const currentPrice = product?.price ?? 0;
          const lineTotal = currentPrice * line.quantity;
          const productName = product?.name ?? `Sản phẩm #${line.productId}`;

          return (
            <li
              key={line.productId}
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
                padding: "16px 0",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              {product?.imagePath ? (
                <img
                  src={product.imagePath}
                  alt={product.name}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "cover",
                    borderRadius: "4px",
                  }}
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${productName} — chưa có ảnh`}
                  style={{
                    width: "80px",
                    height: "80px",
                    backgroundColor: "#F0F0F0",
                    borderRadius: "4px",
                  }}
                />
              )}

              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px" }}>
                  {productName}
                </h2>
                <div style={{ color: "#4B5563", fontSize: "14px", margin: "0 0 8px" }}>
                  Đơn giá: {formatPriceVnd(currentPrice)}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                  <QuantityStepper
                    value={line.quantity}
                    productName={productName}
                    onChange={(newQty) => handleQuantityChange(line.productId, newQty, productName)}
                  />
                  <button
                    type="button"
                    aria-label={`Xoá ${productName} khỏi giỏ hàng`}
                    onClick={() => handleRemove(line.productId, productName)}
                    style={{
                      minWidth: "44px",
                      minHeight: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "none",
                      border: "none",
                      color: "#DC2626",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "14px",
                      padding: "8px",
                    }}
                  >
                    Xoá
                  </button>
                </div>

                {status?.lineStatus === "exceeds_stock" && (
                  <p
                    role="alert"
                    style={{
                      color: "#DC2626",
                      fontSize: "14px",
                      margin: "8px 0 0",
                      fontWeight: "500",
                    }}
                  >
                    Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn.
                  </p>
                )}
                {status?.lineStatus === "out_of_stock" && (
                  <p
                    role="alert"
                    style={{
                      color: "#DC2626",
                      fontSize: "14px",
                      margin: "8px 0 0",
                      fontWeight: "500",
                    }}
                  >
                    Sản phẩm này đang hết hàng.
                  </p>
                )}
              </div>

              <div style={{ textAlign: "right", minWidth: "120px" }}>
                <div style={{ fontWeight: "600", fontSize: "16px" }}>
                  {formatPriceVnd(lineTotal)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        style={{
          marginTop: "24px",
          borderTop: "2px solid #E5E7EB",
          paddingTop: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>Tổng tiền hàng:</div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#111827" }}>
          {formatPriceVnd(lineSubtotal)}
        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {disabledReason && (
          <span style={{ color: "#DC2626", fontSize: "14px" }}>
            {disabledReason}
          </span>
        )}

        {canPlaceOrder ? (
          <Link
            to="/place-order"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "120px",
              minHeight: "44px",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "16px",
              padding: "0 24px",
            }}
          >
            Đặt đơn
          </Link>
        ) : (
          <button
            type="button"
            disabled
            style={{
              minWidth: "120px",
              minHeight: "44px",
              backgroundColor: "#9CA3AF",
              color: "#FFFFFF",
              borderRadius: "6px",
              border: "none",
              fontWeight: "600",
              fontSize: "16px",
              padding: "0 24px",
              cursor: "not-allowed",
            }}
          >
            Đặt đơn
          </button>
        )}
      </div>
    </main>
  );
}
