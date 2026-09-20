# Quickstart — Walking Skeleton

Hướng dẫn **chạy và kiểm chứng**, không phải hướng dẫn hiện thực. Chi tiết hình dạng dữ liệu ở
[data-model.md](./data-model.md), hợp đồng HTTP ở [contracts/storefront-http.md](./contracts/storefront-http.md).

> **T015 (2026-09-20)**: toàn bộ tài liệu dưới đây đã chạy thật, nguyên văn, trên một `git
> clone` sạch (không dùng lại `node_modules`/container/volume của cây làm việc cũ) và đạt lại
> SC-001…SC-007. Các chỗ khác với bản trước đều được sửa ở đây vì clone sạch cho thấy chúng
> không chạy được — xem chú thích tại từng chỗ.

## Điều kiện tiên quyết

| Yêu cầu | Trạng thái trên máy này (2026-09-20) |
|---|---|
| Node ≥ 24.15 | ✅ 24.21.0 |
| Python ≥ 3.10 + PyYAML | ✅ 3.12.3 |
| Docker + Docker Compose | ✅ Docker 29.1.2 + Compose v2.40.3 — **đã dùng được** (dòng cũ nói "chưa dùng được trong distro WSL này" đã lỗi thời, xác nhận lại bằng một `docker compose up`/`build` thật trên clone sạch, xem T015) |
| `npx playwright install` | ⏳ cần mạng lần đầu. Trên một máy Linux tối giản (thiếu `libnss3`/`libnspr4`…), Chromium headless còn cần thư viện hệ thống: chạy `sudo npx playwright install-deps chromium` (có quyền root) trước `npm run test:regression`. Không có `sudo` (ví dụ sandbox CI hạn chế) → tải `.deb` bằng `apt-get download libnss3 libnspr4`, giải nén bằng `dpkg -x <file>.deb <thư mục tạm>` (không cần quyền ghi hệ thống), rồi export `LD_LIBRARY_PATH` trỏ vào thư mục đó khi chạy `npm run test:regression`/`npx playwright test`. |

**Docker là chặn cứng, không phải tuỳ chọn.** AD-27 cấm thay PostgreSQL thật bằng bất cứ thứ
gì — `pg-mem`, shim SQLite hay repository giả đều khiến test *"xanh mà không chứng minh gì,
tệ hơn không có test"*.

## Biến môi trường cho lệnh chạy TRÊN HOST

`ops/.env.example` là bản kê duy nhất (Ruling R4), nhưng **không có gì tự nạp nó** khi một
lệnh npm chạy trần trên host (không qua `docker compose`) — không `dotenv`, không cấu hình ẩn
nào trong `scripts/verify.mjs`. `docker compose` tự bơm `env_file` cho dịch vụ `api`, nhưng
`npm run db:migrate`, `npm test`, `npm run lint`, `npm run build` và test tải riêng lẻ (mục
"Kịch bản nghiệm thu bằng test") đều chạy TRÊN HOST — clone sạch xác nhận cả bốn đều lỗi rõ
ràng (`DATABASE_URL chưa được set`, hoặc bootstrap Nest thất bại im lặng vì thiếu `API_PORT`/
`NODE_ENV`/`PRODUCT_IMAGE_PATH`) nếu bốn biến này chưa có trong shell. Trước khi chạy bất kỳ
lệnh host nào bên dưới, export đúng bốn giá trị của `ops/.env.example`:

```bash
export DATABASE_URL=postgres://app:app@localhost:5432/shop
export API_PORT=3000
export NODE_ENV=development
export PRODUCT_IMAGE_PATH=/data/product-images
```

(Cổng 5432 được publish ra host — xem `ops/compose.yaml` — nên `localhost` đúng cho lệnh chạy
trên host; dịch vụ `api` bên trong mạng compose tự override giá trị này bằng tên dịch vụ
`postgres`, không cần bạn làm gì thêm cho container.)

## Dựng và chạy

Clone sạch **không có `node_modules`** — thiếu bước cài phụ thuộc là lỗi của bản quickstart cũ,
đã thêm lại ở đây:

```bash
npm install                                          # BẮT BUỘC trên clone sạch — không có bước này ở bản cũ
docker compose -f ops/compose.yaml up -d postgres    # dịch vụ dùng chung, không dựng lại mỗi lần chạy
npm run db:migrate                                   # drizzle-kit migrate — TRƯỚC khi khởi động app
```

`drizzle-kit push` **bị cấm ở mọi môi trường, kể cả máy dev** (AD-25). Lược đồ của database
test dựng bằng **đúng** lệnh áp cho prod — không bao giờ bằng một đường riêng.

### Build `packages/shared` và `packages/ui` TRƯỚC — bắt buộc trên clone sạch

`apps/api` và `apps/storefront` resolve `import ... from "shared"` / `"ui"` qua
`node_modules/shared` → symlink workspace → `packages/shared/package.json` → `main`/`types`
trỏ vào `dist/`. Trên clone sạch, `dist/` chưa tồn tại. `scripts/verify.mjs` duyệt `apps/`
**trước** `packages/` (không tự sắp lại theo phụ thuộc), nên lệnh `npm test` / `npm run lint` /
`npm run build` chạy đầu tiên trên clone sạch báo lỗi `Cannot find module 'shared'` cho
`apps/api` và `apps/storefront` — không phải lỗi mã nguồn, mà là một bước setup còn thiếu ở
bản quickstart cũ. Build hai package này một lần trước khi làm gì khác:

```bash
npm run build --workspace=packages/shared
npm run build --workspace=packages/ui
```

Sau bước này, cả bốn lệnh hợp đồng ở mục "Kiểm chứng" bên dưới chạy sạch trong **một** lần gọi
duy nhất mỗi lệnh (đúng "chạy nguyên văn" — không lệnh nào trong bốn lệnh hợp đồng bị gọi hai
lần để né lỗi).

### `npm run db:seed` — PHẢI chạy trong container nối đúng network + volume, KHÔNG chạy trần trên host

`PRODUCT_IMAGE_PATH=/data/product-images` (mặc định) là một **named volume Docker**, chỉ có ý
nghĩa BÊN TRONG container đã mount nó (`api`/`proxy`). Từ T011c (Ruling R23), `db/seed.ts` ghi
một **tệp ảnh thật** ra đường dẫn này sau khi transaction database commit. Chạy
`npm run db:seed` **trần trên host** — như bản quickstart cũ ghi — thất bại thật:
`EACCES: permission denied, mkdir '/data'` (xác nhận lại trên clone sạch, T015). Chạy đúng
lệnh `db:seed` gọi (`npx tsx db/seed.ts`, không đổi logic) bên trong một container tạm nối vào
đúng network compose đã tạo và mount đúng named volume (mẫu đã xác thực ở T011c §2.3):

```bash
docker run --rm --network shop-online_default \
  -v "$(pwd)":/repo -w /repo \
  -v shop-online_product-images:/data/product-images \
  -e DATABASE_URL=postgres://app:app@postgres:5432/shop \
  -e NODE_ENV=development -e PRODUCT_IMAGE_PATH=/data/product-images \
  node:24.21.0-bookworm-slim npx tsx db/seed.ts
```

`npm run db:seed` chạy `db/seed.ts` — **idempotent**, tách khỏi `db/migrations/`, và **không
bao giờ chạy ở prod** (chốt 2026-09-19). Chạy lại nhiều lần (kể cả bằng container ở trên) phải
cho cùng một trạng thái; đó là điều kiện để `SC-007` lặp lại được.

## Kiểm chứng — chạy nguyên văn bốn lệnh của hợp đồng

Không task nào được tự đặt lệnh test riêng (`verification.md`, Constitution §III). Đúng thứ tự
dưới đây — lý do ở phần "Thứ tự bắt buộc" ngay sau:

```bash
npm test              # glue + Jest(api) + Vitest(storefront, packages) — gồm *.int-spec.ts, *.race-spec.ts
npm run lint
npm run build         # Vite build storefront + compile apps/api — TẠO apps/storefront/dist
docker compose -f ops/compose.yaml up -d --build      # api + proxy — xem lý do đặt ở ĐÂY, không phải trước "Dựng và chạy"
npm run test:regression   # npm test + Playwright e2e — cần stack SỐNG THẬT (proxy cổng 80)
```

**Cổng thật không phải exit code.** Output phải cho thấy **nửa sản phẩm đã CHẠY**, không phải
`SKIPPED — no product workspace exists yet`. Đây là lần đầu tiên điều đó đúng trong repo này
(xác nhận lại trên clone sạch, T015 — cả bốn lệnh exit 0, không còn `SKIPPED` ở đâu).

`--build` (không phải `up -d` trần): nếu một image tên `shop-online-api` đã có sẵn trong cache
Docker cục bộ (từ một lần build khác, project name khác nhưng TRÙNG tên `shop-online` — xem
`ops/compose.yaml`), `up -d` trần **âm thầm dùng lại ảnh cũ, không build lại** — không chứng
minh gì về clone hiện tại. `--build` buộc build lại thật từ context của ĐÚNG clone đang đứng.

### Vì sao `docker compose -f ops/compose.yaml up -d --build` (dựng cả stack) nằm SAU `npm run build`, không nằm ở mục "Dựng và chạy" phía trên

`proxy` bind-mount `apps/storefront/dist` (đọc-only). Nếu container này khởi động TRƯỚC khi
`npm run build` từng chạy, Docker tự tạo `apps/storefront/dist` như một thư mục trống **thuộc
sở hữu root** (daemon Docker chạy bằng root) trước khi mount — xác nhận thật trên clone sạch
(`ls -la` ra `drwxr-xr-x root root`). Lúc đó, `npm run build` (chạy bằng user thường) không ghi
được vào thư mục đó nữa: `vite build` báo lỗi `Permission denied` khi tạo
`dist/assets`. Đặt bước `docker compose up -d --build` **sau** `npm run build` (khi
`apps/storefront/dist` đã tồn tại, đã thuộc đúng user host) tránh hẳn xung đột quyền này —
đây là thứ tự đã xác thực chạy sạch trên clone thật (T015).

### Thứ tự bắt buộc giữa "bốn lệnh hợp đồng" và "kịch bản nghiệm thu chạy tay"

`npm test` (và `test:regression`) chạy các test chạm database của T008/T009/T010, và luật cô
lập AD-28 bắt chúng TRUNCATE + tự seed fixture riêng — chạy sau khi đã `db:seed` sẽ **xoá** Sản
phẩm mẫu thật, thay bằng dữ liệu test. Vì vậy, thứ tự bắt buộc là:

1. `db:seed` (mục "Dựng và chạy" ở trên, container-based).
2. Bốn lệnh hợp đồng (mục này).
3. `db:seed` **lại** — đúng lệnh container ở mục "Dựng và chạy", chạy lại — để phục hồi Sản
   phẩm mẫu thật trước khi làm bước 4.
4. Tám kịch bản nghiệm thu chạy tay (mục dưới đây).

Làm ngược thứ tự này sẽ thấy dữ liệu fixture của test, không phải Sản phẩm mẫu, và kịch bản tay
sẽ sai mà không phải lỗi hệ thống. **Lưu ý**: `db/seed.ts` chèn kiểu chỉ-nếu-chưa-có (không
xoá trước khi chèn — quyết định đã chốt từ T005), nên nếu Jest để lại một sản phẩm fixture
riêng (id khác, tên khác) trước khi seed lại, sản phẩm đó **vẫn còn** sau khi seed — nằm SONG
SONG với Sản phẩm mẫu thật, không thay thế nó. Đây là hành vi đã biết (ghi nhận từ T013), không
chặn các kịch bản tay bên dưới vì chúng đều xác định Sản phẩm mẫu qua tên/id của chính nó, không
qua "sản phẩm duy nhất trong hệ thống".

## Kịch bản nghiệm thu chạy tay

Chạy SAU bước 3 ở trên (đã seed lại Sản phẩm mẫu thật).

| # | Làm gì | Mong đợi | Truy về |
|---|---|---|---|
| 1 | Mở `/` | HTTP 200, thấy tên + giá + nhãn tồn kho của Sản phẩm mẫu | FR-001, FR-002, SC-001 |
| 2 | Bấm vào thẻ sản phẩm | Trang chi tiết: tên, mô tả, giá, ảnh, nhãn tồn kho. **Không** nút thêm vào giỏ | FR-003 |
| 3 | Mở `/api/products/999999` | HTTP 404, không stack trace | FR-004 |
| 4 | Đổi giá ở database, tải lại `/` | Giá hiển thị đổi theo | SC-001 |
| 5 | Đặt `quantity = 0`, tải lại | Nhãn "Hết hàng" dạng **chữ**; sản phẩm **vẫn hiện** | FR-005, FR-008 |
| 6 | Đọc toàn bộ thân `/api/products` | **Không có** con số tồn kho ở bất cứ đâu | FR-007, SC-005 |
| 7 | `curl -I /` và `curl -I /admin/` | Cả hai mang đủ CSP + `Referrer-Policy` + `X-Content-Type-Options` | AC-AD29, SC-004 |
| 8 | Đọc header của `/api/products` | `Cache-Control: no-store` | FR-006, AD-20 |

## Kịch bản nghiệm thu bằng test — cái quan trọng nhất

```bash
npm test -- stock-conditional-delta.race-spec.ts
```

**Lưu ý xác nhận ở T015**: `scripts/verify.mjs` (glue, ngoài phạm vi sửa của quickstart) chỉ
đọc `process.argv[2]` làm tên phase (`test`/`lint`/`build`/`e2e`) — nó **không** chuyển tiếp
đối số sau `--` xuống `npm run test` của từng workspace, nên lệnh trên thật ra chạy lại **toàn
bộ** `npm test` (gồm cả file race-spec này). Đây vẫn là lệnh đúng để "dán output" theo hợp đồng
— test tải nằm trong đó và phải xanh; muốn xem RIÊNG một mình nó, chạy thẳng qua Jest, bỏ qua
wrapper:

```bash
cd apps/api && npx jest stock-conditional-delta.race-spec.ts --verbose
```

Với Sản phẩm tồn kho **M**, **N** kết nối độc lập cùng rút 1 đơn vị (N > M, N ≥ 20, M ≥ 5):

- đúng **M** lần thành công, **N − M** lần trả về "0 dòng bị ảnh hưởng" (kết quả hợp lệ, không phải exception)
- `stock.quantity` cuối bằng **0**, không thời điểm nào âm
- chạy lại **≥ 10 lần liên tiếp** trên cùng database, không dựng lại nó → kết quả giống hệt
  (vòng lặp 10 lần này nằm NGAY TRONG một `it()` của chính file test — không cần tự lặp lại lệnh
  shell 10 lần)

Test này chạy trên **trạng thái đã commit**, nhiều kết nối độc lập, dọn bằng `TRUNCATE`.
**Không bao giờ** transaction rollback (AD-28) — cách cô lập đó gộp N tiến trình vào một
transaction, tranh chấp biến mất, và test xanh một cách vô nghĩa.

Một luồng Playwright xanh **không bao giờ** được tính là đã chứng minh tính nguyên tử.

## Ghi chú về `db:seed`

`npm run db:seed` — xem mục "Dựng và chạy" ở trên cho lệnh container-based **bắt buộc** (không
chạy trần trên host). Idempotent, tách khỏi `db/migrations/`, không bao giờ chạy ở prod.
