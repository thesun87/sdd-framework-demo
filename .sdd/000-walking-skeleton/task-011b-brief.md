# Task T011b — Fix cross-cutting: phục vụ ảnh sản phẩm qua HTTP (controller phát hiện lúc T012)

## Nguồn gốc

Không phải task trong `tasks.md` gốc — đây là fix nhỏ do controller mở, ghi ở
`.sdd/000-walking-skeleton/progress.md` Ruling R22, để `/speckit-converge` truy vết được.
Lý do: `product_image.path` lưu **đường dẫn trên đĩa** (đúng AD-15), nhưng API (T011) trả
nguyên văn giá trị đó làm `imagePath`/`images[].path`, trong khi hợp đồng
(`contracts/storefront-http.md`) thể hiện hình dạng đó là **URL** (`"/images/…"`). Không route
nào trong `ops/Caddyfile` phục vụ tệp tĩnh từ `PRODUCT_IMAGE_PATH`. Kết quả: `<img src>` của
storefront (T012, đã đúng theo hợp đồng nó nhận) trỏ tới một đường dẫn trình duyệt không bao
giờ tải được — rơi vào SPA fallback, trả `index.html`, không phải ảnh. SC-001/FR-001 đòi thấy
**ảnh thật** ở cả hai trang; đây là lỗ hổng chặn tiêu chí đó.

## Objective

Ảnh sản phẩm tải được qua trình duyệt thật, qua đúng một origin (AD-8), không đổi cột dữ liệu
(`product_image.path` vẫn là đường dẫn đĩa — đúng AD-15).

## Requirements

1. **`ops/Caddyfile`** — thêm route phục vụ tệp tĩnh cho `/images/*`, đọc từ volume
   `product-images` đã mount sẵn ở dịch vụ `proxy` (`ops/compose.yaml`, tại
   `${PRODUCT_IMAGE_PATH:-/data/product-images}`, đã mount **read-only**). Route này đặt
   **trước** nhánh SPA fallback, và **sau** `@api`/`@admin` (thứ tự không quan trọng với hai
   nhánh đó vì path prefix khác nhau, nhưng đặt gần nhánh tệp tĩnh cho dễ đọc). Dùng
   `file_server` với `root` trỏ vào thư mục mount, `uri strip_prefix /images` (hoặc tương
   đương) để `/images/ca-phe-sua-da.jpg` map tới `<mount>/ca-phe-sua-da.jpg`.
   **Không đổi** bất kỳ directive header nào — route mới vẫn nằm dưới `import security_headers`
   đã có ở đầu site block (áp dụng vô điều kiện, không cần lặp lại).
2. **`apps/api/src/modules/catalog/**`** — ánh xạ `product_image.path` (đường dẫn đĩa, ví dụ
   `/data/product-images/ca-phe-sua-da.jpg`) thành URL `/images/<tên tệp>` (`ca-phe-sua-da.jpg`
   = `path.basename` của cột) ở **cả hai** nơi hình dạng này xuất hiện: `imagePath` của
   `GET /api/products` và `images[].path` của `GET /api/products/:id`. Đây là việc của tầng
   trình bày (service/controller), **không** đổi giá trị lưu trong database, **không** đổi
   schema Drizzle của T004.
3. **Không** phụ thuộc vào cấu trúc thư mục con trong `PRODUCT_IMAGE_PATH` — nếu `path` có
   thư mục con, giữ nguyên phần sau `PRODUCT_IMAGE_PATH` khi map sang URL (không chỉ lấy
   basename nếu ảnh thật có thể nằm trong thư mục con sau này). Cách an toàn: URL =
   `/images` + phần đường dẫn còn lại sau khi bỏ tiền tố `PRODUCT_IMAGE_PATH` khỏi `path`.

## Architecture decisions ràng buộc

- **AD-15** — ảnh trên hệ tệp, không blob. Cột `path` giữ nguyên là đường dẫn đĩa.
- **AD-8** — một origin: ảnh phục vụ qua CHÍNH proxy đang phục vụ storefront/API, không CDN,
  không origin thứ hai.
- **AD-29** — header an toàn áp dụng vô điều kiện; route mới không được đặt ngoài phạm vi
  `import security_headers` của site block.

## Scope

**Allowed**
```text
ops/Caddyfile
apps/api/src/modules/catalog/**   (chỉ tầng ánh xạ URL ảnh — không đổi hành vi khác)
.sdd/000-walking-skeleton/task-011b-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
ops/compose.yaml   ops/api.Dockerfile   ops/.env.example   (đã đóng, không cần sửa cho fix này)
db/**  (không đổi schema/seed)
apps/api/src/modules/stock/**   apps/storefront/**   packages/**   e2e/**
docs/baseline/**   specs/**   scripts/**   tests/**   package.json (gốc)
apps/api/src/modules/catalog/*-spec.ts  và  catalog-test-support.ts   (T010 sở hữu — không sửa)
```

## Acceptance criteria

- `caddy validate` (image `caddy:2.11.4` đã pin) exit 0 với Caddyfile mới.
- Dựng thật (`docker compose -f ops/compose.yaml up -d`, sau `db:migrate`/`db:seed`):
  `curl -sI http://localhost/images/ca-phe-sua-da.jpg` trả **200** với `Content-Type` ảnh
  đúng, VÀ mang đủ ba header an toàn (AD-29) — dán output thật.
- `curl -s http://localhost/api/products | jq` cho thấy `imagePath` là `/images/...`, KHÔNG
  còn là đường dẫn tuyệt đối trên đĩa — dán output thật.
- `curl -s http://localhost/api/products/1 | jq '.images'` tương tự cho `images[].path`.
- Bốn test T010 (đã đóng) vẫn xanh — chúng không kiểm giá trị cụ thể của `imagePath`/`path`
  (chỉ kiểm hình dạng qua schema), nên việc đổi giá trị không được phá chúng; xác nhận bằng
  `npm test` scoped `apps/api`.
- `npm run lint`, `npm run build` exit 0 cho `apps/api`.
- `product_image.path` trong database **không đổi** — vẫn là đường dẫn đĩa (kiểm bằng
  `SELECT path FROM product_image`).

## Verification commands

```bash
docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile
docker compose -f ops/compose.yaml up -d
npm run db:migrate && npm run db:seed
curl -sI http://localhost/images/ca-phe-sua-da.jpg
curl -s http://localhost/api/products | jq
npm test && npm run lint && npm run build
```

## Dependencies

T002 (volume `product-images` đã mount vào `proxy`) · T003 (Caddyfile) · T011 (catalog).
Tất cả đã đóng — đây là fix bổ sung sau khi phát hiện.

## Previous task outputs

`ops/compose.yaml`: dịch vụ `proxy` mount `product-images:${PRODUCT_IMAGE_PATH:-/data/product-images}:ro`.
`db/seed.ts` (T005): tạo `product_image.path = ${PRODUCT_IMAGE_PATH}/ca-phe-sua-da.jpg`.
Đọc `.sdd/000-walking-skeleton/task-011-report.md` để biết cấu trúc `catalog.repository.ts`
hiện tại — chỗ bạn cần sửa là nơi nó `SELECT`/trả `path`.
