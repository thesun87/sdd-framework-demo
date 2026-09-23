# Implementation Plan: Cart & Registration Wall

**Branch**: `003-cart-and-wall` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-cart-and-wall/spec.md`

**Baseline**: `baseline-0002-ecommerce`. Plan dẫn xuất từ dòng `003-cart-and-wall` trong
`docs/baseline/feature-map.md`, từ PRD §4.3–4.4 (FR-6, FR-7, FR-8, FR-11) và từ AD-5, AD-8,
AD-10, AD-17, AD-19, AD-20, AD-22. Plan **không** mở lại baseline. Hai điểm lệch có ghi nhận là
D1 và D2 trong [impact-analysis.md](./impact-analysis.md); cả hai đã vào baseline ở `baseline-0002-ecommerce`
(ADR-0001), xem mục *Nợ baseline* bên dưới.

## Summary

Giỏ hàng sống hoàn toàn trong `localStorage`:

- mỗi dòng chỉ có `productId` + `quantity`;
- mọi thao tác đọc bản mới nhất rồi mới ghi;
- đồng bộ tức thì giữa các tab.

Server có đúng một đường **đọc** mới, `POST /api/cart-lines/status`, trong module `catalog`:

- trả giá hiện tại và một enum trạng thái cho từng dòng;
- phép so sánh với tồn kho nằm trong `stock.public.ts`, nên con số tồn kho không rời module `stock`.

Phía Trang bán hàng:

- nút **Thêm vào giỏ hàng** ở Chi tiết sản phẩm;
- biểu tượng giỏ đếm tổng số lượng;
- trang Giỏ hàng có sửa số lượng, xoá dòng, tổng tiền hàng, cờ cấp dòng và nút **Đặt đơn** có điều
  kiện.

Route `/place-order` hiện một trong ba nội dung:

- Guest thấy **Tường đăng ký**, với hai nút dẫn sang trang Đăng ký và Đăng nhập của `002`, mang theo
  `returnTo` đã kiểm tra an toàn;
- Customer thấy trang Đặt đơn tạm;
- Shop owner thấy câu từ chối.

Đăng ký, đăng nhập và đăng xuất không chạm vào giỏ. Không có migration và không có bảng nào.

## Technical Context

Không còn `NEEDS CLARIFICATION` nào ([research.md](./research.md)). Mọi phiên bản đã pin trong
baseline, và **không thêm phụ thuộc mới nào**.

**Language/Version**: TypeScript 5.9.x trên Node.js 24.21.0 (sàn hiệu lực `>=24.15`)

**Primary Dependencies**: NestJS 11.2.5 · React 19.3.0 · Vite 8.3.0 · Zod 4.6.5 · `pg` qua pool sẵn
có của `catalog`. Không thêm thư viện state hay data-fetching nào (xem ghi chú đầu
`apps/storefront/src/api/client.ts`).

**Storage**: `localStorage` của trình duyệt, khoá `shop_cart` (AD-17). PostgreSQL 18.6 **chỉ đọc**
`product`, `product_image`, `stock`, không ghi dòng nào.

**Testing**: Jest 30.4.2 (`apps/api`, `*.int-spec.ts`) · Vitest 5.0.1 (`apps/storefront`,
`packages/shared`, `packages/ui`) · Playwright 1.62.1 + `@axe-core/playwright` (`e2e/`).

**Target Platform**: Một VPS, một Docker Compose, một origin qua Caddy 2.11.4. SPA fallback hiện có
đã phủ `/cart` và `/place-order`, nên không sửa `ops/Caddyfile`.

**Project Type**: Modular monolith API + storefront SPA + shared schema packages.

**Performance Goals**: trang Giỏ hàng tới 20 dòng ≤ 1,5 s p95; `POST /api/cart-lines/status`
≤ 400 ms p95 (SC-007, PRD §8), bằng đúng 2 truy vấn cho mỗi request (R9). Trang chủ và Chi tiết
sản phẩm giữ ngưỡng p95 đã đo ở `000`, và không thêm request nào chặn render.

**Constraints**:

- Không bảng giỏ, không module `cart` (AD-17).
- Không giá nào đi từ client lên (AD-17), không số tồn kho nào xuống Trang bán hàng (AD-19).
- Không cache trạng thái ở tầng nào (AD-20).
- Không token hay email nào trong `localStorage` (AD-8).
- CSP hiện hành giữ nguyên (AD-29).
- Sàn WCAG 2.1 AA.
- Từ vựng: glossary cộng D2 cộng R6.

**Scale/Scope**: ≤ 100 dòng mỗi request, `quantity` 1 … 9 999 (giới hạn kỹ thuật R3). 6 user story,
21 FR.

## Constitution Check

*GATE: kiểm trước Phase 0 và kiểm lại sau Phase 1. Cả hai lần đều ĐẠT, kèm các ghi chú bên dưới.*

| Principle | Gate | Result |
|---|---|---|
| I. Baseline tối thượng | Mọi FR của spec truy về PRD FR-6, 7, 8, 11. Không phát minh yêu cầu. Xung đột với AD-19 được đưa lên người và giải ở D1, không tự quyết trong plan | **ĐẠT.** `/speckit-analyze` K1 đã chỉ ra plan trước đó chấm sai ("ĐẠT, có nợ"): D1 đã được gỡ trong spec trước khi PRD đổi. Nay PRD FR-6, `ux-spec.md` và AD-19 đã sửa ở `baseline-0002-ecommerce` (ADR-0001), nên spec chỉ còn dẫn xuất. Không có ARCHITECTURE_CONFLICT: mũi tên `catalog → stock` đã có sẵn |
| II. Test-first | Mọi task viết test đỏ trước. Bất biến FR-7 có test mang tên nó (`cart-does-not-reserve-stock.int-spec.ts`). AD-19 cho giỏ có test mang tên nó (`cart-lines-status-no-stock-number.int-spec.ts`) | **ĐẠT** |
| III. Hợp đồng kiểm chứng | Chỉ bốn lệnh của `verification.md`. Playwright treo vào `regression`. Không lệnh cục bộ | **ĐẠT** |
| IV. Phạm vi là hợp đồng | Allowed scope liệt kê ở *Project Structure*. Không chạm `db/**`, `identity/**`, `ops/**`, `apps/backoffice/**` | **ĐẠT** |
| V. Từ vựng đóng | Glossary: Cart, Cart line, Line subtotal, Stock status. D2 dùng nguyên văn tiếng Việt trong tài liệu | **ĐẠT.** Định danh code `RegistrationWall`, `PlaceOrderPage`, `/place-order`, `CartPage` (R6) được Tuan Nguyen xác nhận 2026-09-23 |
| VI. Phiên bản pin | Không thêm hay đổi phụ thuộc nào | **ĐẠT** |
| Sàn bảo mật | CSP không đổi. AD-19 là hàng rào `.strict()` trên response. Chặn open redirect bằng `safeReturnPath`. Không stack trace ra client | **ĐẠT.** Rủi ro dò tồn kho (R3) đã được người chấp nhận có ghi tên |
| Sàn a11y | `aria-live`, vùng bấm 44×44 px, lý do cạnh nút vô hiệu hoá, thông báo route, axe trên `/cart` và `/place-order` (R8) | **ĐẠT** |

## Nợ baseline — ĐÃ TRẢ ở `baseline-0002-ecommerce` (2026-09-23)

Cả năm mục dưới đây đã làm trên `baseline/0003-cart-line-status` (người duyệt, agent thực hiện theo
constitution §VII). Giữ lại để truy vết. Không task nào của feature này được sửa `docs/baseline/**`.
Ngoại lệ duy nhất vẫn cố ý nằm ngoài baseline: thông báo tạm trên trang Đặt đơn (FR-019), vì `004` thay nó.

1. `prd.md` FR-6: câu "nêu rõ số lượng còn bán được" phải đổi theo D1.
2. `ux-spec.md`: chuỗi "Chỉ còn {n} sản phẩm…" ở bảng Hết hàng và ở trạng thái (a) của dòng giỏ phải
   đổi theo D1. Các **chuỗi tạm** trong [contracts §3](./contracts/storefront-http.md) cũng chốt ở
   lần này.
3. Ghi nhận rủi ro dò tồn kho vào AD-19 hoặc phần Deferred của `architecture.md` (R3).
4. `glossary.md`: thêm Tường đăng ký, Trang bán hàng, Đặt đơn cùng tên EN tương ứng. Tên ở R6 đã
   được xác nhận làm tên tạm thời cho tới lúc đó.
5. Hai mục 1–2 không phải amendment additive, nên tăng `baseline_id` theo §A.5. Handoff sinh ra
   **trước** lần đó sẽ bị stale theo cổng 1 của constitution. Người quyết thứ tự làm.

## Project Structure

### Documentation (this feature)

```text
specs/003-cart-and-wall/
├── impact-analysis.md       # B2, read-only analysis + D1/D2
├── spec.md                  # /speckit-specify + /speckit-clarify
├── plan.md                  # this file
├── research.md              # Phase 0 (R1–R9)
├── data-model.md            # Phase 1 — browser Cart + derived statuses, no DB change
├── quickstart.md            # Phase 1 — validation guide
├── contracts/
│   └── storefront-http.md   # Phase 1 — POST /api/cart-lines/status, storage, routes
├── checklists/
│   └── requirements.md
└── tasks.md                 # /speckit-tasks (not created here)
```

### Source Code (repository root) — allowed scope của feature

```text
packages/shared/src/storefront/
├── cart.ts                          # NEW  CartLineSchema, CartLineStatusSchema, request/response
├── cart.test.ts                     # NEW
└── index.ts                         # MOD  re-export cart.js

packages/ui/src/
├── QuantityStepper.tsx              # NEW  −/+ 44×44 px, accessible labels (R8)
├── QuantityStepper.test.tsx         # NEW
└── index.ts                         # MOD  export

apps/api/src/modules/stock/
├── stock.public.ts                  # MOD  + getStockSufficiency (enum only, R2)
├── stock.repository.ts              # MOD  + readStockQuantities (ANY($1))
└── stock-sufficiency.int-spec.ts    # NEW

apps/api/src/modules/catalog/
├── cart-lines.controller.ts         # NEW  POST /api/cart-lines/status, no-store, .parse()
├── catalog.service.ts               # MOD  + getCartLineStatuses
├── catalog.repository.ts            # MOD  + findProductsByIds (+ primary image)
├── catalog.module.ts                # MOD  register CartLinesController
├── cart-lines-status.int-spec.ts                # NEW  statuses, price from DB, 400s, guest access
├── cart-lines-status-no-stock-number.int-spec.ts # NEW  AD-19 named invariant
└── cart-does-not-reserve-stock.int-spec.ts      # NEW  FR-7 named invariant

apps/storefront/src/
├── cart/cartStore.ts (+ .test.ts)   # NEW  sole localStorage access, repair, cross-tab (R4)
├── cart/useCart.ts                  # NEW  useSyncExternalStore
├── api/cart-client.ts (+ .test.ts)  # NEW  POST status, cache: "no-store"
├── api/useCurrentAccount.ts         # NEW  (R7)
├── router/router.ts (+ test)        # MOD  cart, place-order, returnTo on login/register
├── router/safeReturnPath.ts (+ test)# NEW  (R5)
├── components/AddToCartButton.tsx (+ test)   # NEW
├── components/CartIconLink.tsx (+ test)      # NEW
├── components/AuthHeader.tsx (+ test)        # MOD  render CartIconLink unless shop_owner
├── pages/CartPage.tsx (+ test)               # NEW
├── pages/PlaceOrderPage.tsx (+ test)         # NEW  wall | interim | shop-owner message
├── components/RegistrationWall.tsx (+ test)  # NEW
├── pages/ProductDetailPage.tsx (+ test)      # MOD  AddToCartButton
├── pages/LoginPage.tsx, RegisterPage.tsx (+ tests) # MOD  returnTo
├── App.tsx (+ test)                          # MOD  routes + announcementFor()
└── test/cartFixtures.ts                      # NEW

e2e/
├── cart-journey.e2e-spec.ts         # NEW  UJ-1/UJ-2 flows, tabs, shop owner, axe
└── performance.e2e-spec.ts          # MOD  SC-007 (20-line Cart)
```

**Forbidden scope**: `db/**`, `apps/api/src/modules/identity/**`, `apps/backoffice/**`,
`ops/**`, `docs/baseline/**`, `.specify/memory/**`, và mọi schema đã có trong
`packages/shared/src/storefront/product.ts` và `auth.ts`.

**Structure Decision**: giữ nguyên monorepo hiện hành. Code server mới nằm trong hai module sẵn có:
`catalog` sở hữu endpoint, `stock` sở hữu phép so sánh. Không module mới nào (AD-17), và không đi qua
`usecases`, vì đây là một đường đọc hai miền theo đúng mũi tên `catalog → stock` có sẵn (AD-22 chỉ
bắt `usecases` khi đồ thị không nối được).

## Test-to-requirement map (đầu vào cho `/speckit-tasks`)

| Spec | Test chính |
|---|---|
| FR-001, 003, 004, 005, 020, 021, Edge Cases | `cartStore.test.ts` |
| FR-002, US1-1/2/3 | `AddToCartButton.test.tsx`, `CartIconLink.test.tsx` |
| FR-006, 009, 010, US2, US3 | `CartPage.test.tsx` |
| FR-007, 008, 012, US3-6 | `cart-lines-status.int-spec.ts`, `cart-lines-status-no-stock-number.int-spec.ts`, `stock-sufficiency.int-spec.ts`, `cart-client.test.ts` |
| FR-011 (PRD FR-7), US1-7/8 | `cart-does-not-reserve-stock.int-spec.ts` |
| FR-013, US4 | `cart-journey.e2e-spec.ts` (register/login/logout keep Cart) |
| FR-014, 015, 016, 017, US5 | `safeReturnPath.test.ts`, `router.test.ts`, `LoginPage.test.tsx`, `RegisterPage.test.tsx`, `PlaceOrderPage.test.tsx`, e2e |
| FR-018, US6 | `AuthHeader.test.tsx`, `ProductDetailPage.test.tsx`, `PlaceOrderPage.test.tsx`, e2e |
| FR-019 | `PlaceOrderPage.test.tsx` |
| SC-007 | `performance.e2e-spec.ts` |
| SC-008 | toàn bộ `npm run test:regression` |

## Complexity Tracking

Không có vi phạm constitution nào cần biện minh.
