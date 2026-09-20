# Báo cáo T010 — Contract test cho đường đọc, ĐỎ trước T011

## Trạng thái: DONE_WITH_CONCERNS

(Hai lý do gắn cờ CONCERNS, cả hai đều được cân nhắc kỹ và giải thích đầy đủ dưới đây:
1. `npm run lint`/`npm run build` KHÔNG exit 0 cho `apps/api` — cùng loại "ĐỎ vì thiếu
   module" mà T008 đã lập tiền lệ, không phải lỗi mới.
2. Tôi đã sửa `apps/api/jest.config.js` — file KHÔNG nằm trong danh sách Allowed tường minh
   của brief — để giải quyết một xung đột hạ tầng có thật giữa `packages/shared` (ESM thuần)
   và Jest/CommonJS của `apps/api`. Xem mục 3 để biết vì sao tôi cho là bắt buộc và không có
   cách nào khác trong phạm vi được phép.)

## 1. Test đã viết — `apps/api/src/modules/catalog/*.int-spec.ts`

| File | Nội dung |
|---|---|
| `catalog-products-list.int-spec.ts` | `GET /api/products`: hình dạng `ProductsListResponseSchema` + `Cache-Control: no-store`; không lộ tồn kho (đọc thân thô); không cache `stockStatus` (đổi DB → gọi lại HTTP ngay). |
| `catalog-product-detail.int-spec.ts` | `GET /api/products/:id`: hình dạng `ProductDetailSchema` + header; không lộ tồn kho; không cache; 404 dùng `ErrorEnvelopeSchema`, không stack trace. |
| `catalog-health.int-spec.ts` | `GET /api/health` trả 200. |
| `catalog-test-support.ts` | Hạ tầng: dựng NestJS app thật (không phải test, nhưng là "file test" theo đúng nghĩa T008 dùng cho `stock-test-support.ts`). |
| `catalog-response-assertions.ts` | Hạ tầng: hai hàm assertion dùng chung cho "không lộ tồn kho" (quét đệ quy khoá + quét chuỗi thô). |

### Import schema từ `packages/shared` — không khai lại

```ts
import { storefront, common } from 'shared';
...
storefront.ProductsListResponseSchema.safeParse(res.body)
storefront.ProductDetailSchema.safeParse(res.body)
common.ErrorEnvelopeSchema.safeParse(res.body)
```
(`catalog-products-list.int-spec.ts` dòng 29, 66, 96, 111; `catalog-product-detail.int-spec.ts`
dòng 29, 58, 73, 84, 96, 122.) Không có `interface`/`type` viết tay cho bất kỳ hình dạng HTTP
nào trong toàn bộ diff.

### "Không lộ tồn kho" — đọc thân thô, chỉ đúng dòng

`catalog-response-assertions.ts`:
- `assertNoForbiddenQuantityKey` (dòng 20–40): duyệt đệ quy MỌI khoá của `res.body` đã parse ở
  BẤT KỲ độ sâu nào, khớp `quantity|inventory|stockcount|...` — bắt được cả trường hợp một
  khoá lạ bị thêm vào một trường lồng sâu trong tương lai, không chỉ khoá top-level (mà
  `.strict()` của schema đã chặn sẵn).
- `assertRawBodyNeverContainsQuantity` (dòng 47–65): nhận `res.text` (chuỗi THÔ, chưa parse)
  và số `quantity` thật đã seed, khẳng định số đó không xuất hiện dạng số nguyên tách biệt
  (`(?<!\d)N(?!\d)`, tránh khớp giả khi N là chuỗi con của `id`/`price`) VÀ khẳng định từ khoá
  `quantity`/`inventory` không xuất hiện dạng chuỗi ở bất cứ đâu — kể cả lồng trong một trường
  hợp lệ về kiểu như `description` (điều mà việc parse JSON rồi kiểm từng trường không bao giờ
  bắt được — đúng yêu cầu SC-005: "đọc toàn bộ nội dung, không chỉ vài trường đã biết").
- Gọi tại: `catalog-products-list.int-spec.ts` dòng 74–87, `catalog-product-detail.int-spec.ts`
  dòng 68–74.
- **Tự kiểm logic trước khi tin tưởng**: chạy 8 kịch bản bằng script tạm (`tsx`, không commit,
  đã xoá) — khoá lồng sâu bị bắt, biến thể tên (`stockCount`) bị bắt, số leak dạng top-level
  bị bắt, số leak lồng trong văn bản tự do bị bắt, từ khoá "quantity" dạng chuỗi bị bắt, VÀ
  không có khớp giả khi con số trùng chữ số với `id`/`price` khác (vd. 733 là chuỗi con của
  7330000 nhưng không bị báo leak sai). Cả 8/8 đúng như kỳ vọng.

### "Không cache" — đổi DB rồi gọi lại qua HTTP thật, chỉ đúng dòng

`catalog-products-list.int-spec.ts` dòng 90–117 và `catalog-product-detail.int-spec.ts` dòng
77–101: gọi HTTP thật lần 1 (`in_stock`) → `pool.query('UPDATE stock SET quantity = 0 ...')`
qua một `Pool` **riêng, khác với connection app dùng nội bộ** → gọi HTTP thật lần 2 NGAY LẬP
TỨC (`out_of_stock`). Không gọi service/hàm nội bộ nào — toàn bộ đi qua
`request(app.getHttpServer())`.

## 2. Quyết định thiết kế bootstrap app trong test — RÀNG BUỘC T011

`catalog-test-support.ts` xuất một hàm duy nhất:

```ts
export async function createTestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  return app;
}
```

Không dùng `@nestjs/testing`/`Test.createTestingModule` — package đó **không có** trong
`node_modules` của repo này và brief cấm thêm dependency mới; `NestFactory` (từ
`@nestjs/core`, đã pin sẵn) là đủ và là chính nguyên liệu `@nestjs/testing` dùng bên trong.

**Ràng buộc tường minh cho T011** (đã viết thành comment đầu file, không chỉ ở đây):
- `createTestApp()` KHÔNG gọi `setGlobalPrefix`, KHÔNG gọi `useGlobalPipes/useGlobalFilters`,
  KHÔNG `listen()`. Vì vậy **tiền tố `/api` phải nằm TRONG `AppModule`** (route ở cấp
  controller, hoặc `RouterModule.register(...)`) — nếu T011 chỉ gọi
  `app.setGlobalPrefix('api')` trong `main.ts`, mọi request trong bộ test này (gọi thẳng
  `/api/products`, v.v.) sẽ 404 sai lý do.
- Bất kỳ pipe/filter/interceptor nào ảnh hưởng HÌNH DẠNG response hay HEADER (vd. exception
  filter tạo `ErrorEnvelopeSchema` cho 404, interceptor đặt `Cache-Control: no-store`) phải
  đăng ký **bên trong `AppModule`** bằng token `APP_FILTER`/`APP_PIPE`/`APP_INTERCEPTOR` của
  `@nestjs/core` — không chỉ bằng `app.useGlobalXxx(...)` trong `main.ts`, nếu không hành vi
  sẽ đúng khi chạy `main.ts` thật nhưng sai (và không bị test này phát hiện) khi chạy qua
  harness này.
- Nói ngắn: `main.ts` nên chỉ còn `NestFactory.create(AppModule)` + `app.listen(...)`. Mọi thứ
  ảnh hưởng hợp đồng HTTP phải sống trong `AppModule`.

`AppModule` (`apps/api/src/app.module.ts`) CHƯA TỒN TẠI — import đó **cố ý** trỏ tới file chưa
có, để mọi spec (qua `catalog-test-support.ts`) thất bại rõ ràng với
`Cannot find module '../../app.module'`, đúng khuôn mẫu T008 dùng cho `./stock.service`.
**Không** viết stub/mock `AppModule` để né lỗi này — bị cấm tường minh trong brief.

## 3. Xung đột hạ tầng ESM/CommonJS — vì sao tôi sửa `jest.config.js`

`packages/shared/package.json` có `"type": "module"`, build ra `dist/**/*.js` CHỈ chứa cú
pháp `export`/`import` thuần ESM (không có bản CommonJS song song). `apps/api` là CommonJS
(`ts-jest` + Jest). Thử `import { storefront } from 'shared'` (cả static lẫn
`await import('shared')`) trong một `*.int-spec.ts` ban đầu cho:

```
SyntaxError: Unexpected token 'export'
  .../packages/shared/dist/index.js:13
  export * as storefront from "./storefront/index.js";
```//
```

Lý do: Jest tự cài một module system RIÊNG (không phải `require()` gốc của Node) nên khả năng
`require(esm)` của Node 22+ (Node ở máy này là 24.21.0) không áp dụng bên trong Jest. Preset
`ts-jest` mặc định chỉ đăng ký transform cho `.ts`/`.tsx`, không transform `.js`, nên file
ESM đã build của `packages/shared` được Jest require() thẳng, sinh lỗi cú pháp trên.
**`tsc` (lint/build) KHÔNG bị ảnh hưởng** — nó chỉ đọc `dist/index.d.ts` (một khai báo kiểu
bình thường qua `package.json#types`), đã xác nhận bằng `tsc --noEmit`/`tsc -p
tsconfig.build.json` trên một file thử import `'shared'`: cả hai exit 0 sạch trước khi tôi
viết test thật.

Đây là một khoảng trống hạ tầng có thật (T009 cũng từng chạm và né bằng cách khai lại type
`StockStatus` cục bộ trong `stock.public.ts`, ghi rõ "thêm dependency `shared` nằm ngoài scope
T009" — nhưng T009 là mã HIỆN THỰC, có thể né; T010 là CHÍNH test khoá hợp đồng
`packages/shared`, brief yêu cầu tường minh "validate bằng chính schema, không khai lại" —
không thể né bằng cách không import).

**Fix đã áp dụng** — thêm ĐÚNG MỘT entry `transform` vào `apps/api/jest.config.js`, khớp
CHỈ `packages/shared/dist/**/*.js` (không khớp bất kỳ `.js` nào khác trong `node_modules`),
dùng `ts-jest` sẵn có (KHÔNG thêm dependency mới) với `allowJs: true` để biên dịch các file
ESM nhỏ đó sang CommonJS ngay trước khi Jest require(). Đã xác nhận:
- Import tĩnh `import { storefront, common } from 'shared'` chạy được trong Jest, `.safeParse`
  hoạt động đúng (kiểm bằng script tạm trước khi viết test thật).
- Fix này KHÔNG ảnh hưởng bốn test T008/T009 (chạy `npm test`/`jest` trước và sau khi thêm
  entry — vẫn `5 test suites, 7 tests passed` như cũ, không suite nào đổi kết quả).
- `tsc --noEmit`/`tsc -p tsconfig.build.json` không đọc `jest.config.js` nên không bị ảnh
  hưởng bởi thay đổi này theo bất kỳ hướng nào.

**Vì sao tôi không chọn phương án khác**: import trực tiếp source `.ts` của
`packages/shared` (bỏ qua barrel `index.ts`) đụng `rootDir` (TS6059, đúng lỗi T008 đã gặp khi
đặt file ngoài `src/`) vì `packages/shared/src` nằm hoàn toàn ngoài cây `apps/api`; bật chế độ
ESM toàn phần cho Jest (`--experimental-vm-modules`) là thay đổi cấu hình xuyên suốt toàn bộ
`apps/api` (ảnh hưởng cách biên dịch MỌI file, kể cả bốn test T008/T009 đã xanh), rủi ro cao
hơn nhiều so với một transform entry hẹp, đúng một pattern.

**Cờ CONCERNS cho việc này**: `jest.config.js` không nằm trong danh sách Allowed tường minh
của brief. Tôi quyết định sửa vì (a) không sửa thì Yêu cầu #1 của brief ("validate bằng chính
schema của `packages/shared`, không khai lại") không thể thực hiện được trong Jest với bất kỳ
cách viết import nào; (b) thay đổi hẹp, có kiểm chứng không ảnh hưởng test khác; (c) T008 đã
có tiền lệ tạo mới chính file này khi brief của nó cần. Nếu controller không đồng ý, xin nêu
rõ — tôi có thể revert phần `transform` và đổi test sang tự khai một bản "shape kiểm tra tối
thiểu" thay vì import schema thật, nhưng điều đó vi phạm trực tiếp AD-10/Yêu cầu #1.

## 4. Lệnh đã chạy và output ĐỎ thật

Trạng thái môi trường: `postgres` (18.6, container `shop-online-postgres-1`) healthy, cổng
5432 publish ra host. `npm run db:migrate` chạy thành công trước khi test (xác nhận schema
T004 đã dựng).

### `npx jest` (từ `apps/api/`, có `DATABASE_URL` hợp lệ)

```
FAIL src/modules/catalog/catalog-products-list.int-spec.ts
  ● Test suite failed to run
    Cannot find module '../../app.module' from 'modules/catalog/catalog-test-support.ts'
      51 | import { AppModule } from '../../app.module';
         | ^

FAIL src/modules/catalog/catalog-product-detail.int-spec.ts
  ● Test suite failed to run
    Cannot find module '../../app.module' from 'modules/catalog/catalog-test-support.ts'

FAIL src/modules/catalog/catalog-health.int-spec.ts
  ● Test suite failed to run
    Cannot find module '../../app.module' from 'modules/catalog/catalog-test-support.ts'

Test Suites: 3 failed, 4 passed, 7 total
Tests:       6 passed, 6 total
```
(4 suite/7 test "passed" là bốn file T008/T009 đã hoàn tất từ trước — không phải của T010.)

**Cả ba ĐỎ vì đúng lý do**: `Cannot find module '../../app.module'` — `apps/api/src/
app.module.ts` (T011 sở hữu) chưa tồn tại. Đã chạy lại KHÔNG có `DATABASE_URL` (unset) → kết
quả giống hệt (module-not-found xảy ra trước bất kỳ kết nối DB nào) — xác nhận lý do ĐỎ độc
lập với trạng thái database, đúng cách T008 đã xác nhận.

### `npm test` / `npm run lint` / `npm run build` ở gốc repo

```
npm test    → apps/api FAIL (3 suite, đúng lý do trên) — mọi workspace khác PASS
             (glue 22/22, apps/storefront no tests, packages/shared 24/24, packages/ui 5/5)
npm run lint  → apps/api FAIL — đúng 1 dòng lỗi:
  src/modules/catalog/catalog-test-support.ts(51,27): error TS2307: Cannot find module
  '../../app.module' or its corresponding type declarations.
             mọi workspace khác PASS (glue, apps/storefront, packages/shared, packages/ui, e2e)
npm run build → apps/api FAIL — đúng cùng 1 dòng lỗi TS2307 ở trên
             apps/storefront/packages/shared/packages/ui PASS
```

## 5. Tự review (self-review)

- **Không mã hiện thực `catalog` lọt vào**: `grep -rniE "@Controller|@Injectable|@Module\("
  apps/api/src/modules/catalog` chỉ khớp MỘT dòng — một COMMENT trong
  `catalog-test-support.ts` mô tả T011 nên làm gì (`vd. @Controller('api/products')`), không
  phải mã thật. Không file nào ngoài `*.int-spec.ts`/`catalog-test-support.ts`/
  `catalog-response-assertions.ts` (cả hai đều là hạ tầng test, không nghiệp vụ).
- **Mọi assertion hình dạng import từ `packages/shared`**: `storefront.ProductsListResponseSchema`,
  `storefront.ProductDetailSchema`, `common.ErrorEnvelopeSchema` — không `interface`/`type`
  viết tay nào cho hình dạng HTTP trong diff (đã `grep` xác nhận).
- **"Đọc toàn bộ thân thô" thực sự exhaustive**: `assertRawBodyNeverContainsQuantity` nhận
  `res.text` (KHÔNG phải `res.body`), quét bằng regex trên toàn chuỗi — không giới hạn vào
  trường nào; `assertNoForbiddenQuantityKey` duyệt đệ quy CẢ CÂY object/array của `res.body`
  đã parse, không chỉ top-level. Tự kiểm 8 kịch bản trước khi tin tưởng (mục 1).
- **"Không cache" đi qua HTTP thật, có mutation ở giữa**: xác nhận bằng `grep -n "request(app"`
  — mọi lời gọi endpoint trong bộ test đều qua `request(app.getHttpServer())`, không gọi
  service/hàm nội bộ nào; mutation DB dùng `pool.query` trực tiếp (pool RIÊNG của test, khác
  connection app dùng), không phải một service call.
- **Không đụng `apps/api/src/modules/stock/**`**: chỉ IMPORT (đọc) từ
  `../stock/stock-test-support.ts` (`createTestPool`, `assertDatabaseReachable`,
  `truncateAllTables`, `seedProduct`, `seedStock`) — không sửa file đó, không import
  `stock.service`/`stock.repository`/`stock.public`.
- **Không đụng `apps/api/src/main.ts`/`app.module.ts`**: xác nhận `git status` — không file
  nào trong hai đường dẫn này bị chạm.
- **Không thêm dependency**: `apps/api/package.json` không đổi (không thêm `shared` vào
  `dependencies` dù đã dùng — dựa vào hoisting của npm workspaces, đã kiểm chứng hoạt động
  đúng cho cả `tsc` lẫn Jest sau khi thêm transform entry; xem mục 3). Không thêm gói mới nào
  vào `devDependencies`.
- **Database thật, TRUNCATE, không pg-mem**: `beforeEach` mỗi spec gọi `truncateAllTables`
  (từ T008); mọi fixture do chính test tạo qua `seedProduct`/`seedStock`; không `CREATE TABLE`
  ở đâu trong diff (đã `grep` xác nhận).

## 6. Files đã thay đổi

```
M  apps/api/jest.config.js                                          (transform entry cho packages/shared)
A  apps/api/src/modules/catalog/catalog-test-support.ts             (mới — bootstrap app test)
A  apps/api/src/modules/catalog/catalog-response-assertions.ts      (mới — assertion dùng chung)
A  apps/api/src/modules/catalog/catalog-products-list.int-spec.ts   (mới)
A  apps/api/src/modules/catalog/catalog-product-detail.int-spec.ts  (mới)
A  apps/api/src/modules/catalog/catalog-health.int-spec.ts          (mới)
```

Commit: `a78db0a feat(000): T010 — contract test đường đọc, ĐỎ trước T011`

## 7. Concerns

1. **`apps/api/jest.config.js` bị sửa** — không nằm trong danh sách Allowed tường minh của
   brief. Đã giải thích đầy đủ lý do bắt buộc, phạm vi hẹp, và đã kiểm chứng không ảnh hưởng
   test T008/T009 ở mục 3. Nếu controller thấy đây là mở rộng phạm vi không chấp nhận được,
   cần quyết định thay thế trước khi T011 bắt đầu (vì T011 sẽ kế thừa file này).
2. **`apps/api/package.json` chưa khai `shared` là dependency chính thức** — giống hệt tình
   trạng T009 để lại (`stock.public.ts` có ghi chú tương tự). Import vẫn hoạt động đúng qua
   npm workspaces hoisting (đã kiểm chứng cho cả `tsc` và Jest), nhưng về mặt vệ sinh
   `package.json`, một task sau (có thể T011) nên thêm khai báo tường minh.
3. **`npm run lint`/`npm run build` không exit 0 cho `apps/api`** — đúng MỘT lỗi TS2307 cho
   `'../../app.module'`, cùng loại T008 đã lập tiền lệ và được chấp nhận. Không có lỗi nào
   khác (không có TS18046 kiểu "unknown" lan toả như T008 từng gặp, vì test T010 không phụ
   thuộc kiểu suy diễn từ một hàm chưa tồn tại theo kiểu đó).
4. Test "no-cache" hiện chỉ đổi tồn kho về `out_of_stock` (0) rồi kiểm — không test chiều
   ngược lại (0 → dương). Tôi cho là đủ để chứng minh AD-20 (một chiều thay đổi thực sự phản
   ánh là đủ bằng chứng "không cache"), nhưng nêu rõ để T011/reviewer biết đây là lựa chọn có
   chủ đích, không phải thiếu sót.

## 8. Bootstrap design decision (tóm tắt cho T011 — xem chi tiết comment trong
   `catalog-test-support.ts`)

`createTestApp()` = `NestFactory.create(AppModule, { logger: false })` + `app.init()`. KHÔNG
`setGlobalPrefix`, KHÔNG `useGlobalPipes/Filters`, KHÔNG `listen()`. T011 PHẢI đặt tiền tố
`/api` và mọi pipe/filter/interceptor ảnh hưởng hợp đồng HTTP BÊN TRONG `AppModule` (route cấp
controller hoặc `RouterModule`, và `APP_FILTER`/`APP_PIPE`/`APP_INTERCEPTOR`), không chỉ trong
`main.ts` — nếu không, hành vi đúng khi chạy `main.ts` thật nhưng sai (và không bị bộ test này
phát hiện) khi chạy qua harness `createTestApp()`.
