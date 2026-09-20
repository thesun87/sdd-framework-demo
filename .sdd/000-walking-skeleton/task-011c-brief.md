# Task T011c — Fix cross-cutting: build `api` thật + tệp ảnh thật cho seed (Ruling R23)

## Nguồn gốc

Không phải task trong `tasks.md` gốc — fix nhỏ do controller mở, ghi ở
`.sdd/000-walking-skeleton/progress.md` Ruling R23, phát hiện lúc T011b kiểm chứng đầu-cuối.
Hai lỗ hổng, cả hai chặn T015 (SC-006/SC-007 đòi `docker compose up` cả stack và dựng lại từ
clone sạch tái tạo được kết quả):

**(a) Ảnh Docker `api` chưa từng build được.** `ops/api.Dockerfile` copy toàn bộ mã nguồn
(`COPY . .`) rồi chạy `npm run build --workspace=apps/api`, nhưng **không bao giờ build
`packages/shared` trước** — `apps/api` import `'shared'`, và workspace symlink trỏ tới
`packages/shared/` chỉ có tác dụng nếu `packages/shared/dist/` đã tồn tại (gói này export
qua `dist`, không qua `src`). Kết quả: `tsc` trong stage `build` không resolve được `'shared'`,
`docker compose build api` lỗi — luôn luôn, kể từ khi `packages/shared` (T006) và `apps/api`
imports nó (T011) tồn tại.

**(b) Không tệp ảnh thật nào từng được ghi vào volume `product-images`.** `db/seed.ts` (T005)
chỉ chèn dòng `product_image` vào database, không bao giờ ghi byte ảnh ra đĩa. Trên một clone
sạch, `product_image.path` trỏ tới tệp không tồn tại → route ảnh (T011b, đã đúng) trả 404 dù
mọi thứ khác đúng. SC-001 đòi thấy **ảnh thật**.

## Objective

`docker compose -f ops/compose.yaml build api` thành công thật; sau `db:seed`, ảnh sản phẩm
mẫu tồn tại thật trên đĩa tại đúng đường dẫn database đã ghi.

## Requirements

### (a) `ops/api.Dockerfile`

Trong stage `build`, **trước** `RUN npm run build --workspace=apps/api`, thêm:
```dockerfile
RUN npm run build --workspace=packages/shared
```
Đặt sau `COPY . .` (đã có) — `packages/shared` cần mã nguồn thật để build. **Không** đổi thứ
tự `COPY . .` / `COPY --from=deps .../node_modules` đã có (comment trong file giải thích rõ
vì sao thứ tự đó không được đảo). **Không** đổi stage `deps` hay `run`. Nếu `apps/api` sau
này còn import `packages/ui`, ghi một dòng TODO — **không** tự thêm build cho `packages/ui`
ở task này (chưa cần, `apps/api` hiện không import nó).

### (b) Tệp ảnh thật + seed ghi nó ra đĩa

1. Thêm **một** tệp ảnh JPEG nhỏ (vài KB, ảnh placeholder hợp lệ — không cần đẹp, chỉ cần là
   JPEG thật mở được) vào repo tại **`db/assets/ca-phe-sua-da.jpg`**. Đây là tài sản tĩnh đi
   kèm mã nguồn, không phải dữ liệu người dùng.
2. Sửa `db/seed.ts`: sau khi chèn dòng `product_image` (path đã có sẵn, ví dụ
   `${PRODUCT_IMAGE_PATH}/ca-phe-sua-da.jpg`), **copy nội dung** `db/assets/ca-phe-sua-da.jpg`
   ra đúng đường dẫn đó trên đĩa (`fs.copyFile` hoặc tương đương), tạo thư mục cha nếu chưa có
   (`fs.mkdir(..., { recursive: true })`). **Idempotent**: ghi đè an toàn nếu tệp đã tồn tại,
   không lỗi, không nhân bản.
3. **Không** đổi cột `path` hay bất kỳ hành vi ghi database nào khác của `db/seed.ts` — chỉ
   thêm bước ghi tệp, sau bước ghi database, trong cùng lần chạy `db:seed`.

## Architecture decisions ràng buộc

- **AD-15** — ảnh trên hệ tệp, không blob. Việc ghi tệp thật ở đây **hiện thực hoá** đúng
  quyết định đó, không phải ngoại lệ.
- **Ruling R23** — hai phần (a)/(b) độc lập, không phần nào phụ thuộc phần kia; có thể làm
  theo thứ tự bất kỳ.

## Scope

**Allowed**
```text
ops/api.Dockerfile          (CHỈ thêm đúng một dòng RUN, xem trên)
db/seed.ts                  db/assets/ca-phe-sua-da.jpg  (tệp MỚI)
.sdd/000-walking-skeleton/task-011c-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
ops/compose.yaml   ops/Caddyfile   ops/.env.example   ops/api.Dockerfile.dockerignore
db/migrations/**   db/schema/**   db/drizzle.config.ts
apps/**   packages/**   e2e/**   docs/baseline/**   specs/**   scripts/**   tests/**
package.json (gốc)
```

## Acceptance criteria

- `docker compose -f ops/compose.yaml build api` **thành công thật, exit 0** — dán output
  đầy đủ (không cắt bớt phần lỗi cũ để so sánh trước/sau).
- `docker compose -f ops/compose.yaml up -d` (cả stack) thành công; `docker compose ps` cho
  thấy `api` healthy/running bằng chính ảnh vừa build (không phải chạy tay `node dist/main.js`
  như T011b đã làm tạm).
- Sau `npm run db:migrate && npm run db:seed`: tệp thật tồn tại tại đường dẫn
  `product_image.path` đã ghi trong database — dán `ls -la` hoặc tương đương bên trong
  container/volume.
- `curl -sI http://localhost/images/ca-phe-sua-da.jpg` (qua stack vừa dựng bằng ảnh build
  thật, không phải container tạm) → 200, `Content-Type` ảnh đúng, đủ ba header AD-29.
- Chạy `npm run db:seed` **lần thứ hai**: không lỗi, tệp không nhân bản, database không đổi
  số dòng (đúng tính chất idempotent đã có từ T005).
- Bốn test T010 (đã đóng) vẫn xanh (`npx jest src/modules/catalog` từ `apps/api`).
- `npm test`, `npm run lint`, `npm run build` (từ gốc repo) exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml build api
docker compose -f ops/compose.yaml up -d
npm run db:migrate && npm run db:seed
curl -sI http://localhost/images/ca-phe-sua-da.jpg
npm run db:seed   # lần hai, kiểm idempotent
npm test && npm run lint && npm run build
```

## Dependencies

T002 (compose, volume) · T003/T011b (Caddyfile, route `/images/*`) · T005 (seed) ·
T006 (`packages/shared`) · T011 (catalog, đóng gói `apps/api`). Tất cả đã đóng.

## Previous task outputs

- `.sdd/000-walking-skeleton/task-011b-report.md` — cách xác minh route ảnh khi ảnh `api`
  chưa build được (container thủ công); task này thay thế cách đó bằng ảnh build thật.
- `.sdd/000-walking-skeleton/task-005-report.md` — cấu trúc hiện tại của `db/seed.ts`.
