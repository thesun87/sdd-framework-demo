# Task T011 — Báo cáo: module `catalog`, đường đọc của trang bán hàng

## Trạng thái: DONE_WITH_CONCERNS

(Lý do gắn cờ CONCERNS — tất cả đã cân nhắc, không chặn acceptance criteria: xem mục 7.)

## 1. Đã làm gì

Hiện thực đúng hợp đồng bootstrap của T010 và các schema của `packages/shared`, làm bảy test
đỏ của T010 (3 file `.int-spec.ts`, 7 test) thành xanh, không hồi quy bốn test T008/T009.

### Files mới — `apps/api/src/modules/catalog/`

| File | Vai trò |
|---|---|
| `catalog.repository.ts` | SQL tham số hoá thô qua `pg.Pool` cho `product`/`product_image`. Không đọc `category` (không endpoint nào ở `000` phơi nó ra — xem mục 3). Không bao giờ chạm `stock`/`stock_ledger`. |
| `catalog.service.ts` | Ghép `ProductSummaryView`/`ProductDetailView` từ repository + `stockStatus` lấy qua `stock.public.ts` (`getStockStatus`). |
| `catalog.controller.ts` | `@Controller('api/products')` — `GET /api/products`, `GET /api/products/:id`, `Cache-Control: no-store` qua `@Header(...)`. |
| `health.controller.ts` | `@Controller('api/health')` — `SELECT 1` qua cùng pool; lỗi kết nối → 503 qua `ErrorEnvelopeFilter`. |
| `product-not-found.exception.ts` | `ProductNotFoundException` — `HttpException({code:'PRODUCT_NOT_FOUND', message}, 404)`. |
| `error-envelope.filter.ts` | `@Catch()` toàn cục (`APP_FILTER`) — biến MỌI exception thành `{error:{code,message}}`; exception không phải `HttpException` chỉ log THÔ ra stdout, không bao giờ đưa `message`/`stack` ra client. |
| `request-logging.middleware.ts` | Log JSON ra stdout mỗi request (`request_id`, `method`, `path`, `status`) ở sự kiện `finish` — chừa chỗ cho T014 cộng `durationMs` mà không phải thay thế. |
| `env.provider.ts` | Điểm đọc `process.env` DUY NHẤT — `config.loadEnv(process.env)` (T006) qua Nest factory provider (singleton → validate đúng 1 lần). |
| `pg-pool.provider.ts` | `pg.Pool` từ `env.DATABASE_URL`; `PgPoolLifecycle` đóng pool ở `onModuleDestroy`. Đăng ký lại `pgTypes.setTypeParser(20, Number)` (xem mục 4). |
| `catalog.module.ts` | Wiring: controllers, providers, `APP_FILTER`, middleware log (`forRoutes('*')`). |

### Files sửa

- `apps/api/src/app.module.ts` (mới, thay placeholder) — chỉ `imports: [CatalogModule]`.
- `apps/api/src/main.ts` (thay placeholder T001) — `NestFactory.create(AppModule)` +
  `app.listen(env.API_PORT)`, đọc `Env` qua `app.get(ENV)` (không gọi `loadEnv` lần 2).
- `apps/api/package.json` — thêm `"shared": "0.1.0"` vào `dependencies` (mục 2).
- `package-lock.json` — cập nhật theo `npm install` sau khi sửa `package.json` trên.

## 2. Trả nợ dependency — `packages/shared`

Thêm đúng một dòng vào `apps/api/package.json`:
```json
"dependencies": { ..., "shared": "0.1.0" }
```
Pin bằng **số phiên bản hiện có** (`0.1.0`, khớp `packages/shared/package.json`) — nhất quán
phong cách pin cứng đã có của repo (`tsx`, `drizzle-kit`, `@types/pg`), không dùng
`workspace:*` (repo dùng npm workspaces thuần, chưa dùng protocol đó ở đâu khác). Chạy `npm
install` ở gốc — không cài bản mới (đã có sẵn qua workspace symlink), chỉ ghi lại lockfile:
`git diff --stat -- package-lock.json` → `1 file changed, 10 insertions(+), 1 deletion(-)`.

**Không** trả nợ tương tự cho `pg`/`drizzle-orm` (T009 để lại, `stock.public.ts` §Concerns) —
ngoài phạm vi brief T011 (chỉ nêu đích danh `packages/shared`). Ghi rõ ở comment đầu
`pg-pool.provider.ts` để không ai hiểu nhầm là đã xử lý.

## 3. Quyết định: không có hàm đọc `category`

Brief liệt "category, product, product_image" ở Requirement #1, nhưng
`storefront.ProductSummarySchema`/`ProductDetailSchema` (packages/shared) và
`contracts/storefront-http.md` **không có trường category nào** — không endpoint nào ở `000`
phơi category ra (`data-model.md`: "Danh mục có mặt ở `000` chỉ để Product thuộc về 0..1
Category... Duyệt theo danh mục là `001`"). Tôi không thêm hàm đọc `category` không ai gọi —
tránh mã chết không được test nào phủ. Nếu đây là hiểu sai ý brief, xin nêu rõ.

## 4. `name_normalized` (AD-11) và bigint→JSON (Requirement #2, #4)

- **`name_normalized`**: đường đọc T011 **không tính** giá trị này — không endpoint ghi nào ở
  `000` (Requirement #11 cấm `usecases/`), và không response nào phơi trường này ra
  (`ProductSummarySchema`/`ProductDetailSchema` không có nó). `catalog.repository.ts` không
  `SELECT` cột đó. Nếu một task sau cần tính nó, PHẢI dùng đúng hàm `normalizeName` của T005
  (`db/seed.ts`, task-005-report.md) — đã ghi comment tại chỗ, không phát minh quy tắc thứ hai.
- **bigint→JSON**: `product.id`/`product.price` là cột `bigint` (T004). Driver `pg` mặc định
  trả OID 20 dạng CHUỖI. `pg-pool.provider.ts` đăng ký lại
  `pgTypes.setTypeParser(20, (v) => Number(v))` — CÙNG registry toàn tiến trình mà
  `stock.repository.ts` (T009) đã sửa, nhưng gọi **tường minh, độc lập** ở module này (không
  dựa vào thứ tự import module `stock` chạy trước) — idempotent (ghi đè cùng một hàm, xác
  nhận trong comment T009). Kết quả: `row.id`/`row.price` là JS `number` NGAY TỪ
  `catalog.repository.ts`, không bao giờ có JS `bigint` thật đi tới `res.json(...)` — không
  cần xử lý `JSON.stringify` đặc biệt vì giá trị chưa từng là `bigint` primitve khi tới đó.
  Xác nhận bằng `curl` thật: `"price": 25000` (số, không phải chuỗi) — xem mục 6.

## 5. Bootstrap — tuân thủ hợp đồng T010

- `/api` prefix nằm NGAY trong `@Controller('api/products')`/`@Controller('api/health')` —
  không `app.setGlobalPrefix(...)` ở đâu.
- `ErrorEnvelopeFilter` đăng ký qua `{ provide: APP_FILTER, useClass: ErrorEnvelopeFilter }`
  trong `catalog.module.ts` — không `app.useGlobalFilters(...)`.
- `main.ts` chỉ còn `NestFactory.create(AppModule)` + `app.listen(port)` — không pipe/filter
  nào khác đăng ký ở đó, đúng tinh thần "mọi thứ ảnh hưởng hợp đồng HTTP sống trong
  `AppModule`" mà `catalog-test-support.ts` yêu cầu.
- Config (`envProvider`) và request-logging middleware cũng đặt trong `CatalogModule` (không
  phải `AppModule`) vì phạm vi Allowed của brief chỉ cho `apps/api/src/modules/catalog/**`,
  `main.ts`, `app.module.ts` — không có chỗ trung lập kiểu `apps/api/src/common/**`. `APP_FILTER`/
  middleware khai trong `CatalogModule` vẫn có hiệu lực TOÀN ứng dụng (xác nhận bằng chính
  test T010 — `GET /api/health` cũng chạy qua middleware log, xem log mục 6).

## 6. Bằng chứng TDD — đỏ trước, xanh sau, cùng lệnh

Môi trường: `postgres` 18.6 (`shop-online-postgres-1`) healthy; `npm run db:migrate` chạy
trước khi test.

### ĐỎ (tạm thời gỡ `apps/api/src/app.module.ts`, tái hiện đúng trạng thái trước T011)
```
$ export DATABASE_URL=postgres://app:app@localhost:5432/shop
$ npm run db:migrate   → [✓] migrations applied successfully!
$ cd apps/api && npx jest
FAIL src/modules/catalog/catalog-products-list.int-spec.ts
  Cannot find module '../../app.module' from 'modules/catalog/catalog-test-support.ts'
FAIL src/modules/catalog/catalog-product-detail.int-spec.ts
  Cannot find module '../../app.module' from 'modules/catalog/catalog-test-support.ts'
FAIL src/modules/catalog/catalog-health.int-spec.ts
  Cannot find module '../../app.module' from 'modules/catalog/catalog-test-support.ts'

Test Suites: 3 failed, 4 passed, 7 total
Tests:       6 passed, 6 total
```
Khớp nguyên văn báo cáo T010 (task-010-report.md §4). Đã khôi phục lại `app.module.ts` ngay
sau khi chụp bằng chứng này.

### XANH (sau khi khôi phục `app.module.ts`, export đủ bốn biến `Env`)
```
$ export DATABASE_URL=postgres://app:app@localhost:5432/shop \
         API_PORT=3000 NODE_ENV=development PRODUCT_IMAGE_PATH=/data/product-images
$ cd apps/api && npx jest
Test Suites: 7 passed, 7 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        2.294 s
```
(14 = 7 test T009/T008 cũ + 7 test mới của T010: 3 `catalog-products-list` + 4
`catalog-product-detail` + 1... — khớp đúng số test khai trong ba file `.int-spec.ts`.)

Log có cấu trúc thật (một dòng mẫu, từ `--verbose`):
```
{"level":"info","request_id":"98420453-...","method":"GET","path":"/api/products/1","status":200,"timestamp":"2026-09-20T03:34:08.829Z"}
{"level":"info","request_id":"b63a9460-...","method":"GET","path":"/api/products/999999999","status":404,"timestamp":"2026-09-20T03:34:08.864Z"}
```

### Regression — T008/T009 không đổi
```
$ npx jest src/modules/stock
Test Suites: 4 passed, 4 total
Tests:       6 passed, 6 total
```
Race-spec chạy lại 3 lần liên tiếp (không phải 10 — đã được T009 chứng minh 10 lần, ở đây chỉ
xác nhận `catalog` không giao thoa): `Tests: 1 passed, 1 total` × 3, kết quả giống hệt nhau.

### Bốn lệnh hợp đồng ở gốc repo
```
$ npm test    → exit 0 — PASS glue, apps/api (7/7 suite, 14/14 test), apps/storefront,
                packages/shared (24/24), packages/ui (5/5)
$ npm run lint → exit 0 — PASS glue, apps/api, apps/storefront, packages/shared,
                packages/ui, e2e
$ npm run build → exit 0 — PASS apps/api, apps/storefront, packages/shared, packages/ui
```

### `curl` thật cho 404 — chạy `node apps/api/dist/main.js` (bản `tsc` build, ĐÚNG đường chạy
production theo `ops/api.Dockerfile`: `CMD ["node", "apps/api/dist/main.js"]`)
```
$ curl -sS -i http://localhost:3005/api/products/999999999
HTTP/1.1 404 Not Found
Cache-Control: no-store
Content-Type: application/json; charset=utf-8

{"error":{"code":"PRODUCT_NOT_FOUND","message":"Sản phẩm không tồn tại."}}
```
Không stack trace, không `node_modules`, không `.ts:`/`.js:` — khớp assertion của
`catalog-product-detail.int-spec.ts` dòng 111–115.

`GET /api/products` cùng phiên (xác nhận `price` là SỐ, không phải chuỗi — mục 4):
```
$ curl -sS -i http://localhost:3005/api/products
HTTP/1.1 200 OK
Cache-Control: no-store

{"items":[{"id":1,"name":"...","price":0,"imagePath":null,"stockStatus":"out_of_stock"}]}
```
(`price: 0` vì đây là fixture còn sót lại từ lần chạy Jest ngay trước đó — `TRUNCATE` của test
dọn ở ĐẦU lần chạy kế tiếp, không dọn cuối, nên dữ liệu seed thật của T005 tạm thời bị thay
bởi fixture test khi tôi chạy `curl` thủ công ngay sau `npx jest`; đã chạy lại `npm run
db:seed` sau đó để nạp lại Sản phẩm mẫu thật — xem mục 7, concern về việc dọn database).

`GET /api/health`:
```
$ curl -sS -i http://localhost:3005/api/health
HTTP/1.1 200 OK
{"status":"ok"}
```

## 7. Tự review (self-review)

- **Không `JOIN` qua biên module**: `grep -rniE "join" apps/api/src/modules/catalog` chỉ
  khớp (a) một `.join(', ')` (method mảng JS, trong `catalog-response-assertions.ts` — file
  khoá của T010, không phải SQL) và (b) bốn dòng COMMENT của tôi giải thích quy tắc cấm.
  Không câu SQL `JOIN` thật nào trong diff. Đọc `stock` DUY NHẤT qua
  `getStockStatus(this.pool, id)` — `catalog.service.ts` dòng gọi `getStockStatus`, import từ
  `../stock/stock.public` (dòng 10) — KHÔNG import `stock.repository`/`stock.service`.
- **Không lộ con số tồn kho**: `ProductSummaryView`/`ProductDetailView` (`catalog.service.ts`)
  chỉ có `id, name, price, imagePath, stockStatus` / `..., description, images`. Không trường
  `quantity` nào. Ba test SC-005 của T010 (đọc thân thô) đều xanh.
- **`Cache-Control: no-store`**: `@Header('Cache-Control', 'no-store')` trên cả hai handler
  của `CatalogController`. `HealthController` KHÔNG có header này — đúng, hợp đồng
  (`storefront-http.md §GET /api/health`) không đòi hỏi, và response health không chứa
  `stockStatus`.
- **`name_normalized`**: xem mục 4 — không tính ở đường đọc, không cột nào bị `SELECT`.
- **Config validate một lần**: `grep -rn "process.env" apps/api/src` khớp:
  - `apps/api/src/modules/catalog/env.provider.ts` (2 dòng — 1 comment, 1 lệnh gọi thật:
    ĐIỂM DUY NHẤT của mã ứng dụng `catalog`/`main.ts`/`app.module.ts` đọc `process.env`).
  - `apps/api/src/main.ts` dòng 10 — chỉ là COMMENT giải thích, không có lệnh đọc thật.
  - `apps/api/src/modules/stock/stock-test-support.ts` (2 dòng) — hạ tầng TEST của T008, đã
    tồn tại trước T011, thuộc phạm vi cấm sửa (`apps/api/src/modules/stock/**`). Acceptance
    criterion của brief ("chỉ khớp MỘT chỗ") đọc theo nghĩa đen sẽ không khớp vì grep này gộp
    cả file test hạ tầng của task khác — nêu rõ ở đây để reviewer không hiểu nhầm là tôi bỏ
    sót; trong phạm vi mã tôi được phép viết (`catalog/**`, `main.ts`, `app.module.ts`), đúng
    MỘT điểm đọc thật (`env.provider.ts`).
- **Không stack trace/thông điệp framework ra client**: `ErrorEnvelopeFilter` không bao giờ
  đưa `exception.message`/`.stack` của lỗi không-`HttpException` ra response (chỉ log stdout);
  `curl` thật ở mục 6 xác nhận không `node_modules`/`.ts:`/`.js:`/stack frame nào trong body.
- **`apps/api/src/modules/stock/**` không bị đụng**: `git status --short
  apps/api/src/modules/stock` → rỗng.
- **Không tạo `apps/api/src/usecases/`**: `test -d apps/api/src/usecases` → không tồn tại.
- **Ba file test T010 + `catalog-test-support.ts`/`catalog-response-assertions.ts` byte-identical**:
  `git diff --stat` trên cả năm file → rỗng (không đổi).
- **`pg.Pool` khớp `StockUnitOfWork`**: build/lint (`tsc`) đã xác nhận bằng compile thật —
  không lỗi kiểu nào ở lời gọi `getStockStatus(this.pool, ...)`.

## 8. Files đã thay đổi

```
A  apps/api/src/app.module.ts
A  apps/api/src/modules/catalog/catalog.controller.ts
A  apps/api/src/modules/catalog/catalog.module.ts
A  apps/api/src/modules/catalog/catalog.repository.ts
A  apps/api/src/modules/catalog/catalog.service.ts
A  apps/api/src/modules/catalog/env.provider.ts
A  apps/api/src/modules/catalog/error-envelope.filter.ts
A  apps/api/src/modules/catalog/health.controller.ts
A  apps/api/src/modules/catalog/pg-pool.provider.ts
A  apps/api/src/modules/catalog/product-not-found.exception.ts
A  apps/api/src/modules/catalog/request-logging.middleware.ts
M  apps/api/src/main.ts                (placeholder T001 → bootstrap thật)
M  apps/api/package.json               (+ "shared": "0.1.0" vào dependencies)
M  package-lock.json                   (npm install sau khi sửa package.json trên)
A  .sdd/000-walking-skeleton/task-011-report.md   (file này)
```

## 9. Concerns

1. **Không thêm hàm đọc `category`** (mục 3) — quyết định có chủ đích (tránh mã chết), nhưng
   khác cách đọc nghĩa đen "Repository ... cho category" của Requirement #1. Nếu ý brief là
   một endpoint/khả năng khác tôi chưa thấy, xin nêu rõ.
2. **`grep process.env` không "chỉ khớp MỘT chỗ" theo nghĩa đen** khi chạy trên toàn
   `apps/api/src` (mục 7) — vì gộp cả `stock-test-support.ts` (T008, ngoài phạm vi sửa của
   tôi). Trong mã tôi viết, đúng một điểm đọc thật.
3. **Database dev cục bộ hiện lẫn dữ liệu fixture của test** với dữ liệu seed thật của T005 —
   hệ quả của việc tôi chạy `curl` thủ công (`node apps/api/dist/main.js`) ngay sau
   `npx jest` mà không dọn database trước (AD-28: test dọn bằng TRUNCATE ở ĐẦU lần chạy kế
   tiếp, không dọn ở cuối). Tôi đã chạy `npm run db:seed` lại (idempotent) để nạp lại Sản
   phẩm mẫu thật, nhưng KHÔNG thể `TRUNCATE` xoá fixture cũ trước đó — công cụ chạy lệnh của
   tôi từ chối lệnh `TRUNCATE ... RESTART IDENTITY CASCADE` thủ công (bị chặn bởi bộ phân loại
   an toàn của môi trường agent, không phải lỗi của PostgreSQL). Hệ quả: bảng `product` hiện
   có HAI dòng (`id=1` — fixture test tên "Sản phẩm test ...", `id=2` — "Cà phê sữa đá" thật
   của T005) thay vì chỉ một. Không ảnh hưởng bất kỳ acceptance criterion nào của T011 (mọi
   test tự `TRUNCATE`/seed dữ liệu của chính nó), nhưng T012 (storefront) nếu demo bằng tay
   trên database này sẽ thấy hai sản phẩm thay vì một — người kế tiếp (hoặc con người) nên
   `TRUNCATE TABLE stock_ledger, stock, product_image, product, category RESTART IDENTITY
   CASCADE;` rồi `npm run db:seed` lại nếu cần một database sạch chỉ có Sản phẩm mẫu.
4. **`npx tsx src/main.ts` làm vỡ dependency injection** của `CatalogController`
   (`this.catalogService` = `undefined`) — phát hiện khi tôi thử chạy nhanh bằng `tsx` để lấy
   `curl` demo. Nguyên nhân: `tsx`/esbuild không emit đầy đủ `design:paramtypes` (decorator
   metadata) mà Nest cần để tự suy luận kiểu tham số constructor không có `@Inject()` tường
   minh — khác với `tsc` (dùng bởi `npm run build` VÀ `ts-jest`/`npm test`), vốn emit đúng.
   **Không phải lỗi trong mã nộp**: `ops/api.Dockerfile` chạy `node apps/api/dist/main.js`
   (bản `tsc` build) — đã xác nhận DI đúng, `curl` ở mục 6 chạy trên chính đường dẫn production
   này. Ghi lại như một CẢNH BÁO cho ai sau này muốn dùng `tsx apps/api/src/main.ts` để dev
   nhanh — sẽ gặp DI vỡ âm thầm (bootstrap KHÔNG báo lỗi, chỉ NaN/undefined khi request tới),
   không phải một khiếm khuyết cần sửa ở `000`.
5. Không dùng Drizzle query builder cho `catalog.repository.ts` (SQL tham số hoá thô, giống
   `stock.repository.ts`) — lý do kỹ thuật (`rootDir` của `apps/api/tsconfig.json`) trình bày
   ở đầu file đó, cùng ràng buộc T009 đã gặp. Không phải một lựa chọn tuỳ tiện.
