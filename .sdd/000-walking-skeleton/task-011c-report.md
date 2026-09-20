# Task T011c — Báo cáo: build `api` thật + tệp ảnh thật cho seed (Ruling R23)

## Trạng thái: DONE_WITH_CONCERNS

Hai phần (a)/(b) của brief đã làm đúng, đã xác thực thật. Nhưng khi dựng cả stack bằng
chính ảnh vừa build, phát hiện thêm MỘT lỗ hổng thứ ba — nằm ở stage `run` của
`ops/api.Dockerfile`, mà brief này CẤM tôi chạm ("Không đổi stage `deps` hay `run`") — khiến
`api` không chạy được (crash-loop), dù build thành công. Xem mục 3 (Concern #1) — đây là phát
hiện mới, không phải lỗi tôi gây ra, và tôi không tự sửa vì nó ngoài phạm vi được cấp.

## 1. Đã làm gì

### 1.1 `ops/api.Dockerfile` — build `packages/shared` trước `apps/api`

Thêm ĐÚNG MỘT dòng, đúng vị trí brief chỉ định — sau `COPY . .` / `COPY --from=deps
.../node_modules`, trước `RUN npm run build --workspace=apps/api`:

```dockerfile
RUN npm run build --workspace=packages/shared
```

Không đổi thứ tự `COPY` đã có, không đổi stage `deps`/`run`, không thêm build cho
`packages/ui` (chưa cần — `apps/api` hiện không import nó).

### 1.2 `db/assets/ca-phe-sua-da.jpg` — tệp ảnh thật mới

JPEG hợp lệ 64×64, 746 byte (dựng bằng Pillow trong một venv Python tạm ngoài repo — không
cài gì vào repo hay vào máy hệ thống), mở được bằng `file`:
```
db/assets/ca-phe-sua-da.jpg: JPEG image data, JFIF standard 1.01, ..., baseline, precision 8,
64x64, components 3
```
Là tài sản tĩnh đi kèm mã nguồn (không phải dữ liệu người dùng), commit vào repo.

### 1.3 `db/seed.ts` — copy tệp ảnh ra đĩa sau khi transaction database commit

- Thêm import `node:url`, `node:path`, `node:fs/promises` và hằng `seedDir` (thư mục chứa
  `db/seed.ts`, tính qua `import.meta.url` vì chạy ESM qua `tsx`, không có `__dirname`).
- Dời khai báo `const imagePath = \`${productImagePath}/ca-phe-sua-da.jpg\`;` từ TRONG
  transaction ra phạm vi `main()` (giá trị và cách tính KHÔNG đổi — chỉ đổi phạm vi biến, để
  dùng lại được sau khi transaction đã commit).
- SAU `await db.transaction(...)` (transaction database đã đóng, không mở rộng phạm vi nó —
  hệ tệp không rollback theo Postgres nên tách hẳn khỏi transaction là đúng), thêm:
  ```ts
  const sourceImagePath = path.join(seedDir, 'assets', 'ca-phe-sua-da.jpg');
  await fs.mkdir(path.dirname(imagePath), { recursive: true });
  await fs.copyFile(sourceImagePath, imagePath);
  ```
  `fs.copyFile` ghi đè tệp đích nếu đã tồn tại, không lỗi — idempotent đúng yêu cầu.

KHÔNG dòng ghi database nào (category/product/product_image/stock, khoá advisory,
transaction) bị đổi — xem `git diff` mục 4.

## 2. Bằng chứng xác thực — dựng thật

### 2.1 `docker compose -f ops/compose.yaml build api` — THÀNH CÔNG THẬT, exit 0 (đầy đủ, không cắt)

```
#13 [build 5/6] RUN npm run build --workspace=packages/shared
#13 1.547
#13 1.547 > shared@0.1.0 build
#13 1.547 > tsc -p tsconfig.build.json
#13 1.547
#13 2.541 npm notice New major version of npm available! 11.19.0 -> 12.0.2
#13 DONE 2.6s

#14 [build 6/6] RUN npm run build --workspace=apps/api
#14 0.342
#14 0.342 > api@0.1.0 build
#14 0.342 > tsc -p tsconfig.build.json
#14 0.342
#14 DONE 1.2s

#15 [run 3/5] COPY --from=build /repo/node_modules ./node_modules
#16 [run 4/5] COPY --from=build /repo/apps/api/dist ./apps/api/dist
#17 [run 5/5] COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
#18 exporting to image ... naming to docker.io/library/shop-online-api:latest done
 shop-online-api  Built
```

Lần đầu tiên trong repo này `docker images` có `shop-online-api` (xác nhận tại mục 3, Concern
#1 — dùng để chứng minh đây là lỗ hổng MỚI, không phải thứ T011c gây ra).

### 2.2 `docker compose -f ops/compose.yaml up -d` — cả stack

```
Container shop-online-postgres-1  Running
Container shop-online-api-1  Created  → Starting → Started
Container shop-online-proxy-1  Created → Starting → Started

NAME                     IMAGE             SERVICE    STATUS
shop-online-api-1        shop-online-api   api        Up Less than a second   (lúc mới lên)
shop-online-postgres-1   postgres:18.6     postgres   Up 7 hours (healthy)
shop-online-proxy-1      caddy:2.11.4      proxy      Up 3 seconds
```

**Vài giây sau, `api` crash-loop** — xem Concern #1, mục 3. `postgres` và `proxy` (dùng ảnh
build thật, tức `proxy` phục vụ `/images/*` trực tiếp từ named volume, KHÔNG qua `api`) vẫn
`Up` bình thường trong suốt quá trình kiểm dưới đây.

### 2.3 Ghi tệp ảnh thật vào ĐÚNG named volume — `npm run db:seed` tương đương, chạy trong container nối đúng network + mount đúng volume

Vì `PRODUCT_IMAGE_PATH` mặc định `/data/product-images` chỉ có ý nghĩa BÊN TRONG container có
mount named volume `product-images` (named volume — không phải bind mount — nên chạy
`npm run db:seed` trên host trần sẽ ghi vào một thư mục `/data/product-images` không tồn tại/
không liên quan gì tới volume thật; xác nhận: `ls /data` → "No such file or directory" trên
host), tôi chạy chính lệnh `npm run db:seed` gọi (`npx tsx db/seed.ts`, không đổi logic gì)
bên trong một container tạm nối vào network + mount đúng named volume compose đã tạo — cùng
kỹ thuật T011b đã dùng để kiểm chứng khi `api` chưa build được:

```
$ docker run --rm --network shop-online_default \
    -v <repo>:/repo -w /repo \
    -v shop-online_product-images:/data/product-images \
    -e DATABASE_URL=postgres://app:app@postgres:5432/shop \
    -e NODE_ENV=development -e PRODUCT_IMAGE_PATH=/data/product-images \
    node:24.21.0-bookworm-slim npx tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
```

**Tệp thật tồn tại trên đĩa, đúng đường dẫn database đã ghi** — `ls -la` bên trong container
mount volume:
```
$ docker exec shop-online-proxy-1 ls -la /data/product-images
total 16
drwxr-xr-x    2 root     root          4096 Sep 20 04:18 .
drwxr-xr-x    1 root     root          4096 Sep 20 08:43 ..
-rw-r--r--    1 1000     1000           746 Sep 20 08:46 ca-phe-sua-da.jpg
```
```
$ docker exec shop-online-postgres-1 psql -U app -d shop -c \
    "SELECT id,product_id,path,position FROM product_image;"
 id | product_id |                  path                  | position
----+------------+----------------------------------------+----------
  1 |          1 | /data/product-images/ca-phe-sua-da.jpg |        0
```
746 byte khớp đúng `db/assets/ca-phe-sua-da.jpg` đã commit — không phải placeholder tạm.

### 2.4 `curl` thật — qua `proxy` thật (không container thủ công cho route ảnh)

```
$ curl -sI http://localhost/images/ca-phe-sua-da.jpg
HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 746
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Content-Type: image/jpeg
Etag: "dlk0gn9hya97kq"
Last-Modified: Sun, 20 Sep 2026 08:46:20 GMT
Referrer-Policy: same-origin
Server: Caddy
Vary: Accept-Encoding
X-Content-Type-Options: nosniff
Date: Sun, 20 Sep 2026 08:46:28 GMT
```
200, `Content-Type: image/jpeg` đúng, `Content-Length: 746` khớp đúng tệp thật, đủ ba header
AD-29 (`Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`). Route này của
`proxy` không phụ thuộc `api` sống hay không (phục vụ tĩnh trực tiếp từ volume, T011b) — vẫn
đúng dù `api` đang crash-loop (Concern #1).

### 2.5 `npm run db:seed` lần thứ hai — idempotent thật

```
$ docker run --rm --network shop-online_default ... npx tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
exit=0

$ docker exec shop-online-postgres-1 psql -U app -d shop \
    -c "SELECT count(*) FROM category;" -c "SELECT count(*) FROM product;" \
    -c "SELECT count(*) FROM product_image;" -c "SELECT count(*) FROM stock;"
 count            count            count            count
-------          -------          -------          -------
     1                1                1                1
```
Không lỗi, không đổi số dòng ở bất kỳ bảng nào, `ls -la` volume vẫn đúng một tệp
`ca-phe-sua-da.jpg` (746 byte, không nhân bản).

**Lưu ý tự phát hiện trong lúc kiểm (không phải bug, hành vi đã ghi comment sẵn trong file)**:
tôi có thử một lần chạy `db:seed` với `PRODUCT_IMAGE_PATH` KHÁC giá trị mặc định (một thư mục
scratchpad, để dò xem file có ghi ra đúng chỗ không) — đúng như comment ở dòng
"Khoá tra-tồn-tại gồm cả PRODUCT_IMAGE_PATH đã resolve..." đã cảnh báo từ T005, việc này sinh
thêm MỘT dòng `product_image` thứ hai (do khoá tra-tồn-tại gồm cả `path`). Đây là hành vi ĐÃ
BIẾT, ĐÃ CHẤP NHẬN từ review T005 (không phải lỗi tôi tạo ra ở code) — tôi tự gây ra nó bằng
cách thử một biến môi trường không chuẩn, và đã dọn lại (`DELETE FROM product_image WHERE
id = 2`) trước khi seed lại đúng chuẩn — không dùng `TRUNCATE`, chỉ xoá đúng một dòng tôi vừa
tự tạo ra bởi thử nghiệm của mình.

### 2.6 Bốn (thực tế tám) test T010 vẫn xanh

```
$ cd apps/api && npx jest src/modules/catalog
Test Suites: 3 passed, 3 total
Tests:       8 passed, 8 total
```

Sau khi chạy Jest, database bị Jest ghi đè fixture (AD-28, hiện tượng đã ghi nhận ở
task-011b-report.md) — count(product) = 0. Đã `npm run db:seed` lại (qua container, mục 2.3)
để khôi phục đúng 1 Sản phẩm mẫu trước khi chạy các bước tiếp theo.

### 2.7 `npm test`, `npm run lint`, `npm run build` từ gốc repo — cả ba exit 0

```
$ npm test
PASS  glue · unit tests        (22/22)
PASS  apps/api · test          (14/14, gồm 8 test catalog)
PASS  apps/storefront · test   (16/16)
PASS  packages/shared · test   (24/24)
PASS  packages/ui · test       (5/5)

$ npm run lint
PASS  glue · lint
PASS  apps/api · lint
PASS  apps/storefront · lint
PASS  packages/shared · lint
PASS  packages/ui · lint
PASS  e2e · lint

$ npm run build
PASS  apps/api · build
PASS  apps/storefront · build
PASS  packages/shared · build
PASS  packages/ui · build
```

Ghi chú: `db/seed.ts` không nằm trong bất kỳ workspace nào (`scripts/verify.mjs` chỉ quét
`apps/*`, `packages/*`, `e2e/`) nên không được `npm run lint` typecheck — đúng quy ước đã có
từ T005 (không phải khoảng trống do T011c tạo ra). Đã tự xác thực `db/seed.ts` bằng cách CHẠY
THẬT nhiều lần (mục 2.3, 2.5) — bằng chứng hành vi thật mạnh hơn typecheck tĩnh cho một script
I/O thế này.

## 3. Concerns

**#1 (Blocking, MỚI phát hiện, NGOÀI phạm vi được cấp cho T011c) — stage `run` của
`ops/api.Dockerfile` thiếu `packages/shared/dist`, container `api` crash-loop dù build
thành công:**

```
$ docker logs shop-online-api-1
Error: Cannot find module 'shared'
Require stack:
- /repo/apps/api/dist/modules/catalog/env.provider.js
...
    at Object.<anonymous> (/repo/apps/api/dist/modules/catalog/env.provider.js:4:18)
```

Nguyên nhân, xác nhận bằng cách soi trực tiếp image:
```
$ docker run --rm --entrypoint ls shop-online-api -la /repo
apps/  node_modules/            ← KHÔNG có packages/

$ docker run --rm --entrypoint ls shop-online-api -la /repo/node_modules/shared
lrwxrwxrwx ... /repo/node_modules/shared -> ../packages/shared   ← symlink TRỎ RA CHỖ TRỐNG
```

`npm ci --workspace=apps/api --include-workspace-root=true` (stage `deps`) tạo
`node_modules/shared` như MỘT SYMLINK tới `../packages/shared` (cách npm workspaces link gói
nội bộ — không copy file). Stage `run` chỉ copy ba thứ:
```dockerfile
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
```
Không dòng nào copy `/repo/packages/shared` (dist + package.json) — nên symlink trong
`node_modules` trỏ vào một thư mục không tồn tại trong stage `run`. `require('shared')` (mã
CommonJS đã biên dịch của `apps/api`) thất bại ngay khi container khởi động.

Đây là lỗ hổng THỨ BA cùng họ với R23(a) — nhưng ở stage `run`, không phải stage `build` — và
**chưa ai từng phát hiện được vì đây là lần ĐẦU TIÊN ảnh `api` build thành công trong repo
này** (R23(a) chặn build từ đầu, nên stage `run` chưa từng chạy thật). Task-011c-brief.md
CẤM tôi chạm stage `run` ("Không đổi stage `deps` hay `run`") và task description (rule #2)
yêu cầu "add exactly the one build step" / tự-review "exactly one new line trong Dockerfile"
— tôi tuân thủ đúng giới hạn đó, KHÔNG tự sửa stage `run`, dù biết cách sửa (thêm một dòng
`COPY --from=build /repo/packages/shared/dist ./packages/shared/dist` +
`COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json` vào
stage `run`, hoặc biến `node_modules/shared` từ symlink thành thư mục thật ngay trong stage
`build`).

**Vì sao tôi không tự sửa**: cả brief lẫn rule #2 của task description đều minh thị cấm — đây
đúng là tình huống CLAUDE.md §3 mô tả ("nếu implementation xung đột với ràng buộc, DỪNG và báo
xung đột, không tự giải quyết bằng cách sửa code ngoài phạm vi"). Tôi không có thẩm quyền tự mở
rộng scope một task fix nhỏ đã đóng khung rất chặt.

**Ảnh hưởng tới acceptance criteria của T011c**: mục "`docker compose ps` cho thấy `api`
healthy/running bằng chính ảnh vừa build" — KHÔNG đạt (container crash-loop, "Restarting").
Mọi tiêu chí KHÁC (build exit 0, tệp ảnh thật trên volume, `curl` 200 qua `proxy` thật, seed
idempotent, test T010 xanh, `npm test`/`lint`/`build` exit 0) đều đạt và không phụ thuộc `api`
phải sống (route ảnh do `proxy` phục vụ trực tiếp, không qua `api`; test/lint/build/seed đều
chạy trên host hoặc container tạm, không qua ảnh production).

**Đề xuất**: mở một Ruling/task mới (ví dụ T011d) đúng mẫu R23 đã mở T011c, phạm vi CHỈ stage
`run` của `ops/api.Dockerfile` — thêm bước copy `packages/shared/dist` +
`packages/shared/package.json` (hoặc tương đương) vào stage `run`. Đây vẫn chặn T015
(SC-006/SC-007 đòi `docker compose up` cả stack chạy được từ clone sạch).

**#2 (minor, không chặn)**: tôi tự gây ra một dòng `product_image` thừa khi thử nghiệm với
`PRODUCT_IMAGE_PATH` khác chuẩn (mục 2.5) — đã tự dọn bằng `DELETE` đúng một dòng (không
`TRUNCATE`) trước khi seed lại đúng chuẩn. Ghi lại ở đây để minh bạch, không phải lỗi trong
code đã commit.

## 4. Files đã thay đổi

```
M  ops/api.Dockerfile                                (+1 dòng)
M  db/seed.ts                                         (+~25/-2 dòng — copy tệp ảnh sau commit)
A  db/assets/ca-phe-sua-da.jpg                        (746 byte, JPEG thật)
A  .sdd/000-walking-skeleton/task-011c-report.md      (file này — không commit vào git theo
                                                        rule #4 của task, .sdd/ không được add)
```

## 5. Tự review (self-review)

- **Đúng một dòng mới trong Dockerfile**: `git diff -- ops/api.Dockerfile` → `+1` dòng
  (`RUN npm run build --workspace=packages/shared`), không đổi gì khác, không đổi stage
  `deps`/`run`, không đổi thứ tự `COPY`.
- **`db/seed.ts` không đổi hành vi ghi database**: `git diff -- db/seed.ts` — mọi
  `insert`/`select`/`onConflictDoNothing`/khoá advisory/transaction giữ nguyên byte-for-byte;
  thay đổi duy nhất là (a) dời khai báo `imagePath` ra ngoài transaction (cùng giá trị, cùng
  công thức) và (b) thêm bước ghi tệp SAU khi transaction đã đóng.
- **Tệp asset nhỏ, thật**: `db/assets/ca-phe-sua-da.jpg` — 746 byte, `file` xác nhận JPEG hợp
  lệ, mở được.
- **Không chạm Forbidden list**: `git status --short ops/compose.yaml ops/Caddyfile
  ops/api.Dockerfile.dockerignore db/migrations db/schema db/drizzle.config.ts apps packages
  e2e docs/baseline specs scripts tests package.json` → rỗng cho tất cả.
- **Không `git add -A`/`git add .`** — stage theo đường dẫn cụ thể ở bước commit.
- **Không commit `.sdd/`** — chỉ hai file mã nguồn + một asset mới nằm trong `git add`.

## 6. Kết luận

Cả hai phần (a) và (b) của Ruling R23/T011c đã hoàn thành đúng, hẹp, đúng scope, có bằng
chứng chạy thật cho từng acceptance criterion mà scope này cho phép đạt. Một lỗ hổng thứ ba,
độc lập, nằm ngoài phạm vi được cấp (stage `run`) chặn tiêu chí "api healthy" — đã báo cáo đầy
đủ ở Concern #1, không tự sửa, đề xuất mở task mới.
