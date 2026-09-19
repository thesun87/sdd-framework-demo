# Task T012 — `apps/storefront`: trang chủ + trang chi tiết Sản phẩm

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T012**, `tasks.md` §Phase 4 (US1)
- **Owns**: `FR-003` (trang chi tiết tối giản), `FR-005` (nhãn tồn kho hai giá trị **chữ**),
  `FR-008` (Sản phẩm hết hàng vẫn hiện và vẫn mở được), `SC-001` (lát cắt dọc nhìn thấy được)
- Spec: `spec.md` US1 kịch bản 1–6, US2 kịch bản 1–2/4, §Edge Cases
- Contract: `specs/000-walking-skeleton/contracts/storefront-http.md`
- Architecture: `docs/baseline/architecture.md` AD-9, AD-10, AD-20

## Objective

Lát cắt dọc nhìn thấy được: React 19.3.0 + Vite 8.3.0, bundle **riêng**, gọi API thật, hiển
thị Sản phẩm thật. Đây là thứ duy nhất của feature mà người dùng nhìn thấy.

## Requirements

1. **Trang chủ** — lưới thẻ sản phẩm lấy từ `GET /api/products`. Mỗi thẻ: tên, giá, ảnh đại
   diện, nhãn tình trạng tồn kho.
2. **Trang chi tiết Sản phẩm** — tên, mô tả, giá, **ít nhất một ảnh**, nhãn tồn kho.
   **KHÔNG** nút thêm vào giỏ (FR-6 thuộc feature `003`), **KHÔNG** sản phẩm liên quan,
   **KHÔNG** đánh giá. Tối giản là **yêu cầu**, không phải gợi ý — thêm là finding "Extra".
3. **Nhãn tồn kho**: đúng hai giá trị **chữ** — **"Còn hàng"** / **"Hết hàng"** — và
   **không bao giờ chỉ bằng màu**. Dùng primitive của `packages/ui` (T007); không tự viết lại
   nhãn, không hardcode chuỗi ở nhiều chỗ.
4. **Sản phẩm hết hàng vẫn hiện trong lưới và vẫn mở được** (FR-008). Không ẩn, không disable
   thẻ, không chuyển hướng.
5. **Lưới rỗng** hiện đúng câu *"Danh mục này chưa có sản phẩm nào."* — đây là **danh sách
   rỗng, không phải lỗi**: không icon lỗi, không "Đã có lỗi xảy ra", không thử lại.
6. **Giá**: hiển thị số nguyên VND đã gồm VAT. Định dạng hiển thị (dấu phân cách nghìn) là
   tầng hiển thị; **không** làm tròn, **không** chia, **không** thêm phần thập phân.
7. **TẦNG DỮ LIỆU PHÍA CLIENT KHÔNG ĐƯỢC CACHE `stockStatus`** — AD-20 gọi đây là tầng nguy
   hiểm nhất, nơi một "Còn hàng" cũ sống lâu nhất và không lệnh server nào với tới. Cụ thể:
   không cache response chứa `stockStatus` trong state toàn cục sống qua điều hướng, không
   `stale-while-revalidate`, không thư viện data-fetching có cache mặc định trừ khi bạn tắt
   cache **tường minh và chứng minh được bằng test**. Đường đơn giản nhất — fetch lại mỗi lần
   vào trang — là đường đúng ở `000`.
8. **Hình dạng dữ liệu lấy từ `packages/shared`** (AD-10). **Không** khai lại `interface` cho
   response ở FE. Validate response bằng chính schema đó.
9. **Bundle riêng** (AD-9): entry point riêng, thư mục output riêng. Không import chéo sang
   bundle khác; `apps/backoffice` không tồn tại ở `000` — đừng tạo, đừng tham chiếu.
10. **Điều hướng**: trang chủ → trang chi tiết. Vì là SPA, mỗi lần đổi route phải **thông báo
    cho screen reader** bằng primitive của `packages/ui` (T007) — không có ranh giới tải trang
    nào làm việc đó thay.
11. **Test dưới Vitest 5.0.1** (không phải Jest — không trộn runner trong một thư mục).
    Bỏ `--passWithNoTests` khỏi script `test` của workspace này. Test tối thiểu:
    - nhãn "Còn hàng"/"Hết hàng" render đúng **chữ** cho cả hai trạng thái;
    - sản phẩm hết hàng **vẫn xuất hiện** trong lưới;
    - lưới rỗng hiện đúng câu trên, và **không** ở dạng lỗi;
    - `stockStatus` **không** bị phục vụ lại từ cache sau khi dữ liệu nguồn đổi
      (giả lập tầng fetch, khẳng định có gọi lại).

## Architecture decisions ràng buộc task này

- **AD-20** — không cache `stockStatus` ở **bất kỳ** tầng nào; tầng client là tầng nguy hiểm nhất.
- **AD-10** — hình dạng từ `packages/shared`, FE không khai lại.
- **AD-9** — hai bundle riêng, entry point riêng, output riêng.
- **WCAG 2.1 AA là sàn cứng** — nhãn bằng chữ, thông báo đổi route, tương phản đạt chuẩn.
  T013 sẽ kiểm bằng axe; đừng để nó phát hiện thứ bạn đã biết.

## Glossary

Giá trị canonical là `in_stock`/`out_of_stock`; **"Còn hàng"/"Hết hàng"** chỉ là nhãn hiển thị.
Module tồn kho tên `stock`, không bao giờ `inventory`.

## Scope

**Allowed**
```text
apps/storefront/**
.sdd/000-walking-skeleton/task-012-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/api/**   packages/shared/**  (chỉ ĐƯỢC DÙNG, không sửa)   packages/ui/**  (chỉ dùng)
apps/backoffice/**  (không tồn tại ở 000)   e2e/**   db/**   ops/**
docs/baseline/**   specs/**   scripts/**   tests/**   package.json (gốc)
```

## Acceptance criteria của task

- `npm test` chạy tới test của `apps/storefront` và tất cả xanh.
- `npm run build` sinh bundle trong thư mục output **riêng** của storefront.
- Chạy thật với API + database thật: mở trang chủ thấy Sản phẩm mẫu; bấm vào thẻ mở trang chi
  tiết; đổi `quantity` về 0 trong database rồi tải lại → nhãn đổi sang "Hết hàng" và sản phẩm
  **vẫn hiện**. Dán bằng chứng (output lệnh hoặc mô tả từng bước kèm dữ liệu thật) vào report.
- `grep -rniE "interface (ProductSummary|ProductDetail)" apps/storefront/src` không khớp gì.
- `grep -rn "Còn hàng\|Hết hàng" apps/storefront/src` chỉ khớp ở nơi gọi primitive của
  `packages/ui`, không rải rác.
- Không có nút thêm vào giỏ, không sản phẩm liên quan, không đánh giá — khẳng định trong report.
- `npm run lint` exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate && npm run db:seed
npm test
npm run build && npm run lint
```

## Dependencies

T007 (`packages/ui`) · T011 (API đọc chạy được) · T006 (`packages/shared`).

## Previous task outputs

- Tên export primitive của `packages/ui` (nhãn tồn kho, vùng aria-live):
  `.sdd/000-walking-skeleton/task-007-report.md`.
- Tên export schema của `packages/shared`: `.sdd/000-walking-skeleton/task-006-report.md`.
- Đường dẫn API và hình dạng response: `contracts/storefront-http.md` + report của T011.
- `apps/storefront/index.html`, `src/main.tsx`, `vite.config.ts` hiện là khung tối thiểu do
  T001 tạo để `vite build` chạy được; bạn sở hữu nội dung thật của chúng.
