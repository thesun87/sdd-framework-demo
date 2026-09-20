# Final review fix wave — I-1 / I-2 / I-3 (R28)

Dispatch nhận việc từ `.sdd/000-walking-skeleton/progress.md` §"Final whole-branch review"
(ruling R28). Phạm vi: đúng ba finding Important, đúng danh sách file được phép trong brief.
10 finding Minor (M-1..M-10) và các khoản nợ ghi ở cuối §"Ledger corrections" **không** đụng
tới — để dành `/speckit-converge`.

## I-1 — `withdrawStock` chặn `quantity <= 0`

**File:** `apps/api/src/modules/stock/stock.service.ts` — guard thêm ngay đầu thân hàm
`withdrawStock` (trước lời gọi `applyConditionalWithdrawal` đầu tiên):

```ts
if (!Number.isInteger(quantity) || quantity <= 0) {
  throw new RangeError(`withdrawStock: quantity must be a positive integer, got ${quantity}`);
}
```

Lý do (đúng như brief mô tả): `quantity <= -1` làm vị từ `quantity >= $1` của UPDATE điều
kiện hiển nhiên đúng → âm thầm TĂNG tồn kho thay vì giảm; `quantity === 0` làm
`stock_ledger.delta <> 0` (CHECK constraint) ném lỗi Postgres 23514 thoát ra ngoài dưới dạng
exception chưa bắt thay vì giá trị hợp đồng `{ applied: false }`.

**Test mới:** `apps/api/src/modules/stock/stock-withdraw-quantity-guard.int-spec.ts` (file
mới, toàn bộ) — ba case: `quantity: -1` ném `RangeError`, `quantity: 0` ném `RangeError`,
`quantity: 1` vẫn `resolves` bình thường (`{ applied: true, quantityAfter, ledgerId }`).
Mock `./stock.repository` bằng `jest.mock(...)` — **không chạm database thật**, `unitOfWork`
truyền vào là một stub `{ query: jest.fn() }` không bao giờ thực sự được gọi ở hai case ném
lỗi (khẳng định bằng `expect(mock...).not.toHaveBeenCalled()`).

**Kết quả chạy scoped (chỉ đúng file này, không chạm DB thật):**

```
$ npx jest stock-withdraw-quantity-guard.int-spec.ts   # chạy trong apps/api/
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        0.271 s
```

**Không cần re-seed DB sau lần chạy này** — test hoàn toàn không mở `Pool`/`PoolClient` nào
(repository bị mock), khác với mọi `*.int-spec.ts`/`*.race-spec.ts` khác trong module. Đã xác
nhận bằng cách đọc lại file: không import `stock-test-support.ts`, không gọi
`createTestPool`/`assertDatabaseReachable`. `npm run db:seed` **không** được chạy trong fix
wave này vì không cần thiết.

### Deviation cần ghi nhận — tên file test

Brief gợi ý `stock.service.spec.ts` "hoặc tương tự". Đã thử tên đó trước (xoá sau khi xác
minh) và chạy `npx jest --listTests` trong `apps/api/`: `apps/api/jest.config.js` có
`testRegex: '\\.(int|race)-spec\\.ts$'`, CHỈ khám phá hai hậu tố `int-spec`/`race-spec` — một
file `.spec.ts` trần **không bao giờ** được `npm test`/`jest` (mặc định lẫn khi chỉ định tên
file trên CLI) tìm thấy, tức bài test sẽ âm thầm không tồn tại trong CI. Chính comment của
`jest.config.js` (dòng 14-15 gốc) đã dự đoán trước tình huống "thêm unit test thuần vào
apps/api" và đề nghị hướng xử lý đúng (Jest `projects`) — việc sửa `testRegex`/thêm
`projects` nằm NGOÀI danh sách file được phép của fix wave này (`jest.config.js` không có
trong danh sách Allowed), nên **không sửa file đó**. Thay vào đó, đặt tên file test mới với
hậu tố `.int-spec.ts` (dù nội dung là unit test thuần, không chạm DB) để nó thực sự được Jest
phát hiện và chạy — kèm một đoạn comment ở đầu file giải thích rõ sự lệch tên/nội dung này cho
người đọc sau. Đây là lựa chọn tối thiểu để bài test I-1 THẬT SỰ chạy, thay vì tồn tại chỉ
trên đĩa. Ghi nợ: `jest.config.js` cần tách "projects" test-thuần / test-chạm-DB — để dành
converge.

## I-2 — Hợp nhất `StockStatus` về `packages/shared`, bỏ khai lại shape ở `catalog.service.ts`

1. `apps/api/src/modules/stock/stock.public.ts` — thay union cục bộ `StockStatus` bằng
   `export type StockStatus = storefront.StockStatus;` (`import type { storefront } from
   'shared';`, đúng pattern `catalog.controller.ts` đã dùng trước đó). Xoá comment cũ nói
   việc hợp nhất là "việc của T011" (đã đóng từ lâu).
2. `apps/api/src/modules/catalog/catalog.service.ts` — xoá ba interface tự khai
   (`ProductSummaryView`/`ProductImageView`/`ProductDetailView`), thay bằng type alias trỏ
   thẳng `z.infer` của `packages/shared`:
   ```ts
   export type ProductSummaryView = storefront.ProductSummary;
   export type ProductImageView = storefront.ProductImage;
   export type ProductDetailView = storefront.ProductDetail;
   ```
   Hiệu ứng phụ tốt: comment cũ về "`readonly T[]` không gán được cho `T[]`" (dòng 39-41 bản
   cũ) tự nhiên hết cần thiết — type alias không mang `readonly` nữa, không còn ép phải giải
   thích một workaround kiểu.
3. `apps/api/src/modules/catalog/catalog.controller.ts` — đổi `import type { storefront }`
   thành `import { storefront }` (cần giá trị runtime, không chỉ kiểu) và chạy response THẬT
   qua `.parse()` trước khi trả ra khỏi cả hai endpoint:
   - `list()`: `return storefront.ProductsListResponseSchema.parse({ items });`
   - `detail()`: `return storefront.ProductDetailSchema.parse(detail);`
   Đây là điểm DUY NHẤT response rời server ở `000` — hàng rào `.strict()` (AD-10) nay chạy
   thật ở tầng sản xuất, không chỉ trong test.
4. `packages/ui/src/StockStatusLabel.tsx` — thay union cục bộ bằng
   `export type StockStatus = storefront.StockStatus;` (`import type { storefront } from
   "shared";`). Xoá comment cũ viện lý do phụ thuộc vòng T006/T007 (đã xác nhận sai: `shared`
   không phụ thuộc `ui`, `apps/storefront` đã phụ thuộc cả hai không vấn đề).
   `packages/ui/package.json` — thêm `"dependencies": { "shared": "0.1.0" }` (theo đúng cách
   `apps/storefront/package.json` khai cả `shared` và `ui`). `node_modules/shared` đã là
   symlink workspace sẵn có (`npm install --package-lock-only` chỉ cập nhật
   `package-lock.json` cho khớp, không cần cài lại gói nào — xác nhận bằng
   `grep '"packages/ui"' package-lock.json` trước/sau).

## I-3 — Xoá bốn khối comment lỗi thời + rà thêm các file spec

1. `ops/api.Dockerfile` (đoạn "LƯU Ý CHO NGƯỜI ĐỌC SAU" cũ, dòng ~8-12) — xoá đoạn nói ảnh
   "không cần build thành công hôm nay". Giữ nguyên comment khác của file (thứ tự COPY,
   header context gốc repo).
2. `ops/compose.yaml` (đoạn comment ở khối `proxy.volumes`, dòng ~79-82 bản cũ) — xoá câu nói
   `ops/Caddyfile` "CHƯA tồn tại khi task này chạy"; giữ lại phần giải thích đường dẫn tương
   đối (`./Caddyfile` = `ops/Caddyfile`) vì vẫn đúng và hữu ích.
3. `stock.public.ts` / `StockStatusLabel.tsx` — xoá cùng lúc với I-2 (đã liệt kê ở trên).
4. Rà thêm theo gợi ý brief ("năm file spec header ở mức rủi ro thấp hơn") — tìm bằng
   `grep -rn "CHƯA TỒN TẠI\|PHẢI ĐỎ" apps/api/src/modules/{stock,catalog}/*.{int,race}-spec.ts`,
   thấy **bảy** file (nhiều hơn năm brief nêu — có thể brief đếm theo cụm, không theo file),
   xoá đúng câu/đoạn nói `AppModule`/`./stock.service` "chưa tồn tại", giữ nguyên phần còn lại
   của mỗi comment và toàn bộ logic test:
   - `apps/api/src/modules/stock/stock-conditional-delta.race-spec.ts` (hai chỗ: đoạn
     "ĐỎ ở task này vì..." trong header, và dòng comment ngay trên `import { withdrawStock }`)
   - `apps/api/src/modules/stock/stock-ledger-matches-quantity.int-spec.ts`
   - `apps/api/src/modules/stock/stock-ledger-restrict.int-spec.ts`
   - `apps/api/src/modules/stock/stock-never-negative.int-spec.ts`
   - `apps/api/src/modules/catalog/catalog-products-list.int-spec.ts`
   - `apps/api/src/modules/catalog/catalog-product-detail.int-spec.ts`
   - `apps/api/src/modules/catalog/catalog-health.int-spec.ts`

   Xác nhận sau khi sửa: `grep -rn "CHƯA TỒN TẠI\|PHẢI ĐỎ\|chưa tồn tại"` trên cùng tập file
   không còn khớp gì. (Không đụng `stock.contract.ts` — file đó không phải `.int-spec.ts`/
   `.race-spec.ts` và không nằm trong danh sách Allowed của I-3.)

## Verify — build/lint (không chạy full test suite/e2e chạm DB, đúng AD-28)

```
$ npm run build --workspace=packages/shared   → tsc -p tsconfig.build.json, không lỗi
$ npm run build --workspace=packages/ui       → tsc -p tsconfig.build.json, không lỗi
$ npm run lint  --workspace=apps/api          → tsc --noEmit, không lỗi
```

Chạy thêm (không nằm trong yêu cầu, nhưng rẻ và không chạm DB — xác nhận không phá
`apps/storefront`, nơi cũng import `StockStatusLabel`/kiểu `storefront.*`):

```
$ npm run lint  --workspace=apps/storefront   → tsc --noEmit, không lỗi
```

Và một kiểm chứng cấu trúc cho I-3 (compose vẫn hợp lệ sau khi xoá comment):

```
$ docker compose -f ops/compose.yaml config   → OK, không lỗi cú pháp
```

## Deviations / ghi chú

- **Tên file test I-1** (`*.int-spec.ts` cho một unit test thuần) — xem giải thích chi tiết ở
  trên. Lựa chọn tối thiểu, không sửa `jest.config.js` (ngoài scope Allowed).
- `package-lock.json` bị đổi (thêm `"dependencies": { "shared": "0.1.0" }` vào entry
  `packages/ui`) — hệ quả trực tiếp, cần thiết của việc thêm dependency ở `packages/ui/package.json`
  (mục 4, I-2/I-3); không có thay đổi nào khác trong file lock (chạy
  `npm install --package-lock-only`, không `npm install` đầy đủ, không đổi version nào khác).
  File này không nằm trong danh sách Allowed nhưng cũng không nằm trong danh sách file bị cấm
  (`docs/baseline/**`, `.specify/memory/constitution.md`, `spec.md`/`plan.md`/`tasks.md`,
  `.sdd/.../progress.md`) — coi là hệ quả cơ học bắt buộc của thay đổi ở mục 4, không phải một
  thay đổi phạm vi độc lập.
- Không chạy `npm test`/`npm run test:e2e` cho `apps/api` hay `e2e/` — đúng AD-28, tránh
  TRUNCATE dữ liệu demo đã seed. Không cần `npm run db:seed` sau fix wave này vì không có lần
  chạy Jest nào chạm Postgres thật (xem lý do ở mục I-1).
- Không sửa gì ngoài danh sách file trong brief + `package-lock.json` (hệ quả cơ học) +
  `apps/api/src/modules/stock/stock-withdraw-quantity-guard.int-spec.ts` (file test mới do
  I-1 yêu cầu). Không refactor, không "tiện tay sửa" gì khác — kể cả các khoản nợ đã ghi ở
  cuối `progress.md` (`PRODUCT_IMAGE_PATH`/`proxy`, `NODE_ENV`, `pg`/`@types/pg` ở root,
  N+1 `getStockStatus`, coverage `/images/*`, `updated_at` không `defaultNow()`) — để nguyên
  cho `/speckit-converge`, không chặn merge nhánh này.
