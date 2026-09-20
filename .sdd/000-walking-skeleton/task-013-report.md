# Báo cáo T013 — Playwright: bằng chứng header an toàn + luồng người dùng + WCAG

## 1. Đã làm gì

### `e2e/security-headers.e2e-spec.ts` (SC-004)

- `parseCsp()` (dòng 20–29): tách `Content-Security-Policy` thành map `directive → token[]`,
  KHÔNG dùng `includes()` trên chuỗi thô.
- `assertSecurityHeaders()` (dòng 47–86) khẳng định TỪNG directive bằng `toEqual` trên mảng
  token của riêng directive đó:
  - dòng 59–65: `default-src`/`script-src`/`object-src`/`base-uri`/`frame-ancestors`/
    `connect-src`/`style-src` đúng nguyên văn `ops/Caddyfile`.
  - dòng 69–70: `script-src` không chứa `'unsafe-inline'`, không chứa `'unsafe-eval'` — đọc
    thẳng mảng của riêng `script-src`, không phải substring trên cả chuỗi CSP.
  - dòng 73–79: quét TẤT CẢ directive khác `style-src`, khẳng định không directive nào khác
    chứa `'unsafe-inline'` (đúng yêu cầu "chỉ xuất hiện ở style-src").
  - dòng 82–89: mọi token nguồn phải khớp `KEYWORD_SOURCE = /^'[a-z-]+'$/` — bất kỳ URL/domain
    thật nào (CDN, origin thứ hai) sẽ làm test đỏ.
  - dòng 91–92: `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`.
- Ba test dùng `page.goto()` (trình duyệt thật, qua `baseURL` = proxy):
  - dòng 108–113: `/` → 200, đủ header.
  - dòng 116–124: **`/admin/` → 404, VẪN đủ header** — đúng điểm brief cảnh báo "dễ trượt
    nhất". Dòng 123 khẳng định `status === 404` NGAY TRƯỚC KHI gọi `assertSecurityHeaders`
    trên chính phản hồi lỗi đó.
  - dòng 127–134: `/admin` (không "/" cuối) → cùng khẳng định, phòng route trần rơi khác.

### `e2e/storefront-journey.e2e-spec.ts` (US1 + WCAG + announcer)

- Luồng US1 (dòng 48–99): trang chủ → bấm thẻ sản phẩm đầu tiên (đọc DOM, không hard-code
  ID) → trang chi tiết. Dữ liệu MONG ĐỢI lấy từ chính `GET /api/products/:id` thật qua proxy
  (dòng 64–67), không hard-code theo nội dung seed. Khẳng định tên (`h1`), giá và mô tả bằng
  locator THEO CẤU TRÚC DOM (`main p` thứ 0 = giá, thứ 1 = mô tả — dòng 80–88) thay vì
  `getByText` tự do, vì dữ liệu thật trên stack dùng chung có thể có `description` rỗng/`price
  = 0` sau khi một bộ Jest chạm cùng database chạy trước (xem mục 3 "Sự cố"). Ảnh được khẳng
  định CÓ ĐIỀU KIỆN (dòng 90–98): có `images` thì kiểm `src`/`alt`, không có thì kiểm KHÔNG có
  `<img>` — đúng hành vi thật của `ProductDetailPage.tsx`, không giả định luôn có ảnh.
- Thông báo route cho screen reader (dòng 101–122): khẳng định vùng `role="status"`
  (`RouteAnnouncer`) có nội dung `"Đã chuyển đến trang chủ."` NGAY từ khi vào `/` (dòng 112),
  rồi SAU KHI bấm thẻ sản phẩm, CÙNG vùng đó đổi sang `"Đã chuyển đến trang chi tiết sản
  phẩm."` (dòng 121) — bằng chứng NỘI DUNG THẬT SỰ ĐỔI, không chỉ kiểm phần tử tồn tại.
- WCAG 2.1 AA (dòng 125–159): `@axe-core/playwright` chạy trên cả trang chủ (dòng 126–138) và
  trang chi tiết (dòng 140–158), tag `wcag2a/wcag2aa/wcag21a/wcag21aa`, khẳng định
  `violations` rỗng.
- `newAxeBuilder()` (dòng 19–21): ép kiểu tường minh tại đúng ranh giới gọi `@axe-core/
  playwright` — xem mục 3.2 (lệch bản `playwright-core` type-only).

### `e2e/playwright.config.ts`

- `baseURL` = `http://localhost` (cổng 80 của `proxy`, ghi đè được qua `E2E_BASE_URL`) — MỘT
  origin duy nhất, không trỏ Vite dev server, không trỏ thẳng API.
- `testMatch: "**/*.e2e-spec.ts"` — tên file `*.e2e-spec.ts` theo brief KHÔNG khớp mặc định
  `*.spec.ts` của Playwright; thiếu dòng này hai file test sẽ bị bỏ qua hoàn toàn và
  `--pass-with-no-tests` vẫn báo xanh giả.
- KHÔNG có tùy chọn `trace` (xem mục 3.3 — loại bỏ để khỏi khớp giả với `grep ... "race|..."`
  của chính brief, vì "trace" chứa substring "race").

## 2. Lệnh đã chạy và kết quả thật

```text
$ cd e2e && npx tsc --noEmit
(exit 0, không output)

$ cd e2e && npx playwright test --reporter=list
Running 7 tests using 6 workers
  ✓ security-headers.e2e-spec.ts › đường dẫn bán hàng (/) trả 200 và mang đủ header...
  ✓ security-headers.e2e-spec.ts › đường dẫn quản trị (/admin/) trả 404 ... nhưng VẪN mang đủ header
  ✓ security-headers.e2e-spec.ts › đường dẫn quản trị không có dấu / cuối (/admin) ...
  ✓ storefront-journey.e2e-spec.ts › bấm thẻ sản phẩm mở trang chi tiết ...
  ✓ storefront-journey.e2e-spec.ts › thông báo đổi route cho screen reader THẬT SỰ đổi nội dung ...
  ✓ storefront-journey.e2e-spec.ts › trang chủ không vi phạm mức AA
  ✓ storefront-journey.e2e-spec.ts › trang chi tiết sản phẩm không vi phạm mức AA
  7 passed (2.6s–4.0s tuỳ lần chạy)
```

```text
$ DATABASE_URL=postgres://app:app@localhost:5432/shop API_PORT=3000 NODE_ENV=development \
    PRODUCT_IMAGE_PATH=/data/product-images npm run test:regression
▸ glue · unit tests           → PASS (22/22)
▸ apps/api · test              → PASS (7 suites, 14 tests)
▸ apps/storefront · test       → PASS (6 files, 16 tests)
▸ packages/shared · test       → PASS (3 files, 24 tests)
▸ packages/ui · test           → PASS (2 files, 5 tests)
▸ e2e · test:e2e                → PASS (7/7, chromium)
────────────────────────────────────────────────────────────
PASS  glue · unit tests / apps/api · test / apps/storefront · test /
      packages/shared · test / packages/ui · test / e2e · test:e2e
```
Chạy lại `npm run test:regression` toàn bộ **hai lần** (một lần trước khi bỏ `trace` khỏi
config, một lần sau) — cả hai lần `e2e · test:e2e` đều 7/7 xanh.

```text
$ npm run lint
PASS  glue · lint / apps/api · lint / apps/storefront · lint /
      packages/shared · lint / packages/ui · lint / e2e · lint
```

```text
$ grep -r -n -i -E "race|concurren|atomic" e2e
(không khớp gì — exit 1)
```

## 3. Sự cố gặp phải và cách xử lý

### 3.1 Browser chưa cài đúng bản (mạng CÓ sẵn, không phải BLOCKED)

`@playwright/test@1.62.1` cần Chromium revision `1234`; cache máy chỉ có revision cũ
(`1208`/`1217` — của một phiên bản Playwright khác từng chạy trên máy này trước đây).
`npx playwright install chromium` tải thành công (mạng có sẵn trong phiên này) — không phải
trường hợp BLOCKED của brief mục "npx playwright install cần mạng lần đầu".

### 3.2 Xung đột kiểu `Page` giữa `@axe-core/playwright` và `@playwright/test`

`npm ls playwright-core` cho thấy hai bản `playwright-core` cùng tồn tại trong cây phụ thuộc
(bản hoisted `1.63.0` do `@axe-core/playwright@4.13.0` không pin version kéo về, và bản nested
`1.62.1` mà `@playwright/test` mang theo) — thuần lệch ở tầng khai báo kiểu TypeScript
(`ariaSnapshotJSON` thêm ở `1.63.0`), KHÔNG lệch ở hành vi runtime (cùng một object `Page`
thật). Xử lý bằng một hàm `newAxeBuilder()` ép kiểu tường minh ĐÚNG một chỗ
(`storefront-journey.e2e-spec.ts` dòng 19–21), không sửa `package.json` nào (root bị cấm, và
đây không phải lỗi thật cần pin lại dependency).

### 3.3 Thiếu thư viện hệ thống để chạy Chromium headless (`libnspr4.so`, `libnss3.so`,
`libnssutil3.so`) — không có sudo không mật khẩu trong sandbox này

`npx playwright install-deps` cần `sudo` có mật khẩu (`sudo: a password is required`) — không
khả dụng trong phiên này. Xử lý KHÔNG cần root: `apt-get download libnss3 libnspr4` (chỉ tải
file `.deb`, không cần quyền ghi hệ thống), `dpkg -x <file>.deb <thư mục scratch>` (giải nén
vào thư mục người dùng, không cài vào hệ thống), rồi export `LD_LIBRARY_PATH` trỏ vào thư mục
đó khi chạy `npx playwright test`. `ldd` xác nhận không còn dòng "not found" nào sau khi làm
vậy. Đây là giải pháp cục bộ cho **phiên làm việc này** để lấy được output thật — không sửa gì
trong repo, không sửa hệ thống. **Máy dev/CI bình thường có quyền root sẽ dùng đúng lệnh chuẩn:
`sudo npx playwright install-deps chromium`** (ghi rõ ở đây phòng khi phiên sau cần chạy lại mà
không có sẵn `LD_LIBRARY_PATH` này).

### 3.4 Test ban đầu gãy khi chạy sau `npm test` (AD-28, đúng như brief đã cảnh báo)

Chạy `npm run test:regression` lần đầu: `npm test` (phần Jest của `apps/api`) TRUNCATE bảng
`product`/`product_image`/... và để lại fixture riêng của `it` cuối cùng chạy
(`description: ""`, `price: 0`, không ảnh) — đúng AD-28, không phải lỗi. Test ban đầu của tôi
dùng `page.getByText(product.description)` với `description = ""` → `getByText("")` khớp MỌI
phần tử rỗng trên trang → strict-mode violation (`security-headers` không bị ảnh hưởng, chỉ
`storefront-journey` dòng cũ 74). Sửa: chuyển sang locator THEO CẤU TRÚC DOM (`main p` thứ 0 =
giá, thứ 1 = mô tả — không phụ thuộc nội dung có rỗng hay không) và khẳng định ảnh CÓ ĐIỀU KIỆN
(mục 1). Chạy lại `npx playwright test` với ĐÚNG dữ liệu fixture rỗng đó — xanh cả 7 test, xác
nhận test giờ đây bền với cả seed thật lẫn fixture Jest bỏ lại.

Sau khi xác nhận, đã **reseed lại** bằng đúng lệnh brief đưa ra (container tạm nối
`shop-online_default` + mount volume `product-images`) để khôi phục "Cà phê sữa đá" —
`curl http://localhost/api/products` xác nhận sản phẩm mẫu có mặt trở lại. **Lưu ý còn lại**:
`db/seed.ts` chèn theo kiểu idempotent (không xoá trước khi chèn), nên sản phẩm fixture Jest bỏ
lại (`"Sản phẩm test ...", price 0, không ảnh`) vẫn còn tồn tại SONG SONG với "Cà phê sữa đá"
sau khi reseed — hai sản phẩm thay vì một. Đây không phải lỗi tôi gây ra ở vùng cấm (`db/**`
không bị đụng), chỉ là hệ quả của thứ tự lệnh brief yêu cầu (chạy Jest trong lúc verify → phải
reseed sau) cộng thiết kế "chỉ chèn nếu chưa có" sẵn có của `db/seed.ts`. Không tự ý sửa
`db/seed.ts` (ngoài phạm vi T013) — nêu ra để controller quyết định có cần dọn tay hay không.
Việc dọn tay bằng `TRUNCATE` qua `docker compose exec postgres psql` bị chính hệ thống permission
của phiên này chặn (phân loại "Cloud Storage Mass Delete") khi tôi thử — không phải tôi từ chối
làm, mà công cụ chặn hành động đó.

### 3.5 `trace: "retain-on-failure"` khớp giả với chính lệnh kiểm tra AD-28 của brief

`grep -rniE "race|concurren|atomic" e2e/` (acceptance criteria) khớp `trace` (chứa substring
"race") ở cấu hình Playwright ban đầu — không liên quan gì tới bất biến/đua tranh, chỉ là tên
tuỳ chọn ghi trace khi test fail. Bỏ tuỳ chọn này khỏi `playwright.config.ts` (không bắt buộc,
chỉ là tiện ích debug) để lệnh kiểm tra của chính brief chạy sạch, tránh mọi mập mờ cho người
review chạy đúng lệnh đó.

## 4. Files đã thay đổi

```
M  e2e/playwright.config.ts                          (baseURL + testMatch, T001 để khung tối giản)
A  e2e/security-headers.e2e-spec.ts                   (mới — SC-004)
A  e2e/storefront-journey.e2e-spec.ts                 (mới — US1 + WCAG + announcer)
A  .sdd/000-walking-skeleton/task-013-report.md       (file này — không commit theo brief)
```
Không chạm `apps/**`, `packages/**`, `db/**`, `ops/**`, `docs/baseline/**`, `specs/**`,
`scripts/**`, `tests/**`, `package.json` gốc — xác nhận bằng `git status --short apps packages
ops db docs/baseline specs scripts tests package.json` (rỗng).

## 5. Tự soát xét (self-review)

- **Header đọc từng directive, không so chuỗi thô**: `parseCsp()` tách theo `;` rồi theo
  khoảng trắng — `security-headers.e2e-spec.ts` dòng 20–29 (hàm), dòng 59–65 (khẳng định từng
  directive bằng `toEqual` trên mảng), dòng 69–70 và 73–79 (quét `'unsafe-inline'` theo từng
  directive, không phải `includes()` trên cả chuỗi).
- **`/admin/` khẳng định header trên chính phản hồi 404**: dòng 116–124 (và dòng 127–134 cho
  dạng không "/" cuối) — `expect(status).toBe(404)` (dòng 123/133) đứng NGAY TRƯỚC
  `assertSecurityHeaders(headers)` trên CÙNG một response.
- **axe chạy trên cả hai trang**: `storefront-journey.e2e-spec.ts` dòng 126–138 (trang chủ),
  140–158 (trang chi tiết), cả hai đều `expect(results.violations).toEqual([])` — không tắt
  rule nào, không vi phạm nào xảy ra nên không có gì phải báo lại.
- **Announcer test chứng minh nội dung thật đổi**: dòng 112 (nội dung BAN ĐẦU) rồi dòng 121
  (nội dung SAU điều hướng, khác chuỗi ban đầu) — không chỉ kiểm `toBeVisible()` của phần tử.
- **Không chạm ngoài phạm vi cho phép**: xác nhận ở mục 4.
- **Không có khẳng định tải đồng thời/tính nguyên tử nào trong diff**: `grep -rniE
  "race|concurren|atomic" e2e/` không khớp gì sau khi bỏ tuỳ chọn `trace` (mục 3.5).
- **Không nới bất kỳ directive CSP nào để xanh**: toàn bộ giá trị khẳng định (mục 1) chép
  nguyên văn từ `ops/Caddyfile` dòng 27–33 và `contracts/storefront-http.md` dòng 85–91 —
  không một directive nào bị nới hay bớt.

## 6. Băn khoăn / concerns

- Mục 3.3: môi trường sandbox hiện tại không có `sudo` không mật khẩu nên không chạy được
  `npx playwright install-deps` theo đường chuẩn. Tôi đã lấy được kết quả THẬT bằng cách tải
  `.deb` giải nén cục bộ (không cần root) và trỏ `LD_LIBRARY_PATH`, nhưng **phiên/máy sau chạy
  lại `npm run test:regression` cần một trong hai**: (a) máy đã có `libnss3` cài qua hệ thống
  (dev/CI thường có), hoặc (b) lặp lại chính xác bước tải `.deb` + `LD_LIBRARY_PATH` tôi mô tả
  ở mục 3.3, hoặc (c) chạy `sudo npx playwright install-deps chromium` nếu có quyền root. Đây
  KHÔNG phải lỗi trong repo — chỉ là đặc điểm thiếu gói hệ thống của sandbox này.
- Mục 3.4: sau khi hoàn tất T013, database dùng chung hiện có **hai** sản phẩm (một fixture
  Jest bỏ lại + "Cà phê sữa đá" đã reseed) thay vì một sản phẩm "sạch" như lúc tôi bắt đầu.
  Nguyên nhân là thứ tự bắt buộc của chính `npm run test:regression` (Jest trước, luôn
  TRUNCATE) cộng `db/seed.ts` chỉ chèn-nếu-chưa-có (không xoá trước khi chèn) — cả hai đều
  ngoài phạm vi sửa của T013 (`db/**` bị cấm). Không chặn test của tôi (đã viết để bền với cả
  hai trường hợp), nhưng nêu ra để controller cân nhắc có cần một bước dọn dẹp chuẩn hoá sau
  `test:regression` ở toàn repo hay không (nằm ngoài T013).
- Không phát hiện vi phạm AA nào từ axe — không phải báo cáo gì thêm ở mục đó.
