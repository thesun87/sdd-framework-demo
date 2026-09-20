# Báo cáo T012 — `apps/storefront`: trang chủ + trang chi tiết Sản phẩm

## Trạng thái: DONE_WITH_CONCERNS

(Lý do gắn cờ CONCERNS — không chặn acceptance criteria, xem mục 8.)

## 1. Đã làm gì

Thay khung tối thiểu của T001 bằng nội dung thật: lát cắt dọc nhìn thấy được, gọi API thật
(`/api/products`, `/api/products/:id`), không dữ liệu cứng nào trong mã.

### Files mới — `apps/storefront/src/`

| File | Vai trò |
|---|---|
| `router/router.ts` | Router SPA tối giản THUẦN HÀM (`parseRoute`) + History API (`navigate`, `subscribe`, `getPathname`) — không thêm thư viện định tuyến vì chỉ có 2 trang. |
| `router/usePathname.ts` | `useSyncExternalStore` bọc router, tự vẽ lại khi điều hướng/back-forward. |
| `router/Link.tsx` | `<a>` thật, chặn cú click trái đơn giản để dùng `pushState`; giữ nguyên hành vi mặc định cho Ctrl/Cmd/Shift/Alt-click. |
| `api/client.ts` | Tầng gọi API DUY NHẤT. `fetch(..., { cache: "no-store" })` tường minh trên mọi request; validate response bằng `storefront.ProductsListResponseSchema`/`ProductDetailSchema` của `packages/shared` (không khai lại interface). 404 → `{ kind: "not-found" }` (kết quả hợp lệ, không phải lỗi). |
| `formatPrice.ts` | `formatPriceVnd` — tầng hiển thị thuần tuý (dấu phân cách nghìn + "₫"), không làm tròn/chia/thêm thập phân. |
| `components/ProductCard.tsx` | Thẻ sản phẩm trong lưới — LUÔN là `<Link>` thật dù còn hay hết hàng (FR-008), dùng `StockStatusLabel` của `packages/ui`. |
| `pages/HomePage.tsx` | Trang chủ: `loading` → `ready` (lưới hoặc câu rỗng "Danh mục này chưa có sản phẩm nào.") → `error` (role="alert", tách biệt lưới rỗng). Gọi lại API mỗi lần mount — không cache. |
| `pages/ProductDetailPage.tsx` | Trang chi tiết tối giản: tên, mô tả, giá, ảnh đầu (theo `position`), nhãn tồn kho. Không nút thêm giỏ, không sản phẩm liên quan, không đánh giá. 404 → thông báo rõ + link về trang chủ. |
| `App.tsx` | Ghép router + `RouteAnnouncer` (packages/ui) — tính `message` mới mỗi khi `pathname` đổi, tự gọi lại component với nội dung tiếng Việt tương ứng route. |
| `main.tsx` | Mount `<App />` thật (thay `<StrictMode />` rỗng của T001). |

Test (Vitest 5.0.1 + jsdom, `@testing-library/react`, không jest-dom vì package đó không có
trong repo — dùng đúng cách T007 đã làm: `getByText`/`queryByText`/`.getAttribute`):

- `router/router.test.ts` (3) — `parseRoute` thuần hàm.
- `api/client.test.ts` (4) — AD-20 trung tâm: giả lập `global.fetch`, khẳng định gọi lại
  đúng số lần và trả **dữ liệu mới nhất** (không phục vụ lại `stockStatus` cũ); khẳng định
  mọi request dùng `cache: "no-store"`; 404 → `not-found`.
- `components/ProductCard.test.tsx` (3) — nhãn hai trạng thái là chữ; sản phẩm hết hàng vẫn
  render tên/giá và vẫn là `<a href>` thật.
- `pages/HomePage.test.tsx` (3) — sản phẩm hết hàng vẫn trong lưới và mở được; lưới rỗng
  đúng câu yêu cầu và KHÔNG có `role="alert"`; lỗi thật (fetch fail) THÌ có `role="alert"`
  và khác lưới rỗng.
- `pages/ProductDetailPage.test.tsx` (2) — đủ 5 trường tối giản, không nút/khối cho ba tính
  năng bị cấm; 404 hiện thông báo rõ.
- `App.test.tsx` (1) — `RouteAnnouncer` thật sự đổi nội dung khi bấm link điều hướng sang
  trang chi tiết (khẳng định wiring, không chỉ đọc mã).

### Files sửa

- `apps/storefront/package.json` — bỏ `--passWithNoTests` (brief mục 11); thêm
  `"shared": "0.1.0"`, `"ui": "0.1.0"` vào `dependencies` (cùng cách pin của T011).
- `apps/storefront/index.html` — tiêu đề "Cửa hàng" (thay placeholder "Storefront").
- `apps/storefront/vite.config.ts` — khai tường minh `build.outDir: "dist"` (AD-9, vốn đã
  là mặc định, ghi rõ để không ai đổi nhầm thành thư mục dùng chung).
- `apps/storefront/src/main.tsx` — mount `<App />` thật.
- `package-lock.json` — cập nhật sau `npm install` (thêm hai dependency workspace trên).

## 2. Lệnh và output thật

### Trong `apps/storefront`

```
$ npm test
 Test Files  6 passed (6)
      Tests  16 passed (16)

$ npm run lint
> tsc --noEmit
(exit 0, không output)

$ npm run build
vite v8.3.0 building client environment for production...
✓ 130 modules transformed.
dist/index.html                  0.32 kB │ gzip:  0.24 kB
dist/assets/index-BlRyRCsm.js  310.09 kB │ gzip: 94.77 kB
✓ built in 125ms
```

`dist/` là thư mục output RIÊNG của `apps/storefront` (AD-9) — không lẫn với bất kỳ workspace nào khác.

### Ở gốc repo (bốn lệnh hợp đồng, với `postgres` thật + `DATABASE_URL`/`API_PORT`/`NODE_ENV`/`PRODUCT_IMAGE_PATH` đã set)

```
$ npm run db:migrate → [✓] migrations applied successfully!
$ npm test    → PASS glue (22 test) · apps/api (14/14) · apps/storefront (16/16) ·
                packages/shared (24/24) · packages/ui (5/5)
$ npm run build → PASS apps/api, apps/storefront, packages/shared, packages/ui
$ npm run lint  → PASS glue, apps/api, apps/storefront, packages/shared, packages/ui, e2e
```

## 3. Bằng chứng chạy thật với API + database thật

`postgres` (`shop-online-postgres-1`) đã chạy sẵn từ trước; DB có lẫn một dòng fixture test
cũ (`id=1`, "Sản phẩm test...") bên cạnh Sản phẩm mẫu thật (`id=2`, "Cà phê sữa đá") — đúng
tình trạng T011 đã cảnh báo (mục 9.3 báo cáo T011). Không `TRUNCATE` thủ công (đúng chỉ dẫn
brief); chạy `npm run db:seed` (idempotent) để đảm bảo Sản phẩm mẫu thật có mặt.

**Cách kiểm**: dựng `api` thật bằng bản build `tsc` (`node apps/api/dist/main.js`, đúng
đường chạy production theo `ops/api.Dockerfile`, tránh vỡ DI của `tsx` mà T011 đã ghi nhận)
trên cổng 3005; dựng `storefront` bằng `vite` dev server thật (mã nguồn thật, không mock)
với một proxy `/api` tạm thời trỏ sang cổng 3005 (giả lập single-origin mà Caddy sẽ làm ở
production — xem mục 8.2). Sau đó dùng chính `@testing-library/react` + `fetch` THẬT (không
mock `global.fetch`) để dựng `<App />` trong jsdom và đọc DOM — tương đương một trình duyệt
thật gọi API thật, khác biệt duy nhất là bộ render (jsdom thay vì Chromium — xem mục 8.1 vì
sao không dùng Playwright được).

**Trước khi đổi `quantity`** — `curl` xác nhận dữ liệu thật:
```
$ curl -sS http://localhost:3005/api/products/2
{"id":2,"name":"Cà phê sữa đá","description":"Cà phê phin truyền thống pha cùng sữa đặc,
phục vụ lạnh với đá viên.","price":25000,"images":[{"path":"/data/product-images/ca-phe-sua-da.jpg",
"position":0}],"stockStatus":"in_stock"}
```

**Trang chủ + trang chi tiết** (log thật từ kịch bản kiểm thử, quantity=50):
```
[TRANG CHỦ] Toàn bộ lưới: [ 'Sản phẩm test ...0₫Còn hàng', 'Cà phê sữa đá25.000₫Còn hàng' ]
[TRANG CHỦ] Nhãn tồn kho của 'Cà phê sữa đá': in_stock / chữ hiển thị: Còn hàng
[TRANG CHỦ] href (vẫn mở được, không disable): /products/2
[CHI TIẾT] URL: /products/2
[CHI TIẾT] Mô tả: Cà phê phin truyền thống pha cùng sữa đặc, phục vụ lạnh với đá viên.
[CHI TIẾT] Nhãn tồn kho: in_stock / chữ hiển thị: Còn hàng
```

**Đổi `quantity` về 0 trực tiếp trong database** (`UPDATE stock SET quantity = 0 WHERE
product_id = 2;`), xác nhận qua `curl`:
```
$ curl -sS http://localhost:3005/api/products/2
{...,"stockStatus":"out_of_stock"}
```

**Tải lại (dựng lại `<App />` mới, KHÔNG tái sử dụng bất kỳ state/response nào từ lần trước
— đúng ngữ nghĩa "tải lại trang")**:
```
[TRANG CHỦ] Toàn bộ lưới: [ 'Sản phẩm test ...0₫Còn hàng', 'Cà phê sữa đá25.000₫Hết hàng' ]
[TRANG CHỦ] Nhãn tồn kho của 'Cà phê sữa đá': out_of_stock / chữ hiển thị: Hết hàng
[TRANG CHỦ] href (vẫn mở được, không disable): /products/2
[CHI TIẾT] URL: /products/2
[CHI TIẾT] Nhãn tồn kho: out_of_stock / chữ hiển thị: Hết hàng
```

→ Nhãn đổi đúng sang "Hết hàng", Sản phẩm **vẫn hiện trong lưới** và **vẫn có `href` mở
được** — không ẩn, không disable (FR-008). Đã khôi phục `quantity = 50` sau khi kiểm xong
(`UPDATE stock SET quantity = 50 WHERE product_id = 2;`) để không để lại tác dụng phụ trên
database dev dùng chung.

Toàn bộ hạ tầng kiểm thử tạm (proxy config, file test gọi API thật, script Playwright) đã bị
XOÁ trước khi commit — `git status` chỉ còn đúng các file thuộc `apps/storefront/**` liệt ở
mục 1.

## 4. Tự soát xét (self-review)

- `grep -rniE "interface (ProductSummary|ProductDetail)" apps/storefront/src` → **không
  khớp gì** (đã đổi tên `ProductDetailPageProps` → `DetailPageProps` vì tên cũ chứa chuỗi con
  "interface ProductDetail" khớp nhầm với chính grep này).
- `grep -rn "Còn hàng\|Hết hàng" apps/storefront/src` → chỉ khớp trong test (khẳng định đầu
  ra của `StockStatusLabel`) và một dòng comment giải thích rủi ro AD-20; KHÔNG có chỗ nào
  trong mã ứng dụng tự render hai chuỗi này — luôn đi qua `<StockStatusLabel status={...} />`.
- Không nút thêm vào giỏ, không sản phẩm liên quan, không đánh giá:
  `ProductDetailPage.test.tsx` khẳng định `queryByRole("button")` là `null` và không có chữ
  "thêm vào giỏ"/"sản phẩm liên quan"/"đánh giá" nào trên trang — không chỉ đọc mã bằng mắt.
- `RouteAnnouncer` nối thật vào điều hướng: `App.test.tsx` bấm link thật, khẳng định vùng
  `role="status"` đổi nội dung — không chỉ import component rồi bỏ đó.
- `grep -rniE "quantity|inventory" apps/storefront/src` → không khớp gì.
- `grep -rniE "cache|memo|swr|stale-while-revalidate|localstorage|sessionstorage"
  apps/storefront/src/api apps/storefront/src/pages apps/storefront/src/App.tsx` → chỉ khớp
  comment/tên test giải thích **tại sao KHÔNG** cache — không cache thật nào trong mã.
- Không import chéo `apps/backoffice` (không tồn tại, không tham chiếu ở đâu).
- Phạm vi: `git status --short` chỉ có file trong `apps/storefront/**` +
  `package-lock.json` (tác dụng phụ của `npm install` sau khi thêm 2 dependency workspace,
  cùng cách T011 đã làm cho `apps/api/package.json`). Không chạm `apps/api/**`,
  `packages/shared/**`, `packages/ui/**`, `docs/baseline/**`, `specs/**`, `ops/**`, `db/**`,
  `e2e/**`, `tests/**`, `package.json` gốc.

## 5. Quyết định thiết kế đáng chú ý

- **Router tự viết, không thêm thư viện**: chỉ 2 trang, `history.pushState` +
  `useSyncExternalStore` đủ dùng và không kéo thêm dependency mới vào bundle cho một nhu cầu
  nhỏ như vậy.
- **Không dùng react-query/SWR**: cache-by-default là đúng thứ AD-20 cấm; `fetch` thẳng với
  `cache: "no-store"` tường minh, gọi lại mỗi lần mount trang, là "đường đơn giản nhất là
  đường đúng" mà brief mục 7 yêu cầu.
- **`imagePath`/`images[].path` được render thẳng vào `<img src>`** không qua biến đổi nào —
  đúng hợp đồng (`storefront-http.md`), nhưng xem mối lo mục 8.2 về giá trị thật hiện tại.

## 6. Files đã thay đổi

```
M  apps/storefront/index.html
M  apps/storefront/package.json
M  apps/storefront/src/main.tsx
M  apps/storefront/vite.config.ts
M  package-lock.json
A  apps/storefront/src/App.tsx
A  apps/storefront/src/App.test.tsx
A  apps/storefront/src/formatPrice.ts
A  apps/storefront/src/api/client.ts
A  apps/storefront/src/api/client.test.ts
A  apps/storefront/src/components/ProductCard.tsx
A  apps/storefront/src/components/ProductCard.test.tsx
A  apps/storefront/src/pages/HomePage.tsx
A  apps/storefront/src/pages/HomePage.test.tsx
A  apps/storefront/src/pages/ProductDetailPage.tsx
A  apps/storefront/src/pages/ProductDetailPage.test.tsx
A  apps/storefront/src/router/router.ts
A  apps/storefront/src/router/router.test.ts
A  apps/storefront/src/router/usePathname.ts
A  apps/storefront/src/router/Link.tsx
A  .sdd/000-walking-skeleton/task-012-report.md   (file này, không commit theo scope)
```

## 7. Không có ở trang chi tiết (khẳng định tường minh)

Không nút thêm vào giỏ. Không khối "sản phẩm liên quan". Không khối đánh giá/review. Xác
nhận cả bằng đọc mã (`ProductDetailPage.tsx` chỉ có 5 phần tử: link về trang chủ, tên, ảnh,
giá, nhãn tồn kho, mô tả) lẫn bằng test (`ProductDetailPage.test.tsx`).

## 8. Concerns

1. **Không dùng được trình duyệt thật (Playwright/Chromium) trong môi trường agent này** —
   `npx playwright install` không chạy (không có mạng/quyền cài); các bản Chromium cached sẵn
   ở `~/.cache/ms-playwright` thiếu thư viện hệ thống (`libnspr4.so`) nên không khởi động
   được. Đã thay bằng cách dựng `<App />` thật trong jsdom (`@testing-library/react`, cùng
   công cụ dùng cho toàn bộ test suite) và gọi `fetch` THẬT (không mock) tới `api` thật đang
   chạy — cùng một round-trip mạng, khác duy nhất là bộ render DOM. Toàn bộ bằng chứng ở mục
   3 là dữ liệu thật từ API + PostgreSQL thật, không phải suy diễn. Nếu người review cần đúng
   Chromium, cần môi trường có `libnspr4`/`libnss3`/... cài sẵn (ngoài phạm vi task này).
2. **`imagePath`/`images[].path` hiện là đường dẫn HỆ TỆP** (`/data/product-images/ca-phe-sua-da.jpg`),
   KHÔNG phải đường dẫn HTTP servable — xác nhận bằng `curl` thật ở mục 3. Đối chiếu
   `ops/Caddyfile` (đọc, không sửa — nằm ngoài phạm vi cho phép của task): không có route nào
   phục vụ `/data/product-images/*` qua HTTP; named volume `product-images` được mount vào
   container `proxy` nhưng chưa có `handle`/`file_server` nào trỏ tới nó. Nghĩa là ảnh sản
   phẩm hiện KHÔNG tải được trên trình duyệt thật dù `<img src>` được render đúng theo hợp
   đồng response. Đây là một khoảng trống có sẵn từ trước (thuộc phạm vi `ops/Caddyfile`/
   `apps/api`, cả hai đều CẤM task này chạm vào) — không phải lỗi của T012, nhưng người xem
   trang thật sẽ thấy icon ảnh vỡ. Đã thêm `alt={product.name}` nên vẫn không mất khả năng
   tiếp cận. Nêu rõ để reviewer không hiểu nhầm là component render sai.
3. **`docker compose -f ops/compose.yaml up -d --build` (đủ cả `api`+`proxy`) hiện KHÔNG dựng
   được** — `ops/api.Dockerfile` stage `deps` chỉ `npm ci --workspace=apps/api`, không build
   `packages/shared` trước khi `tsc` biên dịch `apps/api` ở stage `build`, nên
   `Cannot find module 'shared'`. Chính comment trong `ops/api.Dockerfile` đã ghi trước: "T011
   và T015 là nơi image này thực sự dựng và chạy được" — tức việc dựng Docker end-to-end được
   để dành cho T015, không phải T012. Không sửa (file thuộc `ops/**`, bị cấm). Đã dùng cách
   T011 dùng (`node apps/api/dist/main.js` build từ host) để lấy bằng chứng thật ở mục 3.
4. **Database dev dùng chung vẫn còn dòng fixture test cũ** (`product.id=1`, "Sản phẩm
   test...") bên cạnh Sản phẩm mẫu thật — kế thừa từ tình trạng T011 để lại, không phải do
   T012 gây ra, và brief cấm tự `TRUNCATE`. Trang chủ thật sẽ hiện 2 sản phẩm thay vì 1 cho
   tới khi ai đó dọn database này bằng tay.
5. Không thêm script `"dev"` vào `apps/storefront/package.json` (brief không yêu cầu, và
   pipeline hợp đồng chỉ cần `test`/`lint`/`build`) — config `vite` dev-proxy dùng để kiểm
   thử thủ công ở mục 3 chỉ là file tạm, đã xoá, không phải một phần của bộ mã nộp.
