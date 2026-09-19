# Task T002 — `ops/compose.yaml`: postgres + api + proxy

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T002**, `tasks.md` §Phase 1
- **Owns**: `AC-AD27` (mọi test chạm tồn kho chạy trên PostgreSQL thật, cùng dòng phiên bản với prod)
- Spec: `spec.md` §Ràng buộc bắt buộc từ baseline → `AC-AD27`, `AC-AD28`
- Plan: `plan.md` §Technical Context (Storage, Target Platform), §Project Structure
- Architecture: `docs/baseline/architecture.md` AD-16, AD-27, AD-28, §Consistency (Cấu hình, Database cho test)

## Objective

Một `docker compose` mô tả toàn bộ hệ thống chạy được trên **một VPS, một origin**: PostgreSQL
18.6 thật, API NestJS, và reverse proxy Caddy 2.11.4. Dịch vụ `postgres` là **dịch vụ dùng
chung cho cả chạy thật lẫn test**, không dựng lại mỗi lần chạy.

## Requirements

1. **`ops/compose.yaml`** với đúng ba dịch vụ:
   - **`postgres`** — ảnh pin theo tag **`postgres:18.6`** (không `18`, không `latest`).
     Volume dữ liệu có tên (named volume) để dữ liệu sống qua `compose down`;
     `healthcheck` bằng `pg_isready`. Cổng publish ra host để Jest chạy từ ngoài container
     nối vào được (test chạy trên host, database trong container).
   - **`api`** — build từ **`ops/api.Dockerfile`** với build context là **gốc repo**
     (xem Ruling R5 bên dưới). `depends_on: postgres` với `condition: service_healthy`.
     Không publish cổng ra host: chỉ `proxy` nói chuyện với nó.
   - **`proxy`** — ảnh pin theo tag **`caddy:2.11.4`** (không `2`, không `latest`).
     Mount `ops/Caddyfile` (file của T003 — **không** tạo nó ở task này) và mount thư mục
     build của storefront (`apps/storefront/dist`) để phục vụ tệp tĩnh.
     Publish cổng HTTP ra host. `depends_on: api`.
   - **Volume ảnh sản phẩm**: một named volume mount vào `api` (và vào `proxy` nếu Caddy phục
     vụ ảnh trực tiếp), tại đường dẫn lấy từ biến `PRODUCT_IMAGE_PATH`. AD-15: ảnh nằm trên
     hệ tệp, không phải blob trong database.
2. **`ops/api.Dockerfile`** — Dockerfile của `apps/api`, đặt ở `ops/` (Ruling R5). Node pin
   theo tag chính xác trên dòng `24` (ví dụ `node:24.21.0-bookworm-slim`, **không** `node:24`,
   **không** `node:lts`). Multi-stage: cài deps → build → chạy. Ở `000` mã nguồn `apps/api`
   **chưa tồn tại**; Dockerfile phải **đúng về hình dạng** và được validate bằng
   `docker compose config`, nhưng **không cần build thành công hôm nay** — T011 và T015 là
   nơi nó thực sự chạy. Ghi một dòng chú thích nói đúng điều đó.
3. **`ops/.env.example`** — bản kê **duy nhất** của cấu hình triển khai. Tên biến đã chốt
   (Ruling R4), không được đặt tên khác:
   ```text
   DATABASE_URL        # chuỗi kết nối PostgreSQL đầy đủ, ví dụ postgres://app:app@localhost:5432/shop
   API_PORT            # cổng NestJS lắng nghe bên trong mạng compose
   NODE_ENV            # development | production
   PRODUCT_IMAGE_PATH  # đường dẫn thư mục ảnh sản phẩm trên volume
   ```
   Kèm giá trị mẫu chạy được ngay cho máy dev. Không commit `.env` thật.
4. **AD-28 — kỷ luật cô lập test** phải đọc được từ chính file compose: một comment ngắn
   ghi rằng `postgres` là dịch vụ **dùng chung, không dựng lại mỗi lần chạy**, và rằng test
   tranh chấp dọn bằng `TRUNCATE` chứ không bao giờ bằng transaction rollback. Không tạo
   dịch vụ database thứ hai "cho test" — đó chính là thứ AD-27 cấm.

## Architecture decisions ràng buộc task này

- **AD-27** — PostgreSQL thật, **cùng major với prod**. Không `pg-mem`, không SQLite, không
  repository giả cho đường chạm dữ liệu. Một dịch vụ database, dùng cho cả hai mục đích.
- **AD-28** — dịch vụ dùng chung, không dựng lại mỗi lần chạy; mọi test phải chạy lại được
  nhiều lần trên nó.
- **AD-16** — phụ thuộc runtime **chỉ** PostgreSQL + hệ tệp cục bộ. Không thêm Redis, không
  message broker, không dịch vụ thứ tư. Thêm một dịch vụ là đổi kiến trúc — nếu thấy cần, DỪNG.
- **AD-8** — một origin. Chỉ `proxy` publish cổng HTTP.
- **Constitution §VI** — mọi ảnh pin theo tag chính xác.

## Rulings của controller áp cho task này (`.sdd/000-walking-skeleton/progress.md`)

- **R4** — tên biến môi trường chốt tại task này: `DATABASE_URL`, `API_PORT`, `NODE_ENV`,
  `PRODUCT_IMAGE_PATH`. Sáu task sau tiêu thụ đúng bốn tên này.
- **R5** — Dockerfile của api thuộc `ops/api.Dockerfile`, build context là gốc repo, vì T002
  bị cấm chạm `apps/**` và không task nào khác sở hữu file này.

## Scope

**Allowed**
```text
ops/compose.yaml    ops/.env.example    ops/api.Dockerfile
.sdd/000-walking-skeleton/task-002-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/**   packages/**   db/**   e2e/**   ops/Caddyfile  (T003 sở hữu)
docs/baseline/**   .specify/**   _bmad/**   specs/**   scripts/**   tests/**   package.json
```

## Acceptance criteria của task

- `docker compose -f ops/compose.yaml config` exit 0 và in ra ba dịch vụ.
- `docker compose -f ops/compose.yaml up -d postgres` khởi động được; `pg_isready` trong
  container trả lời lành mạnh; `docker compose -f ops/compose.yaml down` rồi `up -d postgres`
  lại **giữ nguyên dữ liệu** (chứng minh named volume hoạt động).
- `grep -nE 'image:.*(latest|:2$|:18$)' ops/compose.yaml` không khớp gì.
- `ops/.env.example` chứa đúng bốn biến của R4, không thừa, không thiếu.
- Bốn lệnh hợp đồng vẫn exit 0 (task này không đụng mã, nhưng đừng để nó gãy).

## Verification commands

```bash
docker compose -f ops/compose.yaml config
docker compose -f ops/compose.yaml up -d postgres
docker compose -f ops/compose.yaml ps
npm test && npm run lint && npm run build
```

## Dependencies

T001 (thư mục `ops/` đã tồn tại). `ops/Caddyfile` **chưa** tồn tại khi bạn chạy — compose
tham chiếu nó là đúng; T003 tạo nó ngay sau bạn.

## Previous task outputs

T001 đã dựng workspaces và pin phiên bản ở `package.json` gốc. Xem
`.sdd/000-walking-skeleton/task-001-report.md` nếu cần biết cây thư mục thực tế.
