---
description: "Task list for feature 000-walking-skeleton"
---

# Tasks: Walking Skeleton

**Input**: Design documents from `specs/000-walking-skeleton/`

**Prerequisites**: plan.md ✓ · spec.md ✓ · research.md ✓ · data-model.md ✓ · contracts/ ✓ · quickstart.md ✓

**Tests**: BẮT BUỘC. Constitution §II là NON-NEGOTIABLE — test đỏ → được duyệt → mới viết code.
Không có đường tắt "viết code trước, bổ test sau".

**Organization**: nhóm theo user story của `spec.md`. Cả ba story đều P1, nên thứ tự phase ở
đây theo **phụ thuộc kỹ thuật**, không theo độ ưu tiên.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1 / US2 / US3 — chỉ gắn cho task thuộc phase user story
- **Owns**: tiêu chí nghiệm thu mà task này sở hữu (HV007b). Mỗi tiêu chí có **đúng một** chủ.
- **🐳**: task cần Docker chạy được. Docker hiện **chưa dùng được** trong distro WSL này.

## Forbidden scope — áp cho MỌI task, không ngoại lệ

```text
docs/baseline/**              .specify/memory/constitution.md
_bmad/**                      .specify/scripts/**
.specify/templates/**         specs/000-walking-skeleton/spec.md
specs/000-walking-skeleton/plan.md
```

Chạm vào bất kỳ đường dẫn nào ở trên = **STOP và báo xung đột**, không tự sửa (CLAUDE.md §3).
"Tiện tay sửa luôn" bị từ chối ở review (CLAUDE.md §5).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dựng bộ xương thư mục, hạ tầng chạy được, và **lớp phòng thủ trước mọi bề mặt**.

- [ ] T001 Dựng monorepo workspaces tại gốc repo: thêm `workspaces` vào `package.json`, tạo `apps/`, `packages/`, `e2e/`, `db/`, `ops/`, tsconfig gốc + tsconfig kế thừa cho từng workspace. Pin **đúng** phiên bản trong `plan.md` §Technical Context, không dist-tag, không `latest`, không `^`/`~` cho runtime deps (Constitution §VI). Nối nửa sản phẩm vào `scripts/verify.mjs` để nó thôi báo SKIPPED.
  - **Owns**: —
  - **Allowed**: `package.json`, `tsconfig*.json`, `apps/`, `packages/`, `e2e/`, `db/`, `ops/` (tạo thư mục), `scripts/verify.mjs`
  - **Note**: `scripts/verify.mjs` là glue layer — sửa tối thiểu, chỉ để nhận diện workspace.

- [ ] T002 [P] 🐳 Viết `ops/compose.yaml`: dịch vụ `postgres` (PostgreSQL **18.6**, pin theo tag ảnh), `api`, `proxy` (Caddy **2.11.4**, pin theo tag, **không** `2`, **không** `latest`), volume ảnh sản phẩm. Dịch vụ `postgres` là **dịch vụ dùng chung cho cả chạy thật lẫn test**, không dựng lại mỗi lần chạy (AD-27, AD-28).
  - **Owns**: `AC-AD27`
  - **Allowed**: `ops/compose.yaml`, `ops/.env.example`
  - **Forbidden**: mọi thứ dưới `apps/`, `packages/`

- [ ] T003 [P] Viết `ops/Caddyfile`: một origin; `/api/*` → NestJS và **không bao giờ** rơi vào SPA fallback; `/admin/*` → giữ chỗ, chưa có bundle; còn lại → tệp tĩnh `storefront`, không khớp thì `index.html` của `storefront`. Phát header an toàn cho **CẢ HAI** đường dẫn bán hàng và quản trị, nguyên văn theo `contracts/storefront-http.md`: `default-src 'self'`; `script-src 'self'` (**không** `unsafe-inline`, **không** `unsafe-eval`, **không** CDN); `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`; `connect-src 'self'`; `style-src 'self' 'unsafe-inline'` (nhượng bộ **chỉ** cho style); `Referrer-Policy: same-origin`; `X-Content-Type-Options: nosniff`.
  - **Owns**: `AC-AD29`
  - **Allowed**: `ops/Caddyfile`
  - **Note**: AD-29 đòi thứ này hạ cánh **cùng lúc với Caddy**, không phải sau. Nới lỏng bất kỳ directive nào là thay đổi trên nhánh `baseline/*`, không phải quyết định trong task này.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: không user story nào bắt đầu được trước khi phase này xong.

- [ ] T004 🐳 Cấu hình Drizzle Kit **0.31.10** và viết migration đầu tiên trong `db/migrations/` dựng **năm bảng** đúng theo `data-model.md`: `category`, `product`, `product_image`, `stock`, `stock_ledger`. Bắt buộc có: `CHECK (quantity >= 0)` trên `stock.quantity`; `CHECK (price >= 0)` trên `product.price`; `CHECK (delta <> 0)` và `CHECK (quantity_after >= 0)` trên `stock_ledger`; `stock.product_id` FK `ON DELETE CASCADE`; `stock_ledger.product_id` FK **`ON DELETE RESTRICT`**; `stock_ledger.order_id` **KHÔNG** khoá ngoại (giá trị trần, AD-24); `stock_ledger.reason` enum đúng ba giá trị `order_placed | order_cancelled | manual_adjustment`; `stock_ledger.actor_account_id` nullable. Tiền là `bigint` VND nguyên; thời gian `timestamptz`. Áp bằng `drizzle-kit migrate` như một bước **trước khi** app khởi động, một nơi duy nhất. **`drizzle-kit push` bị cấm ở mọi môi trường, kể cả máy dev.** Tên file mang dấu thời gian, không số đếm. Mô tả migration ghi rõ nó **giữ nguyên** ràng buộc nào của AD-1 và AD-24.
  - **Owns**: `AC-AD25`
  - **Allowed**: `db/migrations/`, `db/drizzle.config.ts`, `package.json` (script `db:migrate`)
  - **Forbidden**: `apps/**`, `packages/**`

- [ ] T005 🐳 Viết `db/seed.ts` nạp Sản phẩm mẫu: **idempotent** (chạy lại nhiều lần cho cùng một trạng thái), **không bao giờ chạy ở prod**, tách hẳn khỏi `db/migrations/`. Nạp tối thiểu một Category, một Product có mô tả + giá + ít nhất một `product_image`, và một dòng `stock` với `quantity > 0`. Thêm script `db:seed` vào `package.json`.
  - **Owns**: —
  - **Allowed**: `db/seed.ts`, `package.json` (script `db:seed`)
  - **Note**: cơ chế này là quyết định của người, chốt 2026-09-19 (`plan.md` §Quyết định đã chốt (A)). AD-25 chỉ phủ migration lược đồ.

- [ ] T006 [P] Viết `packages/shared`: schema hợp đồng HTTP + type **suy ra từ schema**, không khai tay. Tách không gian tên **`storefront`** (ở `000` chỉ có nó) và **`backoffice`** (để trống, `006` sẽ dùng). Định nghĩa hình dạng `ProductSummary`, `ProductDetail`, `stockStatus ∈ {in_stock, out_of_stock}`, và **một envelope lỗi duy nhất** có chỗ cho payload lỗi có kiểu. Thêm schema validate **cấu hình triển khai**, validate **một lần lúc khởi động**; cấm rải `process.env`.
  - **Owns**: —
  - **Allowed**: `packages/shared/**`
  - **Note**: AD-10 — đây là **nguồn sự thật duy nhất** của mọi hình dạng qua biên HTTP. Cả hai phía validate bằng **chính** schema này; FE không khai lại interface cho response.

- [ ] T007 [P] Viết `packages/ui` ở mức tối thiểu: design token và primitive phục vụ sàn WCAG 2.1 AA, gồm primitive nhãn tình trạng tồn kho hiển thị **bằng chữ** (không bao giờ chỉ bằng màu) và cơ chế thông báo đổi route cho screen reader (SPA không có ranh giới tải trang làm việc đó thay). **Không** thêm component nào chưa có chỗ dùng ở `000`.
  - **Owns**: —
  - **Allowed**: `packages/ui/**`
  - **Note**: ở `000` chỉ có một người dùng; `006` là người thứ hai. Đây là ứng viên gộp đầu tiên nếu phải cắt (`plan.md` §Dự báo số task).

**Checkpoint**: hạ tầng, lược đồ, hợp đồng và lớp phòng thủ đã sẵn sàng.

---

## Phase 3: User Story 2 — Tồn kho đúng dưới tải đồng thời (P1) 🎯 lõi rủi ro

**Goal**: chứng minh bất biến trung tâm của sản phẩm — tồn kho không bao giờ âm, và số lần rút
thành công không bao giờ vượt lượng có thật.

**Independent Test**: không cần giao diện, không cần HTTP. Với Sản phẩm tồn kho M, chạy N kết
nối độc lập cùng rút 1 đơn vị (N > M) và đếm số lần thành công.

**Vì sao phase này đi trước US1**: đây là **lý do feature 000 tồn tại**. Một trang chủ chạy
được mà không có bằng chứng này thì chưa chứng minh gì.

### Tests for User Story 2 ⚠️ VIẾT TRƯỚC, PHẢI ĐỎ TRƯỚC KHI CÓ T009

- [ ] T008 🐳 [US2] Viết bốn test trong `apps/api/src/modules/stock/`, chạy dưới **Jest**, tất cả phải **ĐỎ** trước khi T009 bắt đầu:
  `stock-conditional-delta.race-spec.ts` — N ≥ 20 kết nối độc lập, tồn kho M ≥ 5, mỗi kết nối rút 1; đúng **M** lần thành công, **N − M** lần trả "0 dòng bị ảnh hưởng", `quantity` cuối = 0, không thời điểm nào âm; **chạy lại ≥ 10 lần liên tiếp trên cùng database mà không dựng lại nó** cho kết quả giống hệt.
  `stock-never-negative.int-spec.ts` · `stock-ledger-matches-quantity.int-spec.ts` · `stock-ledger-restrict.int-spec.ts` (xoá Product có sổ cái bị `RESTRICT` chặn ở tầng dữ liệu).
  **Luật cô lập (AD-28):** chạy trên **trạng thái đã commit**, nhiều kết nối độc lập, dọn bằng `TRUNCATE`. **KHÔNG BAO GIỜ** transaction rollback — cách đó gộp N tiến trình vào một transaction, tranh chấp biến mất và test xanh vô nghĩa. **KHÔNG BAO GIỜ** nhiều promise trên một kết nối. Mọi test tự tạo dữ liệu nó cần, không giả định database sạch.
  - **Owns**: `AC-AD21`, `AC-AD28`, `SC-002`
  - **Allowed**: `apps/api/src/modules/stock/**` (chỉ file test), `apps/api/jest.config.*`, `apps/api/test/`
  - **Forbidden**: `apps/storefront/**`, `packages/**`, mọi file không phải test trong `stock/`

### Implementation for User Story 2

- [ ] T009 🐳 [US2] Viết module `stock` trong `apps/api/src/modules/stock/`: entity/repository cho `stock` + `stock_ledger`, và service công khai `stock.public.ts`. Đường ghi tồn kho là **một câu `UPDATE` có điều kiện trên giá trị đang có** — `SET quantity = quantity - :n WHERE product_id = :id AND quantity >= :n` — **không** `SELECT` rồi `UPDATE` theo giá trị vừa đọc, ở bất kỳ đường nào. **Số dòng bị ảnh hưởng = 0 là giá trị trả về hợp lệ và phải được xử lý tường minh**, không phải exception. Mỗi lần ghi thành công kèm **một dòng `stock_ledger`** trong **cùng** đơn vị công việc. Service nhận đơn vị công việc **làm tham số** khi tham gia thao tác lớn hơn và **không bao giờ tự mở cái nó đã nhận** (AD-23, ràng buộc chữ ký hàm, đọc được ở review). `stock` **không biết `ordering` tồn tại**.
  - **Owns**: `AC-AD1`
  - **Allowed**: `apps/api/src/modules/stock/**`
  - **Forbidden**: `apps/api/src/modules/catalog/**`, `apps/api/src/usecases/**` (không tạo ở `000`), `apps/storefront/**`
  - **Depends on**: T004, T008 (đỏ)

**Checkpoint**: bất biến trung tâm đã có bằng chứng. `npm test` chạy tới `*.race-spec.ts`.

---

## Phase 4: User Story 1 — Trang chủ có một Sản phẩm thật (P1)

**Goal**: lát cắt dọc nhìn thấy được — proxy → SPA → API → PostgreSQL.

**Independent Test**: dựng sạch, seed một Sản phẩm, mở trang chủ và trang chi tiết, đối chiếu
từng trường với dữ liệu đã nạp; đổi dữ liệu ở nguồn rồi tải lại.

### Tests for User Story 1 ⚠️ VIẾT TRƯỚC, PHẢI ĐỎ TRƯỚC KHI CÓ T011

- [ ] T010 🐳 [P] [US1] Viết contract test cho đường đọc trong `apps/api/src/modules/catalog/` (Jest + supertest), phải **ĐỎ** trước T011. Phủ: `GET /api/products` và `GET /api/products/:id` trả đúng hình dạng của `packages/shared`; **`Cache-Control: no-store`** trên mọi response chứa `stockStatus`; và — quan trọng nhất — **đọc TOÀN BỘ thân response và khẳng định không có con số tồn kho nào ở bất cứ đâu**, không chỉ kiểm màn hình. Thêm một test khẳng định **không tầng nào cache** `stockStatus`: đổi `quantity` ở database rồi gọi lại ngay, giá trị trả về phải đổi theo.
  - **Owns**: `FR-006`, `FR-007`, `SC-005`
  - **Allowed**: `apps/api/src/modules/catalog/**` (chỉ file test), `apps/api/test/`
  - **Depends on**: T006

- [ ] T011 🐳 [US1] Viết module `catalog` trong `apps/api/src/modules/catalog/`: repository + service + controller cho `category`, `product`, `product_image`; `name_normalized` chuẩn hoá **lúc ghi**, không lúc đọc (AD-11). Đường đọc ghép tình trạng tồn kho bằng **lời gọi service công khai `catalog → stock`** — **KHÔNG `JOIN` qua biên module** (AD-5: khoá ngoại không bao giờ là giấy phép `JOIN`). Trả `price` là **số nguyên VND đã gồm VAT**, không thập phân, không dòng thuế tách riêng. Ảnh đại diện là `product_image` có `position` nhỏ nhất. Sản phẩm không tồn tại → **HTTP 404** với envelope lỗi dùng chung, **không stack trace ra client**. Thêm `GET /api/health`, log có cấu trúc ra stdout kèm `request_id`, và validate cấu hình **một lần lúc khởi động** bằng schema của `packages/shared`.
  - **Owns**: `FR-001`, `FR-002`, `FR-004`
  - **Allowed**: `apps/api/src/modules/catalog/**`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
  - **Forbidden**: `apps/api/src/modules/stock/**` (chỉ được gọi qua `stock.public.ts`), `apps/storefront/**`
  - **Depends on**: T009, T010 (đỏ)

- [ ] T012 🐳 [US1] Viết `apps/storefront` (React 19.3.0 + Vite 8.3.0, **bundle riêng**, entry point riêng, thư mục output riêng — AD-9): trang chủ với lưới thẻ sản phẩm, và **trang chi tiết Sản phẩm** tối giản (tên, mô tả, giá, ít nhất một ảnh, nhãn tồn kho) — **không** nút thêm vào giỏ, **không** sản phẩm liên quan, **không** đánh giá. Nhãn tồn kho đúng hai giá trị **chữ**: "Còn hàng" / "Hết hàng", **không bao giờ chỉ bằng màu**. **Sản phẩm hết hàng vẫn hiện trong lưới và vẫn mở được** — không ẩn. Lưới rỗng hiện "Danh mục này chưa có sản phẩm nào." (danh sách rỗng, **không phải lỗi**). **Tầng dữ liệu phía client KHÔNG được cache `stockStatus`** — AD-20 gọi đây là tầng nguy hiểm nhất, nơi một "Còn hàng" cũ sống lâu nhất và không lệnh server nào với tới. Dùng primitive của `packages/ui`; không import chéo sang bundle nào khác. Test dưới **Vitest**.
  - **Owns**: `FR-003`, `FR-005`, `FR-008`, `SC-001`
  - **Allowed**: `apps/storefront/**`
  - **Forbidden**: `apps/api/**`, `packages/shared/**` (chỉ được **dùng**, không sửa), `apps/backoffice/**` (không tồn tại ở `000`)
  - **Depends on**: T007, T011

**Checkpoint**: lát cắt dọc chạy end-to-end.

---

## Phase 5: User Story 3 — Bằng chứng header an toàn (P1)

**Goal**: chứng minh lớp phòng thủ của T003 thật sự phát ra, trên **cả hai** đường dẫn.

**Independent Test**: gọi đường dẫn bán hàng và đường dẫn quản trị, đọc header, đối chiếu từng
directive. Không phụ thuộc US1 hay US2.

- [ ] T013 🐳 [US3] Viết Playwright trong `e2e/`: `security-headers.e2e-spec.ts` khẳng định **cả** đường dẫn bán hàng **và** đường dẫn quản trị trả đủ CSP + `Referrer-Policy: same-origin` + `X-Content-Type-Options: nosniff`, rằng `script-src` **không** có `unsafe-inline`/`unsafe-eval`/CDN, và rằng `'unsafe-inline'` chỉ xuất hiện ở `style-src`. **Đường dẫn quản trị chưa có bundle ở `000` — phản hồi dù là gì vẫn phải mang đủ header.** Thêm `storefront-journey.e2e-spec.ts` (mở trang chủ → bấm sản phẩm → trang chi tiết) và kiểm sàn **WCAG 2.1 AA** bằng `@axe-core/playwright`, gồm thông báo đổi route cho screen reader.
  - **Owns**: `SC-004`
  - **Allowed**: `e2e/**`, `playwright.config.ts`
  - **Forbidden**: `apps/**`, `packages/**`
  - **Note**: E2E **không phải** nơi chứng minh bất biến (AD-28). Một luồng E2E xanh không bao giờ được tính là đã chứng minh tính nguyên tử — bằng chứng đó nằm ở T008.
  - **Note**: `npx playwright install` cần **mạng lần đầu**.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T014 🐳 Đo và ghi lại ba ngưỡng p95 của `prd.md` §8: thời lượng mỗi request ghi vào log có cấu trúc, cộng một endpoint tổng hợp **nội bộ** trả lời "p95 hôm nay bao nhiêu". Khẳng định trang chủ ≤ **1,5 s** p95 và đường đọc API ≤ **400 ms** p95. Không có nó thì ba NFR hiệu năng là ba câu không kiểm chứng được.
  - **Owns**: `SC-003`
  - **Allowed**: `apps/api/src/**` (tầng quan sát), `e2e/**`
  - **Depends on**: T012

- [ ] T015 🐳 Chạy trọn `quickstart.md` trên một **clone sạch**: `docker compose up postgres` → `db:migrate` → `db:seed` → `compose up` → bốn lệnh của `verification.md` chạy **nguyên văn**. Khẳng định cả bốn exit 0 **và output cho thấy nửa sản phẩm ĐÃ CHẠY**, không phải `SKIPPED — no product workspace exists yet`. Nếu một bất biến cần test mà lệnh hiện tại không chạy tới, **sửa `docs/baseline/verification.md`** — đó là ngoại lệ duy nhất với forbidden scope ở đầu file, và nó cần người duyệt trên nhánh `baseline/*` (AD-21: sửa hợp đồng, đừng bỏ test). Đạt lại toàn bộ SC-001…SC-006 sau khi dựng lại.
  - **Owns**: `SC-006`, `SC-007`
  - **Allowed**: `specs/000-walking-skeleton/quickstart.md` (chỉnh lệnh nếu lệch thực tế), `README.md`
  - **Forbidden**: `docs/baseline/**` — **trừ** trường hợp `verification.md` nêu trên, và **phải hỏi người trước**
  - **Depends on**: tất cả

---

## Traceability — HV007b

**21 tiêu chí, 21 chủ sở hữu, không cái nào mồ côi, không cái nào hai chủ.**

| Tiêu chí | Chủ | Tiêu chí | Chủ | Tiêu chí | Chủ |
|---|---|---|---|---|---|
| FR-001 | T011 | FR-008 | T012 | SC-001 | T012 |
| FR-002 | T011 | AC-AD1 | T009 | SC-002 | T008 |
| FR-003 | T012 | AC-AD21 | T008 | SC-003 | T014 |
| FR-004 | T011 | AC-AD25 | T004 | SC-004 | T013 |
| FR-005 | T012 | AC-AD27 | T002 | SC-005 | T010 |
| FR-006 | T010 | AC-AD28 | T008 | SC-006 | T015 |
| FR-007 | T010 | AC-AD29 | T003 | SC-007 | T015 |

Task không sở hữu tiêu chí nào: T001, T005, T006, T007 — hạ tầng và hợp đồng, không có tiêu
chí nghiệm thu riêng trong `spec.md`. Chúng vẫn bắt buộc; không có chúng thì không task nào
khác chạy được.

---

## Dependencies & Execution Order

```text
T001 ──┬── T002 [P] ──┐
       └── T003 [P] ──┤
                      ├── T004 ── T005
                      │      └──── T008 ── T009 ──┐
                      ├── T006 [P] ── T010 [P] ───┤
                      └── T007 [P] ───────────────┤
                                                  ├── T011 ── T012 ──┬── T013
                                                  │                  └── T014
                                                  └──────────────────────── T015
```

### Parallel Opportunities

- **T002 ∥ T003** — khác file trong `ops/`
- **T006 ∥ T007** — khác package
- **T008 ∥ T010** — khác module, cả hai là test, cả hai phải đỏ trước phần code của mình
- **T013 ∥ T014** — sau khi T012 xong

Superpowers dùng `superpowers:dispatching-parallel-agents` cho các cặp trên.

### Luật TDD trong từng cặp

| Test (đỏ trước) | Code (làm xanh) |
|---|---|
| T008 | T009 |
| T010 | T011 |

Code **không được bắt đầu** trước khi test của nó đỏ và được duyệt (Constitution §II).

---

## Implementation Strategy

### MVP

Feature `000` **không có MVP nhỏ hơn chính nó**. Ba user story đều P1, và cắt bất kỳ cái nào
cũng bỏ mất lý do feature tồn tại: US2 là bằng chứng bất biến, US3 là lớp phòng thủ phải có
trước bề mặt, US1 là thứ duy nhất nhìn thấy được. Điểm dừng có ý nghĩa sớm nhất là
**hết Phase 3** — lúc đó bất biến trung tâm đã có bằng chứng dù chưa ai mở được trang nào.

### Trần 15 task

**Đúng 15/15. Không còn chỗ trống.** Bất kỳ task nào phát sinh thêm đều buộc phải cắt một
task đang có. Thứ tự cắt đã ghi sẵn (`plan.md` §Dự báo số task):

1. Gộp `packages/ui` (T007) vào `apps/storefront` — `006` sẽ phải tách ra lại
2. Trang chi tiết Sản phẩm — **đảo quyết định của người ngày 2026-09-19, phải hỏi lại**
3. ~~Test tải đồng thời AD-21~~ — **không bao giờ**
4. ~~CSP/header AD-29~~ — **không bao giờ**

### Chặn môi trường

**11/15 task mang 🐳** và không chạy được cho tới khi Docker dùng được trong distro WSL này
(`docs/tooling-versions.md`). AD-27 cấm thay PostgreSQL thật bằng `pg-mem`, shim SQLite hay
repository giả — những thứ đó khiến test *"xanh mà không chứng minh gì, tệ hơn không có test,
vì nó tạo cảm giác an toàn và làm AD-21 thành nghi lễ"*. Đây là **điều kiện tiên quyết**, không
phải lý do đổi thiết kế.

Bốn task chạy được ngay không cần Docker: **T001, T003, T006, T007**.

---

## Notes

- Mỗi task nhận context qua `.sdd/000-walking-skeleton/task-<NNN>-brief.md`, **không phải** cả repo và **không phải** cả spec (CLAUDE.md §2).
- Ba thứ bị từ chối mặc định ở review: thay đổi ngoài allowed scope; tên không có trong `glossary.md`; test xanh mà không chứng minh được bất biến nó mang tên.
- Commit sau mỗi task hoặc mỗi nhóm hợp lý. Mỗi MR mang chuỗi truy vết đầy đủ từ `PRD FR-xxx` tới file test (Constitution §Merge request).
