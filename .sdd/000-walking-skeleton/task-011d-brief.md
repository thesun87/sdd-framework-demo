# Task T011d — Fix cross-cutting: ảnh `api` crash lúc chạy vì thiếu `packages/shared` (Ruling R25)

## Nguồn gốc

Không phải task trong `tasks.md` gốc — fix nhỏ do controller mở, ghi ở
`.sdd/000-walking-skeleton/progress.md` Ruling R25, phát hiện lúc T011c build ảnh `api` THẬT
lần đầu tiên (R23 vừa sửa xong việc `tsc` resolve `'shared'` lúc **build**). Stage `run` của
`ops/api.Dockerfile` chỉ copy `node_modules`, `apps/api/dist`, `apps/api/package.json` —
**không** copy `packages/shared/dist` hay `packages/shared/package.json`. `node_modules/shared`
là **symlink** (npm workspace) trỏ tới `/repo/packages/shared`; thư mục đó không tồn tại trong
stage `run` → container khởi động lỗi `Cannot find module 'shared'`, crash loop thật.

## Objective

`docker compose -f ops/compose.yaml up -d` (cả stack) chạy được thật, `api` healthy, không
crash loop, bằng chính ảnh Docker build ra (không phải chạy tay `node dist/main.js` như các
task trước đã tạm dùng để né lỗ hổng này).

## Requirements

Trong stage `run` của `ops/api.Dockerfile`, thêm **đúng hai dòng** trước `EXPOSE 3000`:
```dockerfile
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
```
**Không đổi gì khác** trong file — không đổi stage `deps`, không đổi stage `build` (đã đúng
sau T011c), không đổi thứ tự các dòng `COPY` hiện có trong stage `run`.

## Scope

**Allowed**
```text
ops/api.Dockerfile   (CHỈ hai dòng COPY trong stage `run`, xem trên)
.sdd/000-walking-skeleton/task-011d-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
ops/api.Dockerfile   — mọi phần KHÁC ngoài stage `run` (stage `deps`/`build` đã đúng)
ops/compose.yaml   ops/Caddyfile   ops/.env.example   ops/api.Dockerfile.dockerignore
db/**   apps/**   packages/**   e2e/**   docs/baseline/**   specs/**   scripts/**   tests/**
package.json (gốc)
```

## Acceptance criteria

- `docker compose -f ops/compose.yaml build api` vẫn thành công (không hồi quy so với T011c).
- `docker compose -f ops/compose.yaml up -d` (cả stack: postgres + api + proxy) — `api`
  **healthy**, không crash loop. Dán `docker compose ps` và `docker compose logs api` (vài
  dòng khởi động sạch, không stack trace `Cannot find module`) — bằng chứng thật.
- `npm run db:migrate && npm run db:seed` chạy qua stack thật (không phải chạy tay).
- `curl -sI http://localhost/images/ca-phe-sua-da.jpg` → 200, đủ ba header AD-29.
- `curl -s http://localhost/api/products | jq` trả đúng Sản phẩm mẫu qua API thật (không phải
  container thủ công).
- Bốn test T010 vẫn xanh; `npm test`, `npm run lint`, `npm run build` exit 0.
- Dừng và dọn container test riêng của bạn sau khi xong (giữ `postgres` chạy nếu nó là dịch vụ
  dùng chung đang phục vụ các task khác — kiểm bằng `docker compose ps` trước khi dừng gì).

## Verification commands

```bash
docker compose -f ops/compose.yaml build api
docker compose -f ops/compose.yaml up -d
docker compose -f ops/compose.yaml ps
docker compose -f ops/compose.yaml logs api --tail 30
npm run db:migrate && npm run db:seed
curl -sI http://localhost/images/ca-phe-sua-da.jpg
curl -s http://localhost/api/products | jq
npm test && npm run lint && npm run build
```

## Dependencies

T002 (compose) · T011b (route ảnh) · T011c (build `packages/shared` lúc build ảnh — đã đóng
gói xong nửa build, nửa run là việc của task này).

## Previous task outputs

`.sdd/000-walking-skeleton/task-011c-report.md` — mô tả chi tiết lỗi crash loop hiện tại
(log thật, dòng lỗi chính xác) để bạn đối chiếu sau khi sửa.
