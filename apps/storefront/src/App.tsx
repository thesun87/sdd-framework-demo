import { useEffect, useState } from "react";
import { RouteAnnouncer } from "ui";
import { parseRoute, type Route } from "./router/router.js";
import { usePathname } from "./router/usePathname.js";
import { HomePage } from "./pages/HomePage.js";
import { ProductDetailPage } from "./pages/ProductDetailPage.js";

/** Nội dung đọc cho screen reader mỗi lần route đổi — SPA không có ranh giới tải trang nào
 * làm việc này thay (brief mục 10); `RouteAnnouncer` (packages/ui) chỉ hiển thị, storefront
 * PHẢI tự tính nội dung mới và truyền lại prop `message`. */
function announcementFor(route: Route): string {
  switch (route.type) {
    case "home":
      return "Đã chuyển đến trang chủ.";
    case "product-detail":
      return "Đã chuyển đến trang chi tiết sản phẩm.";
    case "not-found":
      return "Không tìm thấy trang.";
  }
}

export function App() {
  const pathname = usePathname();
  const route = parseRoute(pathname);
  const [announcement, setAnnouncement] = useState("");

  // Chạy sau MỖI lần `pathname` đổi, kể cả lần dựng đầu tiên — khớp đúng nghĩa đen của brief
  // mục 10 ("mỗi lần đổi route phải thông báo"), không có "lần đầu ngoại lệ".
  useEffect(() => {
    setAnnouncement(announcementFor(route));
    // Cố ý chỉ phụ thuộc `pathname`: `route` được suy ra THUẦN từ nó (`parseRoute`), thêm
    // `route` vào mảng phụ thuộc sẽ tạo object mới mỗi render và chạy lại effect vô ích.
  }, [pathname]);

  return (
    <>
      <RouteAnnouncer message={announcement} />
      {route.type === "home" && (
        <HomePage
          categoryId={route.categoryId}
          q={route.q}
          page={route.page}
        />
      )}
      {route.type === "product-detail" && <ProductDetailPage id={route.id} />}
      {route.type === "not-found" && (
        <main>
          <h1>Không tìm thấy trang</h1>
        </main>
      )}
    </>
  );
}
