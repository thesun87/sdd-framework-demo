# Task T013 — Playwright: bằng chứng header an toàn + luồng người dùng + WCAG

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T013**, `tasks.md` §Phase 5 (US3)
- **Owns**: `SC-004` — 100% phản hồi trang mang đủ header an toàn của AD-29, đo trên **cả**
  đường dẫn bán hàng **và** đường dẫn quản trị
- Spec: `spec.md` User Story 3 kịch bản 1–5; `AC-AD29`; `SC-004`
- Contract: `specs/000-walking-skeleton/contracts/storefront-http.md` §Hợp đồng của reverse proxy
- Architecture: `docs/baseline/architecture.md` AD-9, AD-28, AD-29

## Objective

Chứng minh — bằng trình duyệt thật, qua reverse proxy thật — rằng lớp phòng thủ của T003 phát
ra trên **cả hai** đường dẫn, và rằng luồng người dùng của US1 đi được từ đầu đến cuối với sàn
WCAG 2.1 AA.

## Requirements

### `e2e/security-headers.e2e-spec.ts` — tiêu chí SC-004

- Khẳng định **cả** đường dẫn bán hàng (`/`) **và** đường dẫn quản trị (`/admin/`) trả về:
  - `Content-Security-Policy` chứa **tối thiểu**: `default-src 'self'`, `script-src 'self'`,
    `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src 'self'`;
  - `Referrer-Policy: same-origin`;
  - `X-Content-Type-Options: nosniff`.
- Khẳng định `script-src` **không** chứa `'unsafe-inline'`, **không** `'unsafe-eval'`,
  **không** nguồn CDN nào.
- Khẳng định `'unsafe-inline'` **chỉ** xuất hiện trong `style-src`, không ở directive nào khác.
  Phân tích chuỗi CSP theo directive — đừng chỉ `includes("unsafe-inline")` trên cả chuỗi.
- **Đường dẫn quản trị chưa có bundle ở `000`**: phản hồi dù là gì (404 là bình thường) **vẫn
  phải mang đủ header**. Đây là điểm dễ trượt nhất của cấu hình proxy — kiểm nó tường minh.

### `e2e/storefront-journey.e2e-spec.ts` — luồng US1 + WCAG

- Mở trang chủ → bấm vào thẻ sản phẩm → trang chi tiết mở ra với tên, mô tả, giá, ảnh, nhãn.
- Kiểm **sàn WCAG 2.1 AA** bằng `@axe-core/playwright` trên **cả hai** trang.
- Khẳng định **thông báo đổi route cho screen reader** thật sự xảy ra khi điều hướng (vùng
  `aria-live` của `packages/ui` nhận nội dung) — SPA không có ranh giới tải trang làm việc đó.

### Luật chạy

- `playwright.config.ts`: một `baseURL` trỏ vào **reverse proxy** (một origin — AD-8), không
  trỏ thẳng vào Vite dev server hay vào API. Bằng chứng header chỉ có nghĩa khi đi qua proxy.
- Test chạy dưới lệnh hợp đồng `npm run test:regression` (nó gọi `test:e2e`). **Không** đặt
  lệnh test riêng (Constitution §III).
- **E2E KHÔNG PHẢI nơi chứng minh bất biến** (AD-28). Không viết test tải đồng thời ở đây,
  không khẳng định tính nguyên tử ở đây. Bằng chứng đó nằm ở T008 và **không được** nhân bản:
  một luồng E2E xanh không bao giờ được tính là đã chứng minh tính nguyên tử.
- `npx playwright install` cần **mạng lần đầu**. Nếu browser chưa có và không tải được, báo
  DONE_WITH_CONCERNS kèm lệnh cần chạy — **đừng** bỏ test, **đừng** đổi lệnh hợp đồng.

## Architecture decisions ràng buộc task này

- **AD-29** — nội dung header là nguyên văn baseline; nếu test của bạn buộc phải nới một
  directive để xanh, **DỪNG và báo**: đó là dấu hiệu T003 sai hoặc baseline cần đổi, không
  phải lý do sửa khẳng định.
- **AD-28** — E2E không phải nơi chứng minh bất biến dữ liệu.
- **AD-9** — nghĩa vụ "bundle quản trị không bao giờ tới trình duyệt khách" **chưa kiểm chứng
  được ở `000`** (chỉ có một bundle) và chuyển sang feature `006`. Đừng cố kiểm nó ở đây.

## Scope

**Allowed**
```text
e2e/**   (gồm e2e/playwright.config.ts hoặc playwright.config.ts của workspace e2e)
.sdd/000-walking-skeleton/task-013-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/**   packages/**   db/**   ops/**   docs/baseline/**   specs/**   scripts/**   tests/**
package.json (gốc)
```

## Acceptance criteria của task

- Hai file spec tồn tại, đúng tên.
- `npm run test:regression` chạy tới chúng và **xanh**, với ngăn xếp thật đang chạy
  (proxy + api + storefront build + postgres). Dán output thật.
- Test header đọc **từng directive**, không so chuỗi thô — chỉ ra đúng dòng trong report.
- Test `/admin/` khẳng định header **trên phản hồi 404** — chỉ ra đúng dòng.
- axe chạy trên cả hai trang, không vi phạm mức AA. Nếu có vi phạm, **đừng tắt rule** — báo
  lại controller.
- `grep -rniE "race|concurren|atomic" e2e/` không khớp gì (AD-28: bất biến không được chứng
  minh ở E2E).

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d
npm run build
npm run test:regression
```

## Dependencies

T003 (Caddyfile — nguồn của header) · T011 (API) · T012 (storefront build) · T002 (compose).

## Previous task outputs

- Nội dung header nguyên văn: `ops/Caddyfile` (T003) và `contracts/storefront-http.md`.
- Tên primitive vùng `aria-live`: `.sdd/000-walking-skeleton/task-007-report.md`.
- Cổng của proxy và cách dựng ngăn xếp: `ops/compose.yaml` + `.sdd/…/task-002-report.md`.
- `e2e/playwright.config.ts` hiện là khung tối thiểu do T001 tạo; bạn sở hữu nội dung thật.
