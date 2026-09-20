# Task T011b — Báo cáo: phục vụ ảnh sản phẩm qua HTTP (fix R22)

## Trạng thái: DONE

## Fix round 1/5 — cảnh báo khi `diskPath` không khớp `PRODUCT_IMAGE_PATH`

### Finding (Important, review round 1)

`catalog.service.ts` (`toImageUrl`, dòng 63–69 bản trước fix): khi `diskPath` không bắt đầu
bằng `${PRODUCT_IMAGE_PATH}/`, code âm thầm rơi vào fallback
`diskPath.replace(/^\/+/, '')`, sinh một URL SAI (ví dụ
`/images/data/product-images/x.jpg` cho một đường dẫn tuyệt đối không khớp tiền tố) mà không
báo hiệu gì. Không phải lỗi live hôm nay (dữ liệu seed luôn khớp `PRODUCT_IMAGE_PATH`), nhưng
nếu biến này đổi mà không re-seed, hoặc một đường ghi tương lai chuẩn hoá `path` khác đi, `<img>`
sẽ vỡ âm thầm, không ai biết vì sao.

### Fix

Giữ NGUYÊN hành vi fallback (không throw — một dòng `product_image` hỏng không được làm sập cả
response danh sách/chi tiết Sản phẩm). Chỉ thêm: khi phát hiện `diskPath` không khớp tiền tố,
log một cảnh báo có cấu trúc ra stdout, TRƯỚC khi rơi vào fallback — cùng quy ước log đã có của
module (`request-logging.middleware.ts`, `error-envelope.filter.ts`: JSON một dòng, có
`level`, một `msg` tiếng Việt, các trường liên quan, `timestamp` ISO):

```json
{"level":"warn","msg":"product_image.path không khớp tiền tố PRODUCT_IMAGE_PATH đã cấu hình — ánh xạ URL ảnh có thể sai","diskPath":"...","productImagePath":"...","timestamp":"..."}
```

Chỉ sửa `apps/api/src/modules/catalog/catalog.service.ts` — không file nào khác.

### Xác thực

**Ba test T010 (`src/modules/catalog`) vẫn xanh:**
```
$ cd apps/api && npx jest src/modules/catalog
Test Suites: 3 passed, 3 total
Tests:       8 passed, 8 total
```

**`lint`/`build` cho `apps/api` vẫn exit 0:**
```
$ npm run lint --workspace=apps/api   → tsc --noEmit, exit 0
$ npm run build --workspace=apps/api  → tsc -p tsconfig.build.json, exit 0
```

**Cảnh báo thực sự phát ra khi mismatch** — demo tay, gọi TRỰC TIẾP mã đã build
(`apps/api/dist/modules/catalog/catalog.service.js`, không viết lại logic ở nơi khác), tạo một
instance `CatalogService` với `env`/`pool` giả (`toImageUrl` không dùng `pool`), gọi với một
`diskPath` khớp và một `diskPath` không khớp:

```
$ node demo-image-url-mismatch.js
--- Case 1: diskPath khớp prefix (không cảnh báo) ---
result = /images/ca-phe-sua-da.jpg
--- Case 2: diskPath KHÔNG khớp prefix (phải thấy console.warn ở trên) ---
{"level":"warn","msg":"product_image.path không khớp tiền tố PRODUCT_IMAGE_PATH đã cấu hình — ánh xạ URL ảnh có thể sai","diskPath":"/mnt/other-volume/ca-phe-sua-da.jpg","productImagePath":"/data/product-images","timestamp":"2026-09-20T08:33:34.039Z"}
result = /images/mnt/other-volume/ca-phe-sua-da.jpg
```

Case 1 (khớp prefix): không log nào, URL đúng. Case 2 (không khớp): cảnh báo phát ra ĐÚNG với
`diskPath`/`productImagePath` thật, VÀ fallback vẫn trả về một URL (hành vi cũ không đổi) —
đúng yêu cầu "không throw, chỉ làm cho điều kiện này quan sát được". Script demo là file
throwaway ngoài repo (không thêm file `*-spec.ts`/test nào vào `apps/api/src/modules/catalog`
— tránh chạm phạm vi Forbidden của T010 lẫn mở rộng phạm vi ngoài yêu cầu review).

### Housekeeping

Chạy `npx jest src/modules/catalog` ở trên lại để lại fixture test trong `postgres` dùng
chung (đúng AD-28) — theo ghi chú của coordinator, KHÔNG re-seed ở vòng này; controller sẽ xử
lý trước khi kiểm tay tiếp theo.

### Files thay đổi ở fix round 1

```
M  apps/api/src/modules/catalog/catalog.service.ts   (+~28 dòng — cảnh báo mismatch)
M  .sdd/000-walking-skeleton/task-011b-report.md      (phần này)
```

## 1. Đã làm gì

Hai thay đổi cơ học, đúng phạm vi Ruling R22 (`progress.md`):

### 1.1 `ops/Caddyfile` — route tĩnh `/images/*`

Thêm một named matcher + `handle` mới, đặt **sau** `@api`/`@admin`, **trước** nhánh SPA
fallback, **bên trong** site block `:80 { ... }` nơi `import security_headers` đã áp dụng vô
điều kiện từ đầu file — **không** thêm, không lặp lại, không đổi bất kỳ directive header nào:

```caddyfile
@images path /images/*
handle @images {
	root * {$PRODUCT_IMAGE_PATH:/data/product-images}
	uri strip_prefix /images
	file_server
}
```

`{$PRODUCT_IMAGE_PATH:/data/product-images}` dùng đúng kiểu placeholder-có-mặc-định mà dòng
`reverse_proxy api:{$API_PORT:3000}` đã dùng ở trên — biến này không được bơm vào container
`proxy` qua `environment:`/`env_file:` (chỉ dùng để resolve mount ở `ops/compose.yaml`), nên
mặc định khớp đúng `${PRODUCT_IMAGE_PATH:-/data/product-images}` mà compose dùng.

### 1.2 `apps/api/src/modules/catalog/catalog.service.ts` — ánh xạ đường dẫn đĩa → URL

Thêm `@Inject(ENV)` vào constructor của `CatalogService` (đã có sẵn `ENV`/`AppEnv` từ
`env.provider.ts`, T011) để đọc `PRODUCT_IMAGE_PATH` đã validate. Thêm hai hàm private:

```ts
private toImageUrl(diskPath: string): string {
  const root = this.env.PRODUCT_IMAGE_PATH.replace(/\/+$/, '');
  const relative = diskPath.startsWith(`${root}/`)
    ? diskPath.slice(root.length + 1)
    : diskPath.replace(/^\/+/, '');
  return `/images/${relative}`;
}

private toImageUrlOrNull(diskPath: string | null): string | null {
  return diskPath === null ? null : this.toImageUrl(diskPath);
}
```

Áp dụng ở cả hai chỗ hình dạng response chứa đường dẫn ảnh:
- `listProducts()` → `imagePath: this.toImageUrlOrNull(row.imagePath)`.
- `getProductDetail()` → `images: imageRows.map((image) => ({ path: this.toImageUrl(image.path), position: image.position }))`.

Giữ nguyên phần đường dẫn CÒN LẠI sau khi bỏ tiền tố `PRODUCT_IMAGE_PATH` (không dùng
`path.basename`) — một ảnh ở thư mục con (`${PRODUCT_IMAGE_PATH}/x/y.jpg`) sẽ map thành
`/images/x/y.jpg`, không mất thông tin thư mục con (Requirement #3 của brief).

`catalog.repository.ts` **không đổi** — vẫn SELECT/trả nguyên văn `product_image.path` (đường
dẫn đĩa); ánh xạ chỉ xảy ra ở tầng service, đúng yêu cầu "chỉ tầng trình bày, không đổi cột
lưu trong database".

## 2. Bằng chứng xác thực — dựng thật, `curl` thật

### 2.1 `caddy validate` với image pin `caddy:2.11.4`

```
$ docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile
{"level":"info",...,"msg":"using config from file","file":"/etc/caddy/Caddyfile"}
{"level":"info",...,"msg":"adapted config to JSON","adapter":"caddyfile"}
Valid configuration
```

### 2.2 Dựng thật — CHÚ Ý một trở ngại hạ tầng có trước, không thuộc phạm vi T011b

`docker compose -f ops/compose.yaml build api` **thất bại** — không liên quan gì tới thay đổi
của tôi:

```
src/modules/catalog/catalog.controller.ts(11,33): error TS2307: Cannot find module 'shared' ...
src/modules/catalog/env.provider.ts(14,24): error TS2307: Cannot find module 'shared' ...
```

Nguyên nhân: `ops/api.Dockerfile.dockerignore` (T002, đóng) loại `**/dist` khỏi build
context — nên `COPY . .` ở stage `build` không bao giờ mang theo `packages/shared/dist`, và
`ops/api.Dockerfile` không có bước `npm run build --workspace=packages/shared` bên trong
image. Kết quả: **chưa từng có ai build thành công** image `api` trong repo này (`docker
images`/`docker compose images` xác nhận không có image `shop-online-api` nào từng tồn tại).
Đây là lỗ hổng của `ops/api.Dockerfile`/`.dockerignore` (T002) — cả hai đều nằm trong Forbidden
list của brief T011b ("đã đóng, không cần sửa cho fix này"), nên tôi **không sửa**, chỉ báo lại
ở đây (xem mục 5, Concern #1) để `/speckit-converge`/T015 bắt được.

Để vẫn chứng minh route Caddy + ánh xạ URL hoạt động **thật, qua đúng origin**, tôi dựng một
cấu hình tương đương KHÔNG chạm bất kỳ file forbidden nào:
1. `postgres` — dịch vụ compose có sẵn (đã chạy, healthy).
2. `npm run build --workspace=packages/shared && npm run build --workspace=apps/api` trên host
   (chính lệnh `ops/api.Dockerfile` gọi bên trong image, chạy được — exit 0 cả hai).
3. `npm run db:migrate && npm run db:seed`.
4. `docker compose -f ops/compose.yaml up -d --no-deps proxy` — chỉ dựng `proxy` (Caddyfile +
   mount `product-images` + `apps/storefront/dist`), bỏ qua việc dựng `api` (tránh lỗi build ở
   trên) mà **không sửa** `ops/compose.yaml`.
5. Chạy `apps/api/dist/main.js` (bản `tsc` build ở bước 2 — đúng cách `ops/api.Dockerfile`
   chạy production, `CMD ["node", "apps/api/dist/main.js"]`) trong một container
   `node:24.21.0-bookworm-slim` (đúng base image `ops/api.Dockerfile` dùng), gắn vào mạng
   `shop-online_default` với alias mạng `api` — để `proxy` phân giải DNS `api` y hệt như khi
   dịch vụ `api` thật của compose chạy (`reverse_proxy api:{$API_PORT:3000}` trong Caddyfile
   không đổi).
6. Volume `product-images` **rỗng** khi mới dựng (không task nào trong 15 task từng ghi FILE
   ảnh thật vào đó — `db/seed.ts` chỉ ghi DÒNG DATABASE trỏ tới đường dẫn, xem Concern #2). Tôi
   ghi một file JPEG hợp lệ 1×1 pixel (287 byte) vào đúng
   `product-images:/ca-phe-sua-da.jpg` (khớp path DB đã seed) qua một container `alpine` tạm —
   **không** chạm git repo, chỉ ghi vào named volume runtime, để có tệp thật cho `curl` kiểm.

Không file nào trong Forbidden list (`ops/compose.yaml`, `ops/api.Dockerfile`,
`ops/.env.example`, `db/**`) bị sửa ở bất kỳ bước nào trên — toàn bộ chỉ là lệnh vận hành
runtime (docker run/build/migrate/seed), giống các lệnh brief đã liệt ở "Verification
commands".

### 2.3 `curl` thật — ảnh tải được, đủ ba header an toàn

```
$ curl -sI http://localhost/images/ca-phe-sua-da.jpg
HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 287
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Content-Type: image/jpeg
Etag: "dljurjwrw7ih7z"
Last-Modified: Sun, 20 Sep 2026 04:18:28 GMT
Referrer-Policy: same-origin
Server: Caddy
Vary: Accept-Encoding
X-Content-Type-Options: nosniff
Date: Sun, 20 Sep 2026 04:19:00 GMT
```

200, `Content-Type: image/jpeg` đúng, đủ ba header AD-29 (`Content-Security-Policy`,
`Referrer-Policy`, `X-Content-Type-Options`).

### 2.4 `curl` thật — JSON đã đổi từ đường dẫn đĩa sang URL

```
$ curl -s http://localhost/api/products | jq
{
  "items": [
    {
      "id": 1,
      "name": "Cà phê sữa đá",
      "price": 25000,
      "imagePath": "/images/ca-phe-sua-da.jpg",
      "stockStatus": "in_stock"
    }
  ]
}

$ curl -s http://localhost/api/products/1 | jq '.images'
[
  {
    "path": "/images/ca-phe-sua-da.jpg",
    "position": 0
  }
]
```

Chạy TRƯỚC khi chạy Jest (database sạch, đúng một Sản phẩm mẫu — xác nhận bằng `SELECT id,
name FROM product` → 1 dòng "Cà phê sữa đá" trước khi test chạy).

### 2.5 Database — `product_image.path` KHÔNG đổi

```
$ psql ... -c "SELECT id, product_id, path, position FROM product_image;"
 id | product_id |                  path                  | position
----+------------+----------------------------------------+----------
  1 |          1 | /data/product-images/ca-phe-sua-da.jpg |        0
```

Vẫn là đường dẫn đĩa nguyên văn — đúng AD-15, ánh xạ chỉ ở tầng trình bày.

### 2.6 Bốn/bảy test T010 vẫn xanh + toàn bộ suite `apps/api`

```
$ cd apps/api && npx jest --verbose
Test Suites: 7 passed, 7 total
Tests:       14 passed, 14 total
```

Ba file `.int-spec.ts` của T010 (`catalog-products-list`, `catalog-product-detail`,
`catalog-health`) nằm trong 7/7 xanh — xác nhận đúng như brief dự đoán: chúng kiểm HÌNH DẠNG
qua schema (`storefront.ProductSummarySchema`/`ProductDetailSchema`, đều chỉ ràng buộc
`imagePath`/`path` là `string | null` / `string`, không ràng buộc giá trị cụ thể), nên đổi giá
trị từ đường dẫn đĩa sang `/images/...` không phá bất kỳ assertion nào.

(Sau khi chạy `npx jest`, database lại lẫn fixture test theo đúng AD-28 — như task-011-report.md
đã ghi nhận cùng hiện tượng. Tôi đã chạy lại `npm run db:seed` để nạp lại Sản phẩm mẫu thật;
không `TRUNCATE` fixture cũ, giữ đúng nguyên tắc AD-28 "không dọn tay bằng TRUNCATE thủ công".)

### 2.7 `lint`/`build` cho `apps/api`

```
$ npm run lint --workspace=apps/api   → tsc --noEmit, exit 0
$ npm run build --workspace=apps/api  → tsc -p tsconfig.build.json, exit 0
```

## 3. Dọn dẹp môi trường sau khi kiểm

Container `proxy` và container `api` chạy tay (`shop-online-api-manual`) đã `docker stop`/`rm`
sau khi lấy đủ bằng chứng — chỉ còn lại `shop-online-postgres-1` (đúng trạng thái tìm thấy lúc
bắt đầu task, đã chạy sẵn 14h trước khi tôi vào việc). File JPEG test (287 byte) tôi ghi vào
named volume `product-images` được CỐ Ý giữ lại — nó khớp đúng path DB đã seed
(`ca-phe-sua-da.jpg`), nên hữu ích cho ai kiểm tay tiếp theo (T012/T015); không phải dữ liệu
production thật (xem Concern #2).

## 4. Files đã thay đổi

```
M  ops/Caddyfile                                     (+29 dòng — route @images)
M  apps/api/src/modules/catalog/catalog.service.ts   (+33/-4 — inject ENV, toImageUrl(...))
A  .sdd/000-walking-skeleton/task-011b-report.md      (file này)
```

`git diff --stat`: đúng hai file mã nguồn trong Allowed scope, không file nào khác bị đụng.

## 5. Tự review (self-review)

- **Không đổi header nào**: `git diff -- ops/Caddyfile | grep -n "header\|security_headers"` →
  rỗng — route mới không thêm/lặp/sửa bất kỳ directive `header`/`import security_headers` nào,
  vẫn nằm dưới `import security_headers` áp dụng vô điều kiện ở đầu site block `:80`.
- **Không đổi schema/database**: `git status --short db` → rỗng. `product_image.path` xác nhận
  bằng `SELECT` thật ở mục 2.5 — không đổi.
- **Không chạm file test khoá**: `git status --short apps/api/src/modules/catalog` không có
  bất kỳ `*-spec.ts`/`catalog-test-support.ts` nào — chỉ `catalog.service.ts`.
- **Không chạm Forbidden list khác**: `git status --short ops/compose.yaml
  ops/api.Dockerfile ops/.env.example` → rỗng cho cả ba.
- **`catalog.repository.ts` không đổi**: `git status --short apps/api/src/modules/catalog/catalog.repository.ts`
  → rỗng — repository vẫn trả nguyên văn đường dẫn đĩa, đúng phân tầng "ánh xạ chỉ ở service".
- **Không mở rộng phạm vi**: không file nào ngoài hai file khai ở mục 4 bị sửa.

## 6. Concerns

1. **`docker compose -f ops/compose.yaml build api` thất bại** (mục 2.2) — lỗi có trước T011b,
   thuộc `ops/api.Dockerfile`/`ops/api.Dockerfile.dockerignore` (T002, cả hai đều Forbidden với
   task này). Nguyên nhân: dockerignore loại `**/dist` khỏi build context, nhưng Dockerfile
   không có bước build `packages/shared` bên trong image, nên `tsc` của stage `build` không
   bao giờ thấy `shared/dist`. Chưa image nào của `api` từng build thành công trong repo này
   (xác nhận bằng `docker images`). Đây LÀ một lỗ hổng thật, giống R22 nhưng ở một lớp khác
   (build, không phải routing) — nên được ghi nhận để `/speckit-converge`/T015 xử lý (T015 vốn
   dĩ đã có kế hoạch "dựng sạch" và sẽ bắt lỗi này ngay ở bước `docker compose up`).
2. **Chưa task nào ghi FILE ảnh thật vào volume `product-images`** — `db/seed.ts` chỉ ghi dòng
   database trỏ tới đường dẫn `${PRODUCT_IMAGE_PATH}/ca-phe-sua-da.jpg`, không ghi byte ảnh
   nào. Tôi tạo một JPEG 1×1 pixel (287 byte) để kiểm route (mục 2.2 bước 6, mục 3) — đủ để
   xác nhận Content-Type/route đúng, nhưng KHÔNG phải ảnh sản phẩm thật. Không có task nào
   trong 15 task sở hữu việc cung cấp asset ảnh thật; cần một quyết định (task mới hoặc ghi
   vào ruling) về việc này trước khi demo cho người dùng thật.
3. Cả hai concern trên đều KHÔNG chặn acceptance criteria của T011b — route và ánh xạ URL hoạt
   động đúng khi có container `api` sống và có file ảnh thật tại đường dẫn mount, đã chứng minh
   bằng `curl` thật ở mục 2.3/2.4.
