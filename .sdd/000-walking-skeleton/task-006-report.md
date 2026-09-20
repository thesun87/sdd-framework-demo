# Báo cáo T006 — `packages/shared`: nguồn sự thật duy nhất của hợp đồng HTTP

## Đã làm

Thay nội dung placeholder của `packages/shared/src/index.ts` (T001) bằng điểm vào thật, tách
theo đúng AD-10 và Requirements #1 của brief:

```
packages/shared/src/
  index.ts              — re-export 4 không gian tên: storefront, backoffice, common, config
  storefront/
    product.ts           — schema + type sản phẩm
    product.test.ts
    index.ts
  backoffice/
    index.ts              — để trống có chủ đích (feature 006 sẽ lấp)
  common/
    error.ts              — envelope lỗi DUY NHẤT, dùng chung cho cả hai bề mặt
    error.test.ts
    index.ts
  config/
    env.ts                 — schema + hàm validate cấu hình triển khai
    env.test.ts
    index.ts
```

`common` chỉ chứa envelope lỗi — đúng như brief nói "gần như không có type nào" cần nằm ở
không gian tên chung ngoài nó. `config` không phải hình dạng HTTP nên đặt riêng, không nằm
trong `storefront`/`backoffice`.

### Export ra (dùng cho T007, T010 và task API sau này)

Từ `packages/shared` (import `import { storefront, backoffice, common, config } from "shared"`,
hoặc theo path con tương ứng trong `src/`):

- `storefront.StockStatusSchema` / `type StockStatus` — enum `"in_stock" | "out_of_stock"`.
- `storefront.ProductSummarySchema` / `type ProductSummary` — `{ id, name, price, imagePath, stockStatus }`, `.strict()`.
- `storefront.ProductImageSchema` / `type ProductImage` — `{ path, position }`, `.strict()`.
- `storefront.ProductDetailSchema` / `type ProductDetail` — `{ id, name, description, price, images, stockStatus }`, `.strict()`.
- `storefront.ProductsListResponseSchema` / `type ProductsListResponse` — `{ items: ProductSummary[] }` (bọc `items`, không phải mảng trần).
- `backoffice` — namespace rỗng (`export {}`), không có export nào ở feature 000.
- `common.ErrorEnvelopeSchema` / `type ErrorEnvelope` — `{ error: { code, message, details? } }`, `.strict()` cả hai tầng. Dùng cho 404 của `GET /api/products/:id` (FR-004) và mọi lỗi HTTP khác.
- `common.createErrorEnvelopeSchema(detailsSchema)` — factory tạo envelope lỗi với `details` có kiểu cụ thể thay vì `unknown`.
- `config.EnvSchema` / `type Env` — schema 4 biến `DATABASE_URL, API_PORT, NODE_ENV, PRODUCT_IMAGE_PATH` (API_PORT được transform từ chuỗi số sang `number`).
- `config.loadEnv(source: Record<string, string | undefined>): Env` — validate một lần, ném `Error` với thông điệp liệt kê từng biến thiếu/sai khi thất bại. Package **không** tự đọc `process.env`.

Tất cả type ở trên đều là `z.infer<typeof ...Schema>` — không có `interface`/`type` viết tay
cho hình dạng nào có schema.

### Quyết định thiết kế đáng chú ý

- Mọi schema sản phẩm (`ProductSummarySchema`, `ProductDetailSchema`, envelope lỗi) dùng
  `.strict()`. Đây là hàng rào kỹ thuật thực thi FR-007/AD-19: một object có thêm trường
  `quantity` sẽ bị `safeParse` từ chối thay vì âm thầm bỏ qua — test T006 kiểm tra đúng việc
  này.
- `price` dùng `z.int().nonnegative()` (số nguyên VND, đã gồm VAT) — từ chối cả thập phân lẫn
  âm.
- `id` dùng `z.int().positive()` — hợp đồng nói "bigint nội bộ, serialise dạng số nguyên", ở
  biên HTTP nó là số nguyên JSON bình thường.
- `API_PORT` trong `.env` là chuỗi; `EnvSchema` validate định dạng số nguyên dương rồi
  `transform` + `pipe(z.int().positive())` sang `number` để tiện dùng ở phía gọi (bind cổng).
  Ba biến còn lại giữ nguyên kiểu `string`.

## Lệnh đã chạy và output thật

### Trong `packages/shared`

```
$ npm test
> shared@0.1.0 test
> vitest run

 RUN  v5.0.1 .../packages/shared
 Test Files  3 passed (3)
      Tests  24 passed (24)
   Duration  246ms

$ npm run lint
> shared@0.1.0 lint
> tsc --noEmit
(exit 0, không output)

$ npm run build
> shared@0.1.0 build
> tsc -p tsconfig.build.json
(exit 0, không output)
```

### Ở gốc repo (lệnh hợp đồng của brief)

```
$ npm test    → PASS glue · unit tests / apps/api / apps/storefront /
                     packages/shared (24 tests) / packages/ui — exit 0
$ npm run lint → PASS tất cả workspace kể cả packages/shared — exit 0
$ npm run build → PASS tất cả workspace kể cả packages/shared — exit 0
```

Toàn bộ ba lệnh exit 0 (đã kiểm bằng `echo $?` ngay sau mỗi lệnh — không phải suy diễn từ
output).

## Files changed

```
M  packages/shared/package.json                 (bỏ --passWithNoTests)
M  packages/shared/src/index.ts                  (điểm vào 4 namespace)
A  packages/shared/src/storefront/index.ts
A  packages/shared/src/storefront/product.ts
A  packages/shared/src/storefront/product.test.ts
A  packages/shared/src/backoffice/index.ts
A  packages/shared/src/common/index.ts
A  packages/shared/src/common/error.ts
A  packages/shared/src/common/error.test.ts
A  packages/shared/src/config/index.ts
A  packages/shared/src/config/env.ts
A  packages/shared/src/config/env.test.ts
```

Commit: `5792b00 feat(000): T006 — packages/shared: hợp đồng HTTP storefront + config`

## Tự review

- **So khớp hình dạng với contract**: đối chiếu từng trường với
  `specs/000-walking-skeleton/contracts/storefront-http.md` — `ProductSummary`,
  `ProductDetail`, bọc `{ items }`, envelope lỗi cho 404. Khớp nguyên văn.
- **Không type viết tay**: `grep -rnE "^\s*(export )?(interface|type) (ProductSummary|ProductDetail)" packages/shared/src`
  chỉ khớp hai dòng `export type X = z.infer<...>` — không có `interface` nào.
- **Không có số tồn kho**: `grep -rniE "quantity|inventory" packages/shared/src` khớp 3 dòng:
  1. một **comment** trong `product.ts` giải thích *vì sao* `.strict()` tồn tại (chặn
     `quantity`) — giữ lại theo đúng ngoại lệ mà acceptance criteria cho phép.
  2–3. hai dòng trong `product.test.ts` — đúng yêu cầu bắt buộc của brief mục 6: "một object
     có thêm trường `quantity` không lọt qua schema" phải được test bằng chính từ khoá đó.
  Không có schema nào có trường `quantity` hay số tồn kho thật.
- **Không cache/memoize**: `grep -rniE "cache|memo|stale-while-revalidate|swr" packages/shared/src`
  không khớp gì.
- **Không import từ `apps/**`**: chỉ có 2 dòng nhắc `apps/` trong comment (giải thích ai gọi
  `loadEnv`), không có `import` thật nào từ `apps/`.
- **Không đọc `process.env` rải rác**: chỉ `loadEnv()` nhận tham số, không package nào tự đọc
  biến môi trường.
- **Phạm vi**: chỉ sửa trong `packages/shared/**`; không chạm `packages/ui/**`, `apps/**`,
  `docs/baseline/**`, `specs/**`, `package.json` gốc.

## Mối lo ngại

- Không dùng generic 100% cho `ErrorEnvelopeSchema` mặc định (details là `z.unknown().optional()`)
  — nếu task API sau này cần một `details` bắt buộc có kiểu ngay từ đầu, dùng
  `createErrorEnvelopeSchema(...)` thay vì `ErrorEnvelopeSchema`. Không phải defect, chỉ là điểm
  cần task sau lưu ý khi chọn schema nào.
- `packages/shared` không có `vitest.config.ts` riêng — Vitest chạy bằng default (glob
  `**/*.test.ts` trong package). Nếu task sau thêm thư mục `tests/` riêng ngoài `src/`, cần thêm
  config để Vitest nhìn thấy.
- Không thấy dấu hiệu xung đột với công việc song song ở `packages/ui` (không đọc, không sửa
  thư mục đó).

## Status: DONE
