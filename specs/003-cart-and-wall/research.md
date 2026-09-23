# Research: 003-cart-and-wall

**Date**: 2026-09-23 · **Spec**: [spec.md](./spec.md) · **Impact**: [impact-analysis.md](./impact-analysis.md)

Không có `NEEDS CLARIFICATION` nào trong Technical Context: stack đã pin trong baseline và không
feature nào thêm phụ thuộc mới. Các mục dưới đây là **quyết định thiết kế** mà spec cố ý để mở cho plan.

## R1 — Đường xác định trạng thái dòng giỏ (D1, FR-007, FR-012)

- **Decision**: `POST /api/cart-lines/status`, thuộc module `catalog`. Body là
  `{ lines: [{ productId, quantity }] }`, và response trả **một phần tử cho mỗi dòng, giữ đúng thứ tự
  request**: tên, giá hiện tại, ảnh đại diện và `lineStatus ∈ { ok, exceeds_stock, out_of_stock, not_found }`.
  Hợp đồng chi tiết ở [contracts/storefront-http.md](./contracts/storefront-http.md).
- **Rationale**:
  - `catalog` đã sở hữu đường đọc sản phẩm của Trang bán hàng. Mũi tên `catalog → stock` đã có trong
    đồ thị, nên không phải vẽ thêm mũi tên nào. AD-17 cấm module `cart`, và đây không phải module đó:
    không có bảng, không có state, chỉ có một controller đọc.
  - Dùng `POST` vì body là một danh sách có cấu trúc. Cách này cũng không để lại cặp
    `(product, quantity)` trong URL và log truy cập. Thao tác vẫn **chỉ đọc**, không ghi gì
    (FR-011), và CSRF không có nghĩa với nó.
  - Enum riêng `CartLineStatus` **không mở rộng** `StockStatusSchema`. Comment trong `product.ts` cấm
    thêm giá trị thứ ba vào enum đó.
  - `not_found` tồn tại để client **bỏ** các id lạ (xem Edge Cases trong spec). Đây là giá trị của
    hợp đồng HTTP, không phải một trạng thái cảnh báo thứ tư trên UI.
- **Alternatives considered**:
  - `GET /api/products/:id` gọi N lần: 20 dòng thành 20 request và 40 truy vấn, khó giữ ≤ 400 ms p95
    (SC-007). Cách này cũng vẫn không phát hiện được dòng vượt tồn kho.
  - `GET /api/products?ids=…&qty=…`: làm đục hợp đồng danh sách sản phẩm đã đóng ở `001`, và đưa số
    lượng vào URL.
  - Trả `availableQuantity`: vi phạm thẳng AD-19. Đã bị loại ở D1.

## R2 — Phép so sánh tồn kho thuộc `stock`, trả enum (AD-5, AD-19, AD-22)

- **Decision**: thêm vào `stock.public.ts` hàm
  `getStockSufficiency(queryable, lines) → Map<productId, 'sufficient' | 'insufficient' | 'out_of_stock'>`.
  Hàm dùng một truy vấn `SELECT product_id, quantity FROM stock WHERE product_id = ANY($1)` qua hàm
  repository mới `readStockQuantities`. **Con số không ra khỏi `stock`.** `catalog` chỉ nhận enum rồi
  ánh xạ sang `CartLineStatus`.
- **Rationale**: nếu `catalog` nhận số rồi tự so sánh thì con số đã rời module sở hữu nó. Làm theo
  cách trên thì luật hình dạng của AD-19 được giữ ngay từ biên module, không chỉ ở biên HTTP. Sản phẩm
  chưa có dòng `stock` được coi là `out_of_stock`, cùng quy tắc với `getStockStatus` hiện có.
- **Alternatives considered**: gọi `getStockStatus` cho từng dòng. Cách này không phân biệt được
  `exceeds_stock` và tốn N truy vấn.

## R3 — Giới hạn kỹ thuật cho số lượng và số dòng (Q1 = A)

- **Decision**: `quantity` là số nguyên từ 1 tới **9 999**, và một request có tối đa **100 dòng**.
  Vượt giới hạn thì trả `400` với envelope lỗi chuẩn. Ở client, ô số lượng từ chối giá trị trên
  9 999 và hiện câu "Số lượng quá lớn." như mọi giá trị không hợp lệ khác (FR-004).
- **Rationale**: đây là giới hạn chống nhập liệu vô lý và chống tràn số, **không phải luật sản phẩm**.
  Không khách thật nào mua một món quá 9 999 cái ở quy mô shop này. Giới hạn 100 dòng giữ truy vấn
  `ANY($1)` bị chặn trên, còn SC-007 chỉ đo tới 20 dòng.
- **Rủi ro đã chấp nhận (D1, Q1 = A, Tuan Nguyen 2026-09-23)**: đổi `quantity` rồi quan sát lúc
  `lineStatus` chuyển từ `ok` sang `exceeds_stock`, có thể suy ra con số tồn kho chính xác của một
  sản phẩm sau khoảng log₂(9 999) ≈ 14 lần gọi. **Không có biện pháp giảm thiểu nào ở feature này.**
  Không có rate limit, vì nó sẽ là một cơ chế mới cần thiết kế và không có FR nào yêu cầu. Luật hình
  dạng type của AD-19 vẫn đúng. Mục đích "con số không rời Trang quản trị" chỉ còn giữ ở mức hợp đồng.
  Rủi ro này phải được đưa vào amendment baseline của D1.

## R4 — Lưu giỏ trong trình duyệt (AD-17, FR-001, FR-020, FR-021)

- **Decision**:
  - Khoá `localStorage` là `shop_cart`, giá trị là `{ "v": 1, "lines": [{ "productId": 1, "quantity": 2 }] }`.
  - Toàn bộ đọc và ghi đi qua **một** module `apps/storefront/src/cart/cartStore.ts`.
  - Mỗi lần ghi là **đọc lại từ storage → sửa → ghi**. Tab không giữ bản giỏ nào làm nguồn để ghi
    (FR-021).
  - Thông báo thay đổi có hai đường: sự kiện `storage` của trình duyệt cho **tab khác**, và một
    listener nội bộ cho **tab hiện tại** (vì `storage` không bắn ở tab vừa ghi). React đọc qua
    `useSyncExternalStore`, cùng cách `router/usePathname.ts` đang làm.
  - Khi đọc, dữ liệu được sửa theo luật của Edge Cases: JSON hỏng hoặc sai `v` thì coi là giỏ rỗng;
    dòng có số lượng không hợp lệ thì bỏ; dòng trùng `productId` thì gộp bằng cách cộng số lượng rồi
    kẹp ở 9 999.
  - `localStorage` không dùng được (ném lỗi khi truy cập hoặc hết quota) thì store báo
    `unavailable`. UI hiện "Không lưu được giỏ hàng trên trình duyệt này.", việc duyệt hàng vẫn chạy.
- **Rationale**: AD-17 chỉ định `localStorage`. `sessionStorage` sẽ mất giỏ khi đóng tab, trái
  kịch bản 4 của US1. Thêm trường `v` ngay từ đầu để `004` đọc được. Gom mọi truy cập về một module
  thì FR-020 kiểm được bằng review và test, và không token hay email nào lọt vào giỏ.
- **Alternatives considered**: IndexedDB, bất đồng bộ và thừa cho vài chục dòng. Cookie thì bị gửi
  lên server theo mọi request, trái tinh thần AD-17: không dữ liệu giỏ nào đi qua server.

## R5 — Tường đăng ký và đích quay về (Clarify Q1 = B, FR-014 – FR-016)

- **Decision**:
  - Bước Đặt đơn có route `/place-order`. **Cùng một route** hiện ba nội dung theo phiên:
    - Guest thấy Tường đăng ký.
    - Shop owner thấy "Tài khoản chủ shop không đặt đơn được."
    - Customer thấy trang Đặt đơn tạm (Q2 = A).
  - Nút **Đặt đơn** ở Giỏ hàng chỉ là liên kết tới `/place-order`.
  - Tường đăng ký dẫn tới `/register?returnTo=/place-order` và `/login?returnTo=/place-order`. Liên
    kết chéo giữa hai trang đó giữ nguyên `returnTo`.
  - `returnTo` chỉ được chấp nhận khi qua `safeReturnPath(raw)`:
    - bắt đầu bằng đúng một `/`;
    - không bắt đầu bằng `//` hay `/\`;
    - không chứa ký tự điều khiển;
    - `new URL(raw, location.origin).origin === location.origin`.
    Nếu không qua thì dùng `/`. Thiếu `returnTo` thì vẫn về `/`, giữ đúng hành vi của `002`.
- **Rationale**:
  - Một route cho cả ba vai trò khớp FR-014 ("mở trực tiếp bước Đặt đơn cũng thấy Tường đăng ký")
    và FR-018, không cần redirect nào.
  - Tái dùng trang của `002` chỉ tốn một tham số. Không phải tách form ra component.
  - Kiểm tra `returnTo` ở client là đủ, vì đích luôn là điều hướng SPA nội bộ và server không bao giờ
    redirect theo tham số này.
- **Alternatives considered**:
  - Route riêng `/registration-wall` rồi redirect: thêm một bước, và vẫn phải chặn truy cập trực
    tiếp vào `/place-order`.
  - Đích quay về lưu trong `sessionStorage`: ẩn và khó test, lại là thêm một nơi lưu state thứ hai.

## R6 — Định danh trong code cho thuật ngữ của D2 (Constitution §V)

- **Decision (Tuan Nguyen xác nhận 2026-09-23)**:

  | Thuật ngữ UX (D2) | Định danh trong code / URL |
  |---|---|
  | Tường đăng ký | `RegistrationWall` |
  | Đặt đơn (bước) | `PlaceOrderPage`, route `/place-order` |
  | Giỏ hàng (trang) | `CartPage`, route `/cart` (glossary: *Cart*) |
  | Trang bán hàng | `storefront`, đã dùng từ `000` (`apps/storefront`, `shared.storefront`) |

- **Rationale**: Constitution §V bắt định danh dùng cột *Canonical term (EN)* của glossary. Ba thuật
  ngữ trên chưa có cột EN, và D2 chỉ cho phép dùng nguyên văn tiếng Việt **trong tài liệu**.
  `place-order` khớp slug `004-place-order` trong `feature-map.md`. `storefront` đã là tiền lệ.
  Các từ bị cấm theo D2 ("checkout", "login wall", "paywall") không xuất hiện.
- **Hiệu lực**: bảng trên là tên chính thức cho code/URL của feature này và khớp các dòng glossary *Registration wall*, *Place order*, *Storefront* có từ `baseline-0002-ecommerce`. Không task nào đặt tên khác.

## R7 — Nguồn vai trò phiên cho UI (FR-018)

- **Decision**:
  - Thêm hook `useCurrentAccount()` trong `apps/storefront/src/api/`. Hook gọi `getCurrentUser()`
    (có sẵn từ `002`) mỗi lần mount và mỗi lần `pathname` đổi, giống cách `AuthHeader` đang làm.
  - `AuthHeader`, `ProductDetailPage` và `PlaceOrderPage` dùng chung hook này. Trong lúc đang tải,
    **ẩn** biểu tượng giỏ và nút thêm giỏ, để một Chủ shop không thoáng thấy chúng.
- **Rationale**: không thêm cache toàn cục. Dữ liệu phiên không thuộc phạm vi AD-20, nhưng giữ cùng
  kỷ luật "gọi lại, không nhớ" thì bớt một loại state.
- **Alternatives considered**: một React context toàn ứng dụng. Phải sửa `App.tsx` nhiều hơn mà
  không thêm hành vi nào được yêu cầu.

## R8 — Accessibility (ux-spec §Accessibility, WCAG 2.1 AA)

- **Decision**:
  - Mỗi thay đổi không do người dùng trực tiếp gây ra phải được đọc qua một vùng `aria-live="polite"`
    trên trang Giỏ hàng: số lượng đổi, dòng bị xoá, cờ dòng xuất hiện hoặc biến mất sau khi kiểm tra
    lại, tổng tiền hàng đổi. Header có vùng thông báo riêng cho "Đã thêm vào giỏ hàng."
  - Thêm primitive `QuantityStepper` vào `packages/ui`: nút − / + và ô số, mỗi control tối thiểu
    44×44 px, có nhãn truy cập "Giảm số lượng {tên}" và "Tăng số lượng {tên}".
  - Lỗi ô số lượng hiện ngay dưới ô và nối bằng `aria-describedby`.
  - Nút vô hiệu hoá luôn kèm lý do bằng chữ ngay cạnh: thêm giỏ khi hết hàng, Đặt đơn khi có dòng bị
    cờ, giỏ rỗng hoặc chưa kiểm tra được.
  - Route mới có thông báo riêng trong `announcementFor()`.
  - e2e chạy `@axe-core/playwright` trên `/cart` và `/place-order`.
- **Rationale**: đây là sàn cứng của constitution. `packages/ui` là nơi đặt primitive dùng chung, vì
  `004` sẽ cần lại stepper.

## R9 — Hiệu năng (SC-007)

- **Decision**:
  - Đường kiểm tra trạng thái dòng dùng **đúng hai truy vấn** bất kể số dòng: một cho sản phẩm và ảnh
    đại diện qua `findProductsByIds` mới trong `catalog.repository.ts`, một cho tồn kho qua
    `readStockQuantities`.
  - Biểu tượng giỏ đọc từ `localStorage`, **không gọi API**, nên trang chủ và trang chi tiết không
    thêm request nào chặn render. Các ngưỡng p95 đã đo ở `000` giữ nguyên.
  - Đo SC-007 bằng cách mở rộng `e2e/performance.e2e-spec.ts` với một giỏ 20 dòng.
- **Rationale**: N+1 là cách dễ nhất để trượt ≤ 400 ms p95. Seed hiện chỉ có 5 sản phẩm, trong khi
  `performance.e2e-spec.ts` hiện đo trên seed có sẵn và không tự dựng fixture nào. Vì vậy phép đo 20
  dòng cần **20 sản phẩm fixture** do setup của chính test chèn vào và dọn đi. Cách chèn là việc của
  task sở hữu SC-007 và phải tôn trọng AD-28: cô lập bằng `TRUNCATE`/xoá trên state đã commit, không
  dùng transaction-rollback.
