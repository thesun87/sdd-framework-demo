# Task T015 — Báo cáo: chạy trọn quickstart trên một clone sạch (cổng nghiệm thu cuối cùng)

## Trạng thái: DONE

Đã chứng minh được: một bên thứ ba clone repo này hôm nay, chỉ làm theo đúng những gì
`specs/000-walking-skeleton/quickstart.md` ghi (bản đã sửa ở task này), sẽ dựng lại được toàn
bộ hệ thống và đạt lại SC-001…SC-007. Bản quickstart CŨ (trước T015) **không** chạy được trên
clone sạch ở bốn chỗ khác nhau — cả bốn đã được tái hiện thật (lỗi thật, output thật, dán ở mục
2) rồi sửa trong `specs/000-walking-skeleton/quickstart.md`. Toàn bộ bằng chứng dưới đây đến từ
**hai lần clone sạch độc lập**, không dùng lại `node_modules`/container/volume của cây làm việc
chính:

- **Clone #1** (`/tmp/t015-clean-clone.vhr7IE`, đã xoá) — dùng để PHÁT HIỆN bốn lỗ hổng của
  bản quickstart cũ, từng cái một, bằng cách chạy đúng nguyên văn bản cũ trước rồi tìm cách sửa.
- **Clone #2** (`/tmp/t015-clean-clone2.bypfc9`, đã xoá) — clone HOÀN TOÀN MỚI, chạy lại **từ
  đầu, theo đúng bản `quickstart.md` đã sửa**, không một bước dò lỗi thủ công nào — xác nhận
  bản sửa tự nó đứng vững, không phải chắp vá riêng lẻ. **Toàn bộ output dán ở mục 3–6 bên dưới
  đến từ Clone #2**, trừ khi ghi chú khác.

## 0. Gỡ stack cũ của cây làm việc chính — bắt buộc trước khi bắt đầu (theo brief)

Trước khi làm bất cứ gì, đã `cd` vào cây làm việc chính và chạy:

```
$ docker compose -f ops/compose.yaml down -v
 Container shop-online-proxy-1  Removed
 Container shop-online-api-1  Removed
 Container shop-online-postgres-1  Removed
 Network shop-online_default  Removed
 Volume shop-online_product-images  Removed
 Volume shop-online_postgres-data  Removed
```

Xác nhận sạch hoàn toàn trước khi clone: `docker ps -a --filter name=shop-online` và
`docker volume ls --filter name=shop-online` đều rỗng. Từ đây, mọi `docker compose` chạy dưới
tên project `shop-online` (chốt trong `ops/compose.yaml`) đều là container/volume/network **MỚI
HOÀN TOÀN**, không nối vào/tái dùng bất cứ gì của cây làm việc chính.

## 1. Bốn lỗ hổng của `quickstart.md` (bản cũ) — phát hiện thật trên Clone #1, đã sửa

### 1.1 Thiếu `npm install` (brief đã cảnh báo trước)

```
$ npm run db:migrate     # (chưa npm install)
sh: 1: drizzle-kit: Permission denied
```
→ Thêm `npm install` làm bước đầu tiên của "Dựng và chạy".

### 1.2 `npm run db:seed` trần trên host thất bại thật (đúng như brief mô tả, Ruling R23)

```
$ npm run db:seed
db/seed.ts: lỗi khi nạp dữ liệu mẫu: Error: EACCES: permission denied, mkdir '/data'
```
→ Thay bằng lệnh container-based (mẫu T011c §2.3), đã xác thực chạy sạch (mục 3.2).

### 1.3 Không biến môi trường nào tự nạp cho lệnh chạy TRÊN HOST (LỖ HỔNG MỚI, T015 tự phát hiện)

Không có `dotenv`, không cấu hình ẩn nào trong `scripts/verify.mjs`/`db/drizzle.config.ts`.
`npm run db:migrate` không có `DATABASE_URL`:
```
Reading config file '.../db/drizzle.config.ts'
DATABASE_URL chưa được set — xem ops/.env.example.
```
`npm test` (apps/api) thiếu `API_PORT`/`NODE_ENV`/`PRODUCT_IMAGE_PATH` khiến bootstrap NestJS
lỗi **im lặng** (Nest tự `process.exit(1)` trong exceptions zone, log bị `logger:false` nuốt):
```
●  process.exit called with "1"
      53 | export async function createTestApp(): Promise<INestApplication> {
    > 55 |   const app = await NestFactory.create(AppModule, { logger: false });
```
→ Thêm mục "Biến môi trường cho lệnh chạy TRÊN HOST" — export cả bốn biến từ
`ops/.env.example` trước khi chạy bất kỳ lệnh host nào (migrate, test, lint, build, race spec).

### 1.4 Thứ tự build cross-workspace (LỖ HỔNG MỚI, T015 tự phát hiện) + xung đột quyền thư mục `apps/storefront/dist`

`scripts/verify.mjs` duyệt `apps/` **trước** `packages/` (`WORKSPACE_GLOBS = ["apps",
"packages"]`), không tự sắp lại theo phụ thuộc. Trên clone sạch (chưa `dist/` nào tồn tại),
lần gọi `npm test`/`npm run lint`/`npm run build` ĐẦU TIÊN báo:
```
Cannot find module 'shared' from 'modules/catalog/catalog-product-detail.int-spec.ts'
Error TS2307: Cannot find module 'shared' or its corresponding type declarations.
```
cho cả `apps/api` và `apps/storefront` — dù NGAY TRONG CÙNG lần gọi đó, `packages/shared` và
`packages/ui` build/test PASS (nên lỗi này ẩn hoàn toàn suốt lịch sử repo: `node_modules` của
cây làm việc chính chưa từng bị xoá nên `dist/` luôn có sẵn từ build trước đó).

Thêm vào đó: nếu `docker compose -f ops/compose.yaml up -d` (cả stack, có `proxy` bind-mount
`apps/storefront/dist`) chạy TRƯỚC `npm run build`, Docker tự tạo thư mục đó **thuộc sở hữu
root** trước khi mount — `npm run build` (chạy bằng user thường) sau đó KHÔNG ghi được:
```
$ ls -la apps/storefront/dist
drwxr-xr-x 2 root root 4096 ... dist
$ npm run build
[UNHANDLEABLE_ERROR] Could not create directory for output chunks: .../dist/assets
Caused by: Permission denied (os error 13)
```
→ Sửa hai chỗ: (a) thêm bước `npm run build --workspace=packages/shared` +
`--workspace=packages/ui` TRƯỚC bốn lệnh hợp đồng; (b) dời `docker compose ... up -d` (cả
stack) xuống SAU `npm run build` trong mục "Kiểm chứng" (không còn ở "Dựng và chạy"), và thêm
cờ `--build` để không bao giờ âm thầm dùng lại image cache cũ trùng tên `shop-online-api`.

Xác nhận cả bốn chỗ trên đã sửa đúng và tự đứng vững — chạy lại TOÀN BỘ trình tự đã sửa trên
**Clone #2 (hoàn toàn mới)**, không một bước vá tay nào, xem mục 3–4.

## 2. Điều kiện tiên quyết đã lỗi thời — đã sửa

Bảng "Điều kiện tiên quyết" của bản cũ ghi Docker ❌ "chưa dùng được trong distro WSL này".
Sai — xác nhận lại thật trên cả hai clone: `docker --version` → `29.1.2`, `docker compose
version` → `v2.40.3`, và cả `docker compose build`/`up -d`/`down -v` đều chạy thật (xem mục 3,
4). Đã sửa dòng đó thành ✅.

Đồng thời phát hiện: `npx playwright install` (đã có trong bảng) chỉ tải browser, KHÔNG đủ để
chạy Chromium headless trên máy Linux tối giản — còn thiếu thư viện hệ thống (`libnspr4.so`,
`libnss3.so`…). Xác nhận thật trong phiên này (không có `sudo` không mật khẩu):
```
chrome-headless-shell: error while loading shared libraries: libnspr4.so: cannot open shared object file
```
Xử lý không cần root — `apt-get download libnss3 libnspr4` (chỉ tải `.deb`) + `dpkg -x <file>.deb
<thư mục tạm>` (giải nén cục bộ) + export `LD_LIBRARY_PATH` trỏ vào đó. Trên máy có quyền root
thật: `sudo npx playwright install-deps chromium`. Đã thêm cả hai đường vào bảng điều kiện tiên
quyết.

## 3. Bốn lệnh hợp đồng trên Clone #2 (clone hoàn toàn mới, làm đúng quickstart đã sửa) — CẢ BỐN EXIT 0, KHÔNG CÓ `SKIPPED`

Thứ tự thật đã chạy (đúng quickstart mới): `npm install` → `docker compose up -d postgres` →
`npm run db:migrate` → `npm run build --workspace=packages/shared` + `--workspace=packages/ui`
→ seed container-based → bốn lệnh dưới đây → `docker compose up -d --build` (cả stack) →
`npm run test:regression`.

### 3.1 `npm test` — exit 0

```
▸ glue · unit tests        → 22/22 pass
▸ apps/api · test          → Test Suites: 7 passed, 7 total / Tests: 14 passed, 14 total
▸ apps/storefront · test   → Test Files 6 passed (6) / Tests 16 passed (16)
▸ packages/shared · test   → Test Files 3 passed (3) / Tests 24 passed (24)
▸ packages/ui · test       → Test Files 2 passed (2) / Tests 5 passed (5)
────────────────────────────────────────────────────────────
PASS  glue · unit tests
PASS  apps/api · test
PASS  apps/storefront · test
PASS  packages/shared · test
PASS  packages/ui · test
────────────────────────────────────────────────────────────
```

### 3.2 `npm run lint` — exit 0

```
▸ glue · lint    → ok javascript syntax (6 files) / ok python compile (4 files) / ok yaml parse (5 files)
────────────────────────────────────────────────────────────
PASS  glue · lint
PASS  apps/api · lint
PASS  apps/storefront · lint
PASS  packages/shared · lint
PASS  packages/ui · lint
PASS  e2e · lint
────────────────────────────────────────────────────────────
```

### 3.3 `npm run build` — exit 0 (tạo `apps/storefront/dist` — sở hữu đúng user host, xác nhận `ls -la` → `tuannguyen tuannguyen`, KHÔNG phải `root`)

```
▸ apps/storefront · build
  vite v8.3.0 building client environment for production...
  ✓ 132 modules transformed.
  dist/index.html                  0.32 kB │ gzip:   0.24 kB
  dist/assets/index-BCTuGbAd.js  525.81 kB │ gzip: 158.43 kB
  ✓ built in 319ms
────────────────────────────────────────────────────────────
PASS  apps/api · build
PASS  apps/storefront · build
PASS  packages/shared · build
PASS  packages/ui · build
────────────────────────────────────────────────────────────
```

### 3.4 `docker compose -f ops/compose.yaml up -d --build` (bước mới, đặt ở đây theo quickstart đã sửa) — build lại THẬT (không dùng cache image cũ), `api` không crash-loop

```
 shop-online-api  Built
 Container shop-online-postgres-1  Running
 Container shop-online-api-1  Started
 Container shop-online-proxy-1  Started

$ docker compose -f ops/compose.yaml ps   (8 giây sau)
NAME                     STATUS
shop-online-api-1        Up 19 seconds     ← không "Restarting"
shop-online-postgres-1   Up 2 minutes (healthy)
shop-online-proxy-1      Up 19 seconds

$ curl -sI http://localhost/
HTTP/1.1 200 OK
Content-Length: 322        ← storefront/dist thật đã phục vụ, không phải thư mục rỗng
```

### 3.5 `npm run test:regression` — exit 0, **10/10 Playwright e2e** (product half CHẠY, không SKIPPED)

```
[glue + apps/api + apps/storefront + packages/shared + packages/ui]  → tất cả PASS (npm test lặp lại nội bộ)
▸ e2e · test:e2e
Running 10 tests using 6 workers
[SC-003][trang chủ] n=30 p95=400.0ms min=24.0ms max=974.0ms
  ✓ 1 GET /api/internal/metrics trả p95 hợp lệ, không lộ tồn kho/khách hàng
  ✓ 2,3 /admin (có & không "/") → 404 kèm đủ header
  ✓ 4 / → 200 kèm đủ header, CSP đúng từng directive
  ✓ 5 GET /api/products p95 ≤ 400ms (n=50) — đo được 33.0ms
  ✓ 6 trang chủ p95 ≤ 1500ms (n=30) — đo được 400.0ms
  ✓ 7,8 US1: bấm thẻ sản phẩm → chi tiết đúng tên/mô tả/giá/ảnh/nhãn; announcer đổi nội dung thật
  ✓ 9,10 WCAG 2.1 AA (trang chủ + trang chi tiết) — không vi phạm

  10 passed (5.6s)
────────────────────────────────────────────────────────────
PASS  e2e · test:e2e
────────────────────────────────────────────────────────────
```

**Xác nhận không còn `SKIPPED — no product workspace exists yet`**: `grep -rn SKIPPED` trên cả
năm log (test/lint/build/regression + phiên Clone #1) → không khớp gì. **SC-006 đạt.**

## 4. Reseed (container-based) sau bốn lệnh hợp đồng — đúng thứ tự brief yêu cầu

`npm test`/`test:regression` TRUNCATE (AD-28) và để lại fixture Jest riêng
(`Sản phẩm test 178989...`, giá 0). Đã reseed lại bằng đúng lệnh container:

```
$ docker run --rm --network shop-online_default -v <clone>:/repo -w /repo \
    -v shop-online_product-images:/data/product-images \
    -e DATABASE_URL=postgres://app:app@postgres:5432/shop \
    -e NODE_ENV=development -e PRODUCT_IMAGE_PATH=/data/product-images \
    node:24.21.0-bookworm-slim npx tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).

$ psql ... SELECT id,name,price FROM product;
 id |                  name                    | price
----+-------------------------------------------+-------
  1 | Sản phẩm test 1789899194135-jqdz0wskzcj   |     0   ← fixture Jest để lại, KHÔNG bị xoá (db/seed.ts chèn kiểu chỉ-nếu-chưa-có, hành vi đã biết từ T013)
  2 | Cà phê sữa đá                             | 25000   ← Sản phẩm mẫu thật, đã phục hồi
```

Ghi nhận minh bạch (không phải lỗi T015 gây ra, không chặn kịch bản tay bên dưới vì chúng xác
định Sản phẩm mẫu qua tên/id riêng, không qua "duy nhất trong hệ thống"): sau khi reseed, có
**hai** sản phẩm thay vì một — đúng hành vi đã ghi nhận từ task-013-report.md §3.4, do
`db/seed.ts` (thuộc `db/**`, ngoài phạm vi sửa của T015) không xoá trước khi chèn.

## 5. Tám kịch bản nghiệm thu chạy tay — CẢ TÁM ĐẠT (bằng chứng thật, Clone #2)

| # | Kịch bản | Bằng chứng thật |
|---|---|---|
| 1 | Mở `/` | `curl -sI /` → `HTTP/1.1 200 OK`. Render bằng Chromium thật: "Cà phê sữa đá / 28.000₫ / Hết hàng" hiển thị (giá đã đổi ở kịch bản 4, tồn kho đã đổi ở kịch bản 5 — chụp SAU khi làm cả hai để không tốn thêm một vòng render) |
| 2 | Bấm vào thẻ sản phẩm | Playwright click thật → URL đổi thành `/products/2`; nội dung trang: `Cà phê sữa đá / 28.000₫ / Hết hàng / Cà phê phin truyền thống pha cùng sữa đặc, phục vụ lạnh với đá viên.`; ảnh tải được (`naturalWidth: 64`, khớp JPEG 64×64 thật); **0** nút chứa chữ "thêm"/"giỏ" tìm thấy |
| 3 | `/api/products/999999` | `curl` → HTTP `404`, body `{"error":{"code":"PRODUCT_NOT_FOUND","message":"Sản phẩm không tồn tại."}}` — JSON sạch, không stack trace |
| 4 | Đổi giá DB, tải lại `/` | `UPDATE product SET price = 28000 WHERE id = 2;` → `GET /api/products/2` trả `"price": 28000` ngay (không cache) |
| 5 | `quantity = 0`, tải lại | `UPDATE stock SET quantity = 0 WHERE product_id = 2;` → API trả `"stockStatus": "out_of_stock"`; trang render ra nhãn chữ **"Hết hàng"**, sản phẩm **vẫn hiển thị** trên trang chủ (không bị ẩn) |
| 6 | Đọc toàn bộ thân `/api/products` | `{"items":[{"id":1,...,"stockStatus":"in_stock"},{"id":2,"name":"Cà phê sữa đá","price":28000,"imagePath":"/images/ca-phe-sua-da.jpg","stockStatus":"out_of_stock"}]}` — không một con số tồn kho nào |
| 7 | `curl -I /` và `curl -I /admin/` | Cả hai có `Content-Security-Policy`, `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`. `/admin/` trả `404` (đúng — chưa có bundle admin ở feature 000) nhưng vẫn đủ ba header |
| 8 | Header `/api/products` | `Cache-Control: no-store` |

## 6. Test tải đồng thời chạy riêng — ĐẠT

Lệnh brief chỉ định, chạy nguyên văn:
```
$ npm test -- stock-conditional-delta.race-spec.ts
```
exit 0. **Lưu ý phát hiện ở T015** (đã ghi vào `quickstart.md`): `scripts/verify.mjs` (glue,
ngoài phạm vi sửa của tôi) chỉ đọc `process.argv[2]` làm tên phase — KHÔNG chuyển tiếp đối số
sau `--` xuống `npm run test` của từng workspace, nên lệnh trên thật ra chạy lại TOÀN BỘ
`npm test` (glue + 4 workspace), không lọc riêng một file. Test race-spec vẫn nằm trong đó và
vẫn phải xanh — đã xanh (mục 3.1 ở trên là chính lần chạy này). Để xem RIÊNG một mình nó (bỏ
qua wrapper), đã chạy thêm:

```
$ cd apps/api && npx jest stock-conditional-delta.race-spec.ts --verbose
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        1.116 s
```

Đọc thẳng file test xác nhận cấu hình đúng brief: `INITIAL_QUANTITY = 8` (M ≥ 5), 
`CONCURRENT_WITHDRAWALS = 25` (N ≥ 20, N > M), `REPEAT_RUNS = 10` (lặp ≥ 10 lần LIÊN TIẾP
NGAY TRONG một `it()`, TRUNCATE giữa các lần, không dựng lại database) — mỗi vòng lặp khẳng
định: đúng 8 `applied:true`, đúng 17 `applied:false` (giá trị hợp lệ, không exception), đúng 8
dòng `stock_ledger`, `stock.quantity` cuối = 0. Test xanh ⇒ cả 10 vòng đều đúng bất biến.

## 7. Dọn dẹp

- **Clone #1** (`/tmp/t015-clean-clone.vhr7IE`): `docker compose -f ops/compose.yaml down -v`
  (gỡ container+network+volume) rồi `rm -rf` thư mục clone. Đã xác nhận rỗng trước khi tạo
  Clone #2 (cùng tên project `shop-online`, không thể chạy song song).
- **Clone #2** (`/tmp/t015-clean-clone2.bypfc9`): sau khi lấy đủ bằng chứng ở mục 3–6, đã
  `docker compose -f ops/compose.yaml down -v` rồi `rm -rf` thư mục clone.
- **Quyết định cuối**: **KHÔNG để lại stack nào chạy.** Lý do: cả hai clone đều là thư mục tạm
  đã xoá — để container sống mà bind-mount trỏ vào một thư mục không còn tồn tại là trạng thái
  bàn giao mập mờ, không phải "feature đang chạy" theo nghĩa có ích. Xác nhận sạch:
  ```
  $ docker ps -a --filter name=shop-online       → rỗng
  $ docker volume ls --filter name=shop-online   → rỗng
  $ docker network ls --filter name=shop-online  → rỗng
  $ ls /tmp | grep t015                          → không còn thư mục clone nào
  ```
- **Không đụng** service `postgres` nào khác ngoài của hai clone tạm — cây làm việc chính đã bị
  gỡ ở BƯỚC 0 theo đúng yêu cầu brief (mục "Va chạm tên project"), không phải một hành động tôi
  tự quyết ở bước dọn dẹp này. Ảnh Docker `shop-online-api` (cache build) vẫn còn trong
  `docker images` — không phải "state" cần dọn theo yêu cầu brief, chỉ là artifact cache.

## 8. `docs/baseline/verification.md`

Không có bất biến nào mà bốn lệnh hiện tại không chạm tới bị phát hiện ở task này. **Không sửa
file này** — đúng theo giới hạn CLAUDE.md/tasks.md.

## 9. Files đã thay đổi

```
M  specs/000-walking-skeleton/quickstart.md   — sửa 4 lỗ hổng (mục 1) + điều kiện tiên quyết
                                                 lỗi thời (mục 2) + ghi rõ thứ tự bắt buộc
                                                 seed→test→reseed→tay (đã có sẵn trong brief,
                                                 nay được mã hoá vào chính tài liệu)
   README.md                                  — đã soát: không có tuyên bố sai nào về cách
                                                 chạy feature 000 (README chỉ mô tả layer SDD
                                                 framework, không mô tả quickstart sản phẩm) —
                                                 KHÔNG sửa, không cần sửa
A  .sdd/000-walking-skeleton/task-015-report.md — file này (không commit theo rule #4)
```

Không chạm `apps/**`, `packages/**`, `db/**`, `ops/**`, `e2e/**`, `scripts/**`, `tests/**`,
`package.json` gốc, `docs/baseline/**`, `specs/000-walking-skeleton/spec.md`/`plan.md`/
`tasks.md` — xác nhận bằng `git status --short` trên cây làm việc chính (chỉ
`specs/000-walking-skeleton/quickstart.md` đổi).

## 10. Kết luận — SC-001 → SC-007

| SC | Kết quả | Bằng chứng |
|---|---|---|
| SC-001 | ĐẠT | Kịch bản tay #1, #4 (mục 5) |
| SC-002 | ĐẠT | Race spec (mục 6) — M/N/10-lần đúng brief, xanh |
| SC-003 | ĐẠT | Playwright performance (mục 3.5) — p95 trang chủ 400ms ≤ 1500ms, p95 API 33ms ≤ 400ms |
| SC-004 | ĐẠT | Kịch bản tay #7 + Playwright security-headers (mục 3.5) |
| SC-005 | ĐẠT | Kịch bản tay #6 |
| SC-006 | ĐẠT | Bốn lệnh hợp đồng, cả bốn exit 0, không `SKIPPED` (mục 3) |
| SC-007 | ĐẠT | Toàn bộ mục 3–6 chạy trên **hai** clone sạch độc lập, theo đúng `quickstart.md` đã sửa, không thao tác tay ngoài tài liệu (Clone #2 không có bước vá nào) |

Không có SC nào thất bại. Không có vi phạm nào bị che bằng cách nới lỏng tài liệu — cả bốn lỗ
hổng ở mục 1 đều được sửa để tài liệu khớp với NHỮNG GÌ THẬT SỰ PHẢI LÀM, không phải bằng cách
hạ yêu cầu.
