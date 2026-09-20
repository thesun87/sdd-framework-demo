# Báo cáo T014 — Đo và ghi lại ba ngưỡng p95

## 1. Đã làm gì

### Mở rộng middleware log của T011 (Ruling R8 — không viết lại)

`apps/api/src/modules/catalog/request-logging.middleware.ts`:
- Thêm mốc thời gian `process.hrtime.bigint()` ở ĐẦU hàm (đơn điệu, không bị lệch bởi đồng
  hồ hệ thống bị chỉnh giữa lúc request đang xử lý — khác `Date.now()`).
- Ở CÙNG điểm ghi log hiện có (sự kiện `finish`), cộng thêm đúng một trường mới:
  `duration_ms` — đặt tên kiểu `snake_case` giống `request_id` (điểm nhất quán duy nhất kiểu
  này trong dòng log, các trường còn lại là một từ).
- `level`, `request_id`, `method`, `path`, `status`, `timestamp` — giữ nguyên tên, thứ tự,
  định dạng JSON một dòng ra stdout, không đổi gì.
- Gọi thêm `recordRequestDuration(...)` (module mới, mục dưới) tại cùng callback — KHÔNG
  một `res.on('finish', ...)` thứ hai, không một điểm ghi log thứ hai.

### Module tổng hợp mới (không đụng nghiệp vụ `catalog`/`stock`)

- `apps/api/src/modules/catalog/metrics.store.ts` (MỚI) — một mảng vòng trong bộ nhớ tiến
  trình (`MAX_RECORDS = 5000`), không thư viện metrics/APM nào (AD-16). Hàm
  `recordRequestDuration()` được middleware gọi; hàm `getTodayMetrics()` lọc theo ngày UTC
  hiện tại rồi tính p95 kiểu "nearest-rank" (`ceil(0.95 * n) - 1`, sắp tăng dần).
- `apps/api/src/modules/catalog/metrics.controller.ts` (MỚI) — `@Controller('api/internal/metrics')`,
  một `GET` duy nhất, trả `{ date, sampleSize, p95DurationMs, minDurationMs, maxDurationMs }`.
  Không trường nào khác — không `quantity`, không thông tin khách hàng.
- `apps/api/src/modules/catalog/catalog.module.ts` (SỬA) — thêm `MetricsController` vào mảng
  `controllers`. Không đổi `providers`, không đổi `APP_FILTER`, không đổi
  `configure()`/`forRoutes('*')` của middleware.
- Middleware loại các lệnh gọi tới `/api/internal/*` khỏi mẫu đo (comment giải thích tại
  chỗ) — endpoint trả lời cho đường đọc THẬT của storefront/API, tự đưa mình vào mẫu sẽ làm
  p95 lệch theo tần suất polling của chính nó.

### `e2e/performance.e2e-spec.ts` (file MỚI DUY NHẤT trong `e2e/` — Ruling R8b)

Ba test, cùng `test.describe`:
1. **Trang chủ ≤ 1500ms p95** — 30 lần `page.goto("/", { waitUntil: "load" })` bằng trình
   duyệt Chromium thật qua proxy, đo `Date.now()` quanh mỗi lần, in mảng mẫu + p95/min/max ra
   console, khẳng định `p95 ≤ 1500`.
2. **API đọc ≤ 400ms p95** — 50 lần `request.get("/api/products")` (route home page thật sự
   gọi để render danh sách), cùng cách đo, cùng công thức p95, khẳng định `p95 ≤ 400`.
3. **`GET /api/internal/metrics` hợp lệ, không lộ dữ liệu nhạy cảm** — tạo thêm 5 request rồi
   đọc endpoint, khẳng định hình dạng response và `expect(rawBody).not.toMatch(/quantity|stock|email|phone|customer|address/i)`
   trên chính JSON thật trả về (không chỉ trên mã nguồn).

Công thức p95 trong test **giống hệt** công thức phía server (`metrics.store.ts`) — tránh hai
định nghĩa percentile khác nhau gây lệch số vô nghĩa giữa hai phép đo.

## 2. Vì sao cỡ mẫu này là đủ ("một request không phải p95")

- **Trang chủ: n=30.** Percentile p95 chỉ có nghĩa khi 5% "tệ nhất" tách được khỏi phần còn
  lại. Với n=30, bước nhảy giữa hai mẫu liền kề khi sắp xếp là 1/30 ≈ 3,3% — mịn hơn ngưỡng
  5% của chính định nghĩa p95 (nói cách khác: p95 của 30 mẫu là giá trị lớn thứ 2 sau khi bỏ
  giá trị lớn nhất). Một navigation trình duyệt đầy đủ tốn vài chục–vài trăm ms cho ứng dụng
  này, nên 30 lần vẫn chạy xong dưới 3 giây (bằng chứng ở mục 3).
- **API: n=50.** Một lệnh gọi HTTP trần rẻ hơn nhiều một navigation trình duyệt, nên lấy mẫu
  lớn hơn cho bước nhảy mịn hơn nữa (1/50 = 2%). 50 mẫu bắt được cả outlier "cold path" (mẫu
  đầu tiên sau một khoảng nghỉ — xem số liệu thật mục 3, có lần lên tới 371–422ms) MÀ VẪN để
  p95 phản ánh đúng hành vi ổn định, không bị một outlier duy nhất chi phối kết luận pass/fail
  (khác với việc đo một request rồi gọi nó là "p95").
- Không dùng thư viện thống kê ngoài — công thức percentile viết tay theo đúng định nghĩa
  "nearest-rank", cùng công thức ở phía server để hai phép đo nhất quán.

## 3. Lệnh đã chạy và kết quả THẬT (không chỉ pass/fail)

### Build lại image `api` để hạ tầng sống (postgres+api+proxy) chạy đúng mã T014

```
$ docker compose -f ops/compose.yaml build api   → shop-online-api  Built
$ docker compose -f ops/compose.yaml up -d api    → Recreated, Started, healthy
```

### Dòng log thật chứa `request_id` VÀ `duration_ms` (container `api`, sau khi hệ thống chạy thật)

```
{"level":"info","request_id":"762c3268-d87b-4a46-8eda-08cb22d5e94a","method":"GET","path":"/api/products/2","status":200,"duration_ms":2.891656,"timestamp":"2026-09-20T09:40:28.060Z"}
```

### `GET /api/internal/metrics` — output thật

```
$ curl -sS http://localhost/api/internal/metrics
{"date":"2026-09-20","sampleSize":300,"p95DurationMs":7.183164,"minDurationMs":0.857951,"maxDurationMs":42.294637}
```

### `npx playwright test performance.e2e-spec.ts --reporter=list` — chạy riêng, SỐ ĐO THẬT

```
[SC-003][trang chủ] n=30 p95=98.0ms min=15.0ms max=121.0ms
  mẫu=[121,98,24,28,23,29,23,23,21,22,24,23,24,24,21,29,19,19,23,15,39,20,21,25,20,17,17,22,16,18]
✓ trang chủ hiển thị xong ở p95 ≤ 1500ms (n=30 lần điều hướng thật)

[SC-003][GET /api/products] n=50 p95=19.0ms min=5.0ms max=422.0ms
  mẫu=[422,10,6,6,8,7,7,10,9,28,9,9,6,7,6,7,8,6,10,7,12,8,15,7,8,7,6,8,8,7,8,7,7,8,6,14,7,5,19,9,7,5,6,6,7,5,9,8,8,6]
✓ đường đọc API GET /api/products ở p95 ≤ 400ms (n=50 lần gọi thật)

[SC-003][GET /api/internal/metrics] {"date":"2026-09-20","sampleSize":66,"p95DurationMs":20.525213,"minDurationMs":0.857951,"maxDurationMs":42.294637}
✓ GET /api/internal/metrics trả p95 hợp lệ và KHÔNG lộ dữ liệu tồn kho/khách hàng (Ruling R9)

3 passed (2.7s)
```

**Cả hai ngưỡng PRD đạt bằng số đo thật**: trang chủ p95 = 98ms (ngưỡng 1500ms), API p95 =
19ms (ngưỡng 400ms) — không phải ngưỡng nới, không phải một request gọi là p95.

### `npm run test:regression` — chạy TOÀN BỘ, `performance.e2e-spec.ts` cùng hai file T013

```
▸ glue · unit tests           → PASS (22/22)
▸ apps/api · test              → PASS (7 suites, 14 tests)
▸ apps/storefront · test       → PASS (6 files, 16 tests)
▸ packages/shared · test       → PASS (3 files, 24 tests)
▸ packages/ui · test           → PASS (2 files, 5 tests)
▸ e2e · test:e2e                → PASS — 10/10 (3 mới của T014 + 7 của T013), chromium

[SC-003][GET /api/internal/metrics] sampleSize=176 p95DurationMs=16.966819 ...
[SC-003][GET /api/products] n=50 p95=55.0ms min=8.0ms max=371.0ms mẫu=[371,12,9,10,...]
[SC-003][trang chủ] n=30 p95=152.0ms min=24.0ms max=296.0ms mẫu=[296,70,64,93,...]
10 passed (3.4s)
────────────────────────────────────────────────────────────
PASS  glue · unit tests / apps/api · test / apps/storefront · test /
      packages/shared · test / packages/ui · test / e2e · test:e2e
```
(Số đo trong `test:regression` cao hơn lần chạy riêng lẻ — 152ms/55ms so với 98ms/19ms — vì
chạy sau toàn bộ Jest+Vitest của các workspace khác, máy đang bận hơn; cả hai lần đều xa
ngưỡng PRD, không cần nới gì.)

### `npm test`, `npm run lint`, `npm run build` từ gốc repo — exit 0 (chạy riêng trước khi gộp vào `test:regression` ở trên)

```
$ npm run lint    → PASS glue/apps/api/apps/storefront/packages/shared/packages/ui/e2e
$ npm run build   → PASS apps/api/apps/storefront/packages/shared/packages/ui
$ cd apps/api && npx tsc --noEmit   → exit 0, không output
```

## 4. Tự review (self-review)

- **`request_id` + trường log hiện có còn nguyên**: dòng log thật ở mục 3 có đủ `level`,
  `request_id`, `method`, `path`, `status`, `timestamp` — không đổi tên/thứ tự, chỉ CỘNG THÊM
  `duration_ms`.
- **Không hình dạng response nào đổi**: `GET /api/products`/`GET /api/products/:id` — bảy
  test T010 (`catalog-products-list.int-spec.ts`, `catalog-product-detail.int-spec.ts`,
  `catalog-health.int-spec.ts`) vẫn 14/14 xanh sau thay đổi; `curl` thật mục 3 cho
  `/api/products/2` khớp đúng hình dạng cũ (`id,name,description,price,images,stockStatus`).
- **`/api/internal/metrics` không lộ tồn kho/khách hàng**:
  `grep -rn "quantity" apps/api/src/modules/catalog/metrics.store.ts
  apps/api/src/modules/catalog/metrics.controller.ts` → không khớp gì (exit 1). Test #3 của
  `performance.e2e-spec.ts` còn quét THẲNG trên JSON thật trả về (không chỉ mã nguồn) để bắt
  cả rò rỉ vô tình sau này.
- **Đúng một đường log có cấu trúc**: `grep -rn "console\.\(log\|info\|warn\|error\)"
  apps/api/src --include="*.ts"` khớp ba dòng — `request-logging.middleware.ts` (dòng log
  JSON có cấu trúc DUY NHẤT, có `request_id`/`duration_ms`), và hai dòng
  `console.warn`/`console.error` PRE-EXISTING của T009 (`catalog.service.ts`)/T011
  (`error-envelope.filter.ts`, log lỗi thô không phải request log) — cả hai file này KHÔNG
  nằm trong diff của tôi (`git status --short` xác nhận), không phải một đường log request
  thứ hai tôi dựng thêm.
- **Hai file T013 byte-identical**: `git diff --stat -- e2e/security-headers.e2e-spec.ts
  e2e/storefront-journey.e2e-spec.ts` → rỗng.
- **Không chạm ngoài phạm vi cho phép**: `git status --short` chỉ liệt 5 file — hai sửa
  (`catalog.module.ts`, `request-logging.middleware.ts`), ba mới
  (`metrics.store.ts`, `metrics.controller.ts`, `e2e/performance.e2e-spec.ts`). Không đụng
  `ops/Caddyfile`, `ops/compose.yaml`, `apps/storefront/**`, `packages/**`, `db/**`,
  `apps/api/src/modules/stock/**`.
- **Không đổi hành vi nghiệp vụ `catalog`**: `catalog.controller.ts`, `catalog.service.ts`,
  `catalog.repository.ts`, `health.controller.ts` không nằm trong diff.

## 5. Files đã thay đổi

```
M  apps/api/src/modules/catalog/catalog.module.ts            (+ MetricsController vào controllers)
M  apps/api/src/modules/catalog/request-logging.middleware.ts (+ duration_ms + ghi vào metrics.store)
A  apps/api/src/modules/catalog/metrics.store.ts               (mới — bộ nhớ trong tiến trình + p95)
A  apps/api/src/modules/catalog/metrics.controller.ts          (mới — GET /api/internal/metrics)
A  e2e/performance.e2e-spec.ts                                 (mới — file DUY NHẤT thêm vào e2e/)
A  .sdd/000-walking-skeleton/task-014-report.md                (file này — không commit)
```

## 6. Concerns

1. **Dữ liệu seed dùng chung bị lẫn fixture Jest (AD-28, đã biết từ T011/T013, không phải lỗi
   T014 gây ra)**: mọi lần `npm test`/`npm run test:regression` chạy Jest của `apps/api` sẽ
   `TRUNCATE` bảng `product` và để lại fixture của `it` cuối cùng (`db/seed.ts` chỉ
   chèn-nếu-chưa-có, không xoá trước). Tôi đã reseed lại bằng đúng lệnh container tạm mà brief
   đưa ra sau khi chạy xong mọi lệnh kiểm chứng, nhưng bảng `product` hiện có HAI dòng (fixture
   Jest `id=1` + "Cà phê sữa đá" thật `id=2`) thay vì một — giống hệt tình trạng T011/T013 đã
   ghi nhận và không tự sửa được (`TRUNCATE` tay bị chính bộ phân loại an toàn của môi trường
   agent chặn — đã thử, bị từ chối với lý do "Cloud Storage Mass Delete", không phải tôi từ
   chối làm). Không ảnh hưởng acceptance criterion nào của T014 — không test nào của tôi giả
   định số lượng sản phẩm cụ thể.
2. **Môi trường sandbox thiếu thư viện hệ thống cho Chromium headless** (`libnspr4.so` và
   tương tự — đúng vấn đề T013 đã ghi ở mục 3.3 báo cáo của họ). Tôi dùng lại giải pháp cục bộ
   không cần root (`.deb` giải nén + `LD_LIBRARY_PATH`) đã có sẵn trong scratchpad phiên này để
   lấy được số đo THẬT ở mục 3. Máy dev/CI có `sudo`/thư viện hệ thống sẵn sẽ không cần bước
   này.
3. **`/api/internal/metrics` chưa bị chặn ở reverse proxy** — đúng theo Ruling R9, việc này
   hoãn sang feature sau và đã ghi ở ledger; tôi không sửa `ops/Caddyfile`. Điều này có nghĩa
   endpoint hiện lộ RA NGOÀI qua cổng 80 công khai (không lộ dữ liệu nhạy cảm, chỉ số đo thời
   lượng) — đúng phạm vi được giao, không phải sơ suất.
4. **p95 tính trong bộ nhớ tiến trình, không bền qua restart** — đúng chủ ý AD-16 (không thêm
   dịch vụ/thư viện metrics); nếu `api` container restart, bộ đếm "hôm nay" về 0 và tích luỹ
   lại từ đầu. Chấp nhận được ở quy mô walking skeleton một tiến trình `api` duy nhất; nếu một
   feature sau nhân bản dịch vụ `api`, endpoint này sẽ cần thiết kế lại (không phải việc của
   T014).
