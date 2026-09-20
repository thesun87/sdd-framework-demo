# Task T011d — Báo cáo: fix crash loop `api` — copy `packages/shared` vào stage `run` (Ruling R25)

## 1. Đã làm gì

Đúng như brief yêu cầu: thêm **đúng hai dòng** `COPY --from=build` vào stage `run` của
`ops/api.Dockerfile`, ngay trước `EXPOSE 3000`, không đổi gì khác:

```dockerfile
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
```

`git diff --stat`: `ops/api.Dockerfile | 2 ++` — đúng một file, đúng hai dòng thêm, không dòng
nào bị xoá/sửa.

Nguyên nhân (đối chiếu `task-011c-report.md` §Concern #1): `npm ci --workspace=apps/api
--include-workspace-root=true` (stage `deps`) tạo `node_modules/shared` là **symlink** npm
workspace trỏ `../packages/shared`. Stage `run` trước đây chỉ copy `node_modules`,
`apps/api/dist`, `apps/api/package.json` — không copy `packages/shared/dist` hay
`package.json` — nên symlink trỏ vào chỗ trống trong stage `run`, `require('shared')` (mã
CommonJS đã biên dịch của `apps/api`) lỗi ngay lúc khởi động.

## 2. Bằng chứng xác thực (chạy thật)

### 2.1 Build lại ảnh — không hồi quy so với T011c

```
$ docker compose -f ops/compose.yaml build api
...
#13 [build 5/6] RUN npm run build --workspace=packages/shared   → DONE 2.4s
#14 [build 6/6] RUN npm run build --workspace=apps/api           → DONE 2.0s
#18 [run 6/7] COPY --from=build /repo/packages/shared/dist ./packages/shared/dist   → DONE
#19 [run 7/7] COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json → DONE
...
 shop-online-api  Built
```

### 2.2 `docker compose up -d` cả stack — `api` healthy, không crash loop

```
$ docker compose -f ops/compose.yaml ps
NAME                     IMAGE             COMMAND                  SERVICE    CREATED          STATUS                 PORTS
shop-online-api-1        shop-online-api   "docker-entrypoint.s…"   api        3 minutes ago    Up 3 minutes           3000/tcp
shop-online-postgres-1   postgres:18.6     "docker-entrypoint.s…"   postgres   19 hours ago     Up 7 hours (healthy)   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
shop-online-proxy-1      caddy:2.11.4      "caddy run --config …"   proxy      18 minutes ago   Up 3 minutes           0.0.0.0:80->80/tcp, [::]:80->80/tcp
```

`api` "Up 3 minutes" không có restart count tăng — không phải "Restarting" như T011c ghi
nhận. Kiểm tra lại sau 15s nữa — vẫn "Up", uptime tăng đều, xác nhận không crash loop.

```
$ docker compose -f ops/compose.yaml logs api --tail 30
api-1  | [Nest] 1  - ... [NestFactory] Starting Nest application...
api-1  | [Nest] 1  - ... [InstanceLoader] AppModule dependencies initialized +14ms
api-1  | [Nest] 1  - ... [InstanceLoader] CatalogModule dependencies initialized +1ms
api-1  | [Nest] 1  - ... [RoutesResolver] CatalogController {/api/products}: +5ms
api-1  | [Nest] 1  - ... [RouterExplorer] Mapped {/api/products, GET} route +2ms
api-1  | [Nest] 1  - ... [RouterExplorer] Mapped {/api/products/:id, GET} route +1ms
api-1  | [Nest] 1  - ... [RoutesResolver] HealthController {/api/health}: +0ms
api-1  | [Nest] 1  - ... [RouterExplorer] Mapped {/api/health, GET} route +1ms
api-1  | [Nest] 1  - ... [NestApplication] Nest application successfully started +1ms
```

Không dòng nào `Cannot find module`, không stack trace — khởi động sạch.

### 2.3 Migrate + seed qua stack thật

`npm run db:migrate` trên host (port 5432 publish ra host — Jest/host nối thẳng được, xem
`ops/.env.example`):

```
$ DATABASE_URL=postgres://app:app@localhost:5432/shop npm run db:migrate
...
[✓] migrations applied successfully!
```

`npm run db:seed` cần named volume `product-images` (không phải bind mount) nên chạy qua
container tạm nối network + mount volume — đúng kỹ thuật T011c đã dùng (không phải chạy tay
`node dist/main.js`, không phải cách né lỗ hổng của các task trước — ở đây `api` production
image đã sống thật, container tạm này chỉ để chạy script seed cần mount volume mà host không
có):

```
$ docker run --rm --network shop-online_default \
    -v <repo>:/repo -w /repo \
    -v shop-online_product-images:/data/product-images \
    -e DATABASE_URL=postgres://app:app@postgres:5432/shop \
    -e NODE_ENV=development -e PRODUCT_IMAGE_PATH=/data/product-images \
    node:24.21.0-bookworm-slim npx tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
```
Idempotent — dữ liệu mẫu đã có từ T011c, seed lần này không tạo trùng.

### 2.4 `curl` qua stack thật (proxy thật + api thật, không container thủ công)

```
$ curl -sI http://localhost/images/ca-phe-sua-da.jpg
HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 746
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Content-Type: image/jpeg
Etag: "dlk0r5dtxzejkq"
Last-Modified: Sun, 20 Sep 2026 09:00:03 GMT
Referrer-Policy: same-origin
Server: Caddy
Vary: Accept-Encoding
X-Content-Type-Options: nosniff
Date: Sun, 20 Sep 2026 09:00:07 GMT
```
200, `Content-Type: image/jpeg`, đủ ba header AD-29 (`Content-Security-Policy`,
`Referrer-Policy`, `X-Content-Type-Options`).

```
$ curl -s http://localhost/api/products
{"items":[{"id":1,"name":"Cà phê sữa đá","price":25000,"imagePath":"/images/ca-phe-sua-da.jpg","stockStatus":"in_stock"}]}
```
Đây là bằng chứng TRỰC TIẾP `api` sống thật (không phải `proxy` phục vụ tĩnh như route ảnh) —
route `/api/products` do chính `CatalogController` trong container `api` xử lý, đúng Sản phẩm
mẫu đã seed. (Không có `jq` cài trên máy này — JSON thô ở trên đã hợp lệ và đúng dữ liệu.)

### 2.5 T010 test + `npm test`/`lint`/`build` từ gốc repo

Bốn biến môi trường bắt buộc (`DATABASE_URL`, `API_PORT`, `NODE_ENV`, `PRODUCT_IMAGE_PATH` —
xem `packages/shared/src/config/env.ts`) phải được set trước khi chạy `npm test` trên host, vì
mỗi lệnh Bash trong phiên này chạy shell mới (không kế thừa `export` giữa các lệnh) — set thiếu
biến khiến `NestFactory.create` lỗi validate và Nest tự `process.exit(1)`. Sau khi set đủ bốn
biến:

```
$ DATABASE_URL=postgres://app:app@localhost:5432/shop API_PORT=3000 NODE_ENV=development \
    PRODUCT_IMAGE_PATH=/data/product-images npm test
PASS  glue · unit tests        (22/22)
PASS  apps/api · test          (14/14 — Test Suites: 7 passed, 7 total)
PASS  apps/storefront · test   (16/16)
PASS  packages/shared · test   (24/24)
PASS  packages/ui · test       (5/5)
```
14/14 trong `apps/api` bao gồm 4 test T010 (catalog) — xanh.

```
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
Cả ba lệnh exit 0.

## 3. Files đã thay đổi

```
M  ops/api.Dockerfile                                 (+2 dòng, đúng stage run)
A  .sdd/000-walking-skeleton/task-011d-report.md       (file này — không commit, .sdd/ không add)
```

Commit: `ba5bbd1` — `fix(000): T011d — copy packages/shared vào stage run của api.Dockerfile
(Ruling R25)`.

## 4. Tự review (self-review)

- **Đúng hai dòng mới, đúng vị trí**: `git diff --stat -- ops/api.Dockerfile` → `2 ++`; hai
  dòng `COPY --from=build` nằm ngay trước `EXPOSE 3000`, sau `COPY --from=build
  /repo/apps/api/package.json ...` — không đổi thứ tự các dòng `COPY` hiện có.
- **Không đổi stage `deps`/`build`**: `git diff` chỉ hiển thị `+2` dòng trong stage `run`,
  không có dòng `-` nào — hai stage kia byte-for-byte như T011c để lại.
- **Không hồi quy build**: `docker compose build api` vẫn `Built` thành công, cache layer
  `deps`/`build` được tái sử dụng đúng như trước (log build ở mục 2.1).
- **Không chạm Forbidden list**: `git status --short ops/compose.yaml ops/Caddyfile
  ops/.env.example ops/api.Dockerfile.dockerignore db apps packages e2e docs/baseline specs
  scripts tests package.json` → rỗng cho tất cả.
- **Không `git add -A`/`git add .`** — `git add ops/api.Dockerfile` theo đường dẫn cụ thể.
- **Không commit `.sdd/`** — chỉ một file mã nguồn trong commit.
- **Dọn container test**: container seed dùng `docker run --rm` — tự xoá ngay khi xong, không
  còn sót lại (`docker ps -a` xác nhận không có container tạm nào của phiên này). `postgres`,
  `api`, `proxy` vẫn chạy — đây là trạng thái CUỐI CÙNG đúng mục tiêu của task (stack thật chạy
  được), không phải container test riêng cần dọn; `postgres` là dịch vụ dùng chung (đã chạy 19
  giờ, phục vụ các task khác) nên không đụng tới theo đúng chỉ dẫn.

## 5. Concerns

Không có concern chặn. Một ghi chú không chặn: các lệnh `npm test`/`db:migrate` trên host cần
bốn biến môi trường export tường minh mỗi lần gọi (phiên Bash không giữ `export` giữa các lệnh
trong môi trường agent này) — đây là đặc điểm của cách gọi lệnh, không phải lỗi trong repo;
CI/dev thật sẽ có `.env`/`direnv` load các biến này một lần cho cả phiên.

## 6. Kết luận

Chuỗi ba fix T011b → T011c → T011d đã đóng: ảnh `api` build được (T011c), chạy được thật không
crash loop (T011d), route ảnh hoạt động đúng (T011b) — toàn bộ acceptance criteria của T011d đạt
bằng bằng chứng chạy thật qua chính ảnh Docker production, không qua container thủ công hay chạy
tay né lỗi.
