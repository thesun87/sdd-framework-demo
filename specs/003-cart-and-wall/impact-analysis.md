# Impact Analysis: 003-cart-and-wall

**Feature**: `003-cart-and-wall`
**Track**: B — brownfield feature over completed `000`, `001`, `002`
**Baseline**: `baseline-0002-ecommerce` (frozen 2026-09-23; analysis started on `baseline-0001-ecommerce`)
**Created**: 2026-09-23
**Mode**: READ-ONLY analysis before specification (protocol §B1, §B2)

## 1. Baseline Reference Check (B1)

- **Outcome** (`feature-map.md`): Khách thêm hàng vào giỏ ở trình duyệt, giỏ **sống sót qua lần
  đăng nhập**, và gặp tường đăng ký khi định đặt đơn. Phụ thuộc `001`, `002` — cả hai đã merge.
- **PRD FRs touched**:
  - `FR-6`: Quản lý dòng giỏ hàng (thêm/gộp dòng, đổi số lượng, 0 = xoá, từ chối âm/không nguyên,
    đánh dấu dòng vượt tồn kho, tổng tiền hàng không gồm phí giao hàng, giá hiện tại).
  - `FR-7`: Giỏ hàng không giữ chỗ tồn kho.
  - `FR-8`: Giỏ của khách chưa đăng ký sống sót qua đăng ký / đăng nhập / đăng xuất / tải lại trang.
  - `FR-11`: Tường đăng ký giữa giỏ hàng và đặt đơn; qua tường xong trả về đúng bước đặt đơn.
- **Architecture decisions that constrain this work**:
  - `AD-17`: giỏ ở `localStorage`, chỉ `product_id` + số lượng, **không bao giờ chứa giá**; không
    bảng giỏ, không module `cart` phía server, không dòng dữ liệu nào cho khách chưa đăng ký.
  - `AD-19`: hợp đồng Trang bán hàng chỉ phơi enum, không bao giờ số nguyên tồn kho (ràng buộc
    hình dạng type). Xem Quyết định D1.
  - `AD-20`: tình trạng còn/hết không cache ở bất kỳ tầng nào, kể cả dữ liệu client; response
    mang `Cache-Control: no-store`. Giỏ đọc lại trạng thái mỗi lần hiển thị.
  - `AD-8`: phiên ở server, cookie `httpOnly`; **không** token nào ở `localStorage`. Giỏ ở
    `localStorage` là dữ liệu giỏ, không phải định danh — không được gắn email/account id vào đó.
  - `AD-10`: mọi hình dạng HTTP mới khai trong `packages/shared/src/storefront/`.
  - `AD-5`: dữ liệu tồn kho đọc qua `stock.public`, không truy vấn thẳng bảng `stock` từ `catalog`.
- **Glossary terms involved**: `Cart` (Giỏ hàng), `Cart line` (Dòng giỏ hàng), `Line subtotal`
  (Tổng tiền hàng), `Guest` (Khách chưa đăng ký), `Customer` (Khách hàng), `Shop owner` (Chủ shop),
  `Stock status` (Tình trạng tồn kho), `Discontinued` (Ngừng bán).
  Từ `baseline-0002-ecommerce` thêm: `Registration wall` (Tường đăng ký), `Storefront` (Trang bán hàng),
  `Place order` (Đặt đơn) — xem Quyết định D2.
- **Fits current architecture**: **YES**, với Quyết định D1.

### Quyết định của người (Tuan Nguyen, 2026-09-23)

- **D1 — FR-6 ↔ AD-19.** FR-6 đòi giỏ "đánh dấu đúng những dòng đang vượt tồn kho, nêu rõ số lượng
  còn bán được", và `ux-spec.md` có chuỗi *"Chỉ còn {n} sản phẩm…"*. AD-19 cấm con số tồn kho ra
  Trang bán hàng ("FR-6 cảnh báo giỏ vượt tồn kho bằng còn/hết, không bằng con số"). Với enum
  `in_stock | out_of_stock` thuần thì giỏ **không phát hiện được** dòng có số lượng > tồn kho > 0.
  **Chốt:** server nhận danh sách `(product_id, quantity)` và trả **enum trạng thái cho từng dòng**
  (dạng `ok | exceeds_stock | out_of_stock`, tên cuối cùng do `/speckit-plan` chốt). Không số nguyên
  tồn kho nào trong hợp đồng — tuân thủ luật hình dạng của AD-19. Giỏ **không nêu con số {n}**.
  - **Nợ baseline — ĐÃ TRẢ 2026-09-23:** `prd.md` FR-6, chuỗi `ux-spec.md`, AD-19 (làm rõ + rủi ro)
    và ADR-0001 đã sửa ở `baseline/0003-cart-line-status` → `baseline-0002-ecommerce`.
  - **Rủi ro còn lại:** enum theo `(product_id, quantity)` cho phép dò ra con số chính xác bằng
    tìm kiếm nhị phân trên `quantity` (~log₂ lần gọi). Luật hình dạng của AD-19 vẫn giữ, nhưng ý
    định "con số không rời Trang quản trị" chỉ còn giữ ở mức hợp đồng. Đã chấp nhận (Q1 = A),
    ghi ở plan R3, AD-19 và ADR-0001.
- **D2 — Glossary.** Dùng nguyên văn `Tường đăng ký`, `Trang bán hàng`, `Đặt đơn` như `ux-spec.md`
  đã chốt (N10), không chờ amendment glossary. Ngoại lệ này **đã đóng** khi ba thuật ngữ vào
  glossary ở `baseline-0002-ecommerce`; không được đặt thêm từ đồng nghĩa nào khác (không "checkout", "paywall",
  "login wall").

## 2. Existing behaviour

- **Storefront** (`apps/storefront/src/`): có trang chủ (lưới + sidebar danh mục + tìm kiếm + phân
  trang), Chi tiết sản phẩm, Đăng ký, Đăng nhập; `AuthHeader` hiện email + đăng xuất và đã biết
  `role === "shop_owner"`.
  - **Chưa có giỏ hàng** ở bất kỳ dạng nào: không nút "Thêm vào giỏ hàng", không biểu tượng giỏ,
    không route giỏ. Không nơi nào trong `apps/` hay `packages/` dùng `localStorage`.
  - `LoginPage.tsx:42` và `RegisterPage.tsx:42` luôn `navigate("/")` sau khi thành công — **chưa
    có cơ chế trả về đúng trang trước đó** mà FR-11 cần.
  - Router (`router/router.ts`) là union `Route` tự viết, kiểm tra tường minh trong
    `App.tsx` `announcementFor()` (switch phải đủ nhánh).
- **API** (`apps/api/src/modules/`):
  - `catalog`: `GET /api/products` (list, `no-store`), `GET /api/products/:id` (detail, `no-store`);
    mọi response đi qua `.parse()` của schema `.strict()` trong `packages/shared` trước khi rời
    controller. Sản phẩm không tồn tại → `ProductNotFoundException` (404).
  - `stock`: `stock.public.ts` là cửa công khai; tồn kho chỉ ra ngoài dưới dạng `StockStatus`.
  - `identity`: `/api/auth/register|login|logout|me`, cookie `shop_session`.
- **DB**: `product` **không có cột Ngừng bán** (`db/schema/catalog.ts` ghi rõ: thuộc feature `009`).
  Chưa có cách nào để một sản phẩm biến mất khỏi catalog.
- **Đặt đơn**: chưa tồn tại (thuộc `004`). Không có API đặt đơn, không có trang Đặt đơn.

## 3. Affected modules

- `packages/shared/src/storefront/` (modify/add): schema dòng giỏ lưu ở `localStorage`
  (`productId` + `quantity`, **không giá**), schema request/response kiểm tra trạng thái dòng giỏ
  (D1), cùng hàng rào `.strict()` như `product.ts`.
- `apps/api/src/modules/catalog/` (modify): endpoint đọc thông tin hiện hành cho một tập
  `productId` (tên, giá hiện tại, ảnh đại diện, trạng thái dòng theo D1). Đọc tồn kho qua
  `stock.public`. **Không** tạo module `cart` (architecture.md §Modules, AD-17).
- `apps/api/src/modules/stock/` (read-only dependency, có thể thêm hàm công khai): nếu `stock.public`
  chưa có phép so sánh "đủ / không đủ cho số lượng Q" theo lô, thêm ở đây — phép so sánh thuộc
  module sở hữu tồn kho, không thuộc `catalog` (AD-5, AD-22).
- `apps/storefront/src/` (modify/add):
  - kho giỏ hàng trên `localStorage` (đọc/ghi/validate, chịu được dữ liệu hỏng hoặc bị sửa tay);
  - nút "Thêm vào giỏ hàng" ở Chi tiết sản phẩm; biểu tượng giỏ + số trên header;
  - trang Giỏ hàng (sửa số lượng, xoá dòng, tổng tiền hàng, cảnh báo cấp dòng, nút Đặt đơn);
  - Tường đăng ký + cơ chế trả về đúng bước Đặt đơn sau đăng ký/đăng nhập;
  - ẩn biểu tượng giỏ và nút thêm giỏ trong phiên Chủ shop (`ux-spec.md` bảng Không có quyền).
- `apps/storefront/src/pages/LoginPage.tsx`, `RegisterPage.tsx` (modify): đích điều hướng sau thành
  công không còn cứng `/`.
- `packages/ui/` (có thể): component dùng chung cho điều khiển số lượng (vùng bấm 44×44 px).
- `e2e/` (add): hành trình giỏ hàng + tường đăng ký.
- **Không đụng**: `db/schema/**`, `db/migrations/**` (AD-17: không bảng giỏ), `apps/backoffice`,
  `apps/api/src/modules/identity/**` (trừ khi plan chứng minh cần), `ops/Caddyfile`.

## Affected contracts

- **API mới (Trang bán hàng)**: một đường đọc theo lô cho các dòng giỏ, ví dụ
  `POST /api/cart/lines/status` hoặc `GET /api/products?ids=…` — hình dạng và path do
  `/speckit-plan` chốt. Ràng buộc bắt buộc:
  - request chỉ chứa `productId` + `quantity`; **server bỏ qua mọi giá client gửi** (AD-17);
  - response mang giá **hiện tại**, trạng thái dòng dạng enum, **không số nguyên tồn kho** (AD-19);
  - `Cache-Control: no-store` (AD-20); đi qua `.parse()` của schema `.strict()` (AD-10);
  - `productId` không tồn tại → trạng thái dòng tường minh, không làm hỏng cả response.
- **Hợp đồng lưu trữ trình duyệt**: một khoá `localStorage` cho giỏ, có phiên bản schema. Giá trị
  chỉ là danh sách `(productId, quantity)`. Đây là hợp đồng giữa các bản build storefront — đổi
  hình dạng về sau phải đọc được bản cũ hoặc bỏ nó một cách có kiểm soát.
- **Hợp đồng điều hướng**: tham số "quay về" cho Đăng ký / Đăng nhập phải là đường dẫn **nội bộ**
  (không cho `//evil.com`, không URL tuyệt đối) — chống open redirect.
- **Không đổi**: `ProductSummarySchema`, `ProductDetailSchema`, `StockStatusSchema` (đúng hai giá
  trị, comment trong `product.ts` cấm thêm giá trị thứ ba — trạng thái dòng giỏ là **một enum
  riêng**, không mở rộng enum này); mọi endpoint `/api/auth/*`; cookie `shop_session`.
- **DB**: không thay đổi.

## 5. Existing tests that must keep passing

- Toàn bộ Jest `apps/api` (catalog, stock — gồm `*.race-spec.ts` — và identity).
- Toàn bộ Vitest `apps/storefront`, `packages/shared`, `packages/ui` — đặc biệt
  `product.test.ts` (hàng rào `.strict()`), `router.test.ts`, `LoginPage.test.tsx`,
  `RegisterPage.test.tsx`, `AuthHeader.test.tsx`, `App.test.tsx`.
- Toàn bộ Playwright `e2e/`: `storefront-journey`, `auth-journey`, `security-headers`, `performance`.
- Lệnh chạy: xem `docs/baseline/verification.md`.

## 6. Regression risk

- **Đổi đích điều hướng của Login/Register** có thể làm vỡ `auth-journey.e2e-spec.ts` và
  `LoginPage.test.tsx` / `RegisterPage.test.tsx` đang kỳ vọng về `/`. Mặc định khi không có tham số
  quay về phải vẫn là `/`.
- **Thêm route mới** vào union `Route` bắt buộc cập nhật `announcementFor()` trong `App.tsx`
  (switch đủ nhánh) — thiếu sẽ lỗi type hoặc mất thông báo route cho screen reader.
- **Header**: thêm biểu tượng giỏ vào `AuthHeader` / header có thể phá snapshot/assertion hiện có
  và bố cục; phải ẩn trong phiên Chủ shop.
- **CSP (AD-29)**: mọi script mới phải chạy dưới CSP hiện hành; không inline script,
  không `eval` để parse `localStorage`.
- **AD-20**: nếu kho giỏ cache kết quả trạng thái dòng giữa các lần render/điều hướng, "Còn hàng" cũ
  sống trong client — đúng tầng AD-20 gọi là nguy hiểm nhất.
- **AD-19**: endpoint mới là **chỗ đầu tiên** trên Trang bán hàng tiếp nhận `quantity` và trả kết quả
  phụ thuộc tồn kho — xem rủi ro dò tìm ở D1.
- **Hiệu năng**: `performance.e2e-spec.ts` đo p95 trang chủ/chi tiết; không được thêm lời gọi mạng
  chặn render vào hai trang đó (số trên biểu tượng giỏ đọc từ `localStorage`, không cần gọi API).

## 7. Reusable assets

- `apps/storefront/src/api/client.ts`: mẫu client HTTP validate bằng schema `packages/shared` và
  không cache — dùng lại cho endpoint trạng thái dòng.
- `apps/storefront/src/api/auth-client.ts` `getCurrentUser()`: biết Guest / Khách hàng / Chủ shop để
  quyết định Tường đăng ký và ẩn giỏ trong phiên Chủ shop.
- `apps/storefront/src/router/router.ts` `navigate()` + `parseRoute()`; `router/Link.tsx`.
- `apps/storefront/src/formatPrice.ts`: định dạng giá VND.
- `packages/ui` `StockStatusLabel`, `tokens.ts`, `RouteAnnouncer`.
- `apps/api/src/modules/catalog/catalog.repository.ts` / `catalog.service.ts` (đọc sản phẩm),
  `product-not-found.exception.ts`, `error-envelope.filter.ts`, `catalog-test-support.ts`
  `createTestApp()` cho integration test.
- `apps/api/src/modules/stock/stock.public.ts`: cửa công khai tới tồn kho.
- `apps/storefront/src/test/catalogFixtures.ts`, `authFixtures.ts`.

## 8. Migration / backward-compatibility needs

- Không migration DB.
- Khoá `localStorage` mới — chưa có bản cũ nào. Từ bản này trở đi phải có trường phiên bản để
  `004` (đặt đơn, xoá giỏ sau khi đặt thành công) và các bản sau đọc được.
- Dữ liệu `localStorage` hỏng/sửa tay (JSON sai, số lượng âm, id lạ) → coi là giỏ rỗng hoặc bỏ
  dòng hỏng, **không** làm sập trang.

## 9. Out of scope

- **Đặt đơn** thật (FR-12–15): trang Đặt đơn, địa chỉ, phương thức thanh toán, API đặt đơn, trang
  *Đơn chưa đặt được*, idempotency (AD-18) — tất cả thuộc `004`. Ở `003`, "đúng bước Đặt đơn" là
  đích điều hướng mà `004` sẽ lấp; tiêu chí FR-11 "API đặt đơn không có phiên → 401" **chỉ kiểm được
  khi API đó tồn tại**, tức ở `004`. `/speckit-clarify` chốt cách `003` thể hiện đích này.
- **Trạng thái dòng "Ngừng bán"** (`ux-spec.md` trạng thái cấp dòng (b)): không có cột Ngừng bán
  cho tới `009`. `003` chỉ làm (a) vượt tồn kho / hết hàng và (c) bình thường; trạng thái dòng cho
  `productId` không còn tồn tại được xử lý tường minh. `/speckit-clarify` xác nhận.
- Giỏ đồng bộ giữa thiết bị, gộp giỏ, giỏ phía server (AD-17, FR-8 NOTE FOR PM).
- Giữ chỗ tồn kho, đồng hồ đếm ngược (FR-7, `ux-spec.md` phương án bị bác).
- Guest checkout (`ux-spec.md` phương án bị bác).
- Giỏ hàng cho Chủ shop (PRD §11.1 Q4 = không).
- Phí giao hàng trong giỏ (FR-20).
