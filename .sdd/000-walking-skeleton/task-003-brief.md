# Task T003 — `ops/Caddyfile`: một origin, SPA fallback, header an toàn cho CẢ HAI đường dẫn

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T003**, `tasks.md` §Phase 1
- **Owns**: `AC-AD29` (header an toàn hạ cánh **trong** feature 000, trước mọi bề mặt)
- Spec: `spec.md` User Story 3 + `AC-AD29`; kịch bản nghiệm thu 1–5 của US3
- Contract: `specs/000-walking-skeleton/contracts/storefront-http.md` §Hợp đồng của reverse proxy
- Architecture: `docs/baseline/architecture.md` AD-8 (một origin), AD-29 (header), AD-9

## Objective

Reverse proxy Caddy phục vụ một origin duy nhất và phát **đủ** header an toàn cho **cả đường
dẫn bán hàng lẫn đường dẫn quản trị**, ngay bây giờ, dù `/admin/*` chưa có bundle nào phía sau.
AD-29: *"một bề mặt tồn tại trước lớp phòng thủ của nó là một cửa sổ không ai đóng lại."*

## Requirements

1. **Định tuyến** — đúng ba luật, theo `contracts/storefront-http.md`:

   | Đường dẫn | Hành vi |
   |---|---|
   | `/api/*` | chuyển tới dịch vụ `api` (NestJS). **KHÔNG BAO GIỜ** rơi vào SPA fallback |
   | `/admin/*` | ở `000` chưa có bundle — trả về gì cũng được (404 là hợp lý), nhưng **vẫn phải mang đủ header an toàn** |
   | còn lại | tệp tĩnh của `storefront`; không khớp tệp nào thì trả `index.html` của `storefront` |

   Thứ tự matcher phải khiến `/api/*` **không thể** rơi xuống fallback, kể cả khi API trả 404.
   Đây là edge case ghi thẳng trong `spec.md` §Edge Cases.

2. **Header — phát cho MỌI phản hồi, cả hai đường dẫn**, nguyên văn theo contract:
   ```text
   Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
                            base-uri 'self'; frame-ancestors 'none'; connect-src 'self';
                            style-src 'self' 'unsafe-inline'
   Referrer-Policy: same-origin
   X-Content-Type-Options: nosniff
   ```
   - `script-src` **không** `'unsafe-inline'`, **không** `'unsafe-eval'`, **không** nguồn CDN.
   - `'unsafe-inline'` chỉ được xuất hiện ở `style-src`, không ở directive nào khác.
   - Nới lỏng bất kỳ directive nào là thay đổi trên nhánh `baseline/*`, **không phải** quyết
     định trong task này. Nếu bạn tin rằng cần nới, DỪNG và báo xung đột.
   - Header phải đi kèm **cả** phản hồi lỗi (404 của `/admin/*`), không chỉ phản hồi 200.
     Nhiều cấu hình Caddy đặt header trong một route và mất nó ở đường lỗi — kiểm điều này.

3. **`Cache-Control`** của `/api/*` **không** do proxy đặt — API tự đặt `no-store` (T010/T011
   sở hữu). Đừng ghi đè, đừng thêm cache ở proxy cho `/api/*`.

4. **Giữ file đọc được**: Caddyfile là hợp đồng an ninh mà người sẽ đọc lại. Một khối
   `header` dùng chung, không lặp ba lần cùng một danh sách directive.

## Architecture decisions ràng buộc task này

- **AD-29** — nội dung header ở trên là nguyên văn baseline. Không thêm, không bớt directive.
- **AD-8** — một origin cho cả bán hàng và quản trị. Rủi ro của quyết định đó **chính là** lý
  do CSP phải chặt.
- **AD-9** — hai bundle riêng. `/admin/*` ở `000` không trỏ vào bundle nào; khi `006` cắm
  bundle vào, nó **không được phép và không cần** đặt lại lớp phòng thủ này.

## Scope

**Allowed**
```text
ops/Caddyfile
.sdd/000-walking-skeleton/task-003-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
ops/compose.yaml  (T002 sở hữu)   ops/api.Dockerfile   ops/.env.example
apps/**   packages/**   e2e/**   db/**   docs/baseline/**   specs/**   scripts/**   tests/**
```

## Acceptance criteria của task

- `caddy validate --config ops/Caddyfile` (hoặc `docker run --rm -v ...:/etc/caddy/Caddyfile
  caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile`) exit 0.
- Chạy proxy với một backend giả (hoặc không có backend) và kiểm bằng `curl -sI`:
  - `curl -sI http://localhost:<port>/` → có đủ ba header.
  - `curl -sI http://localhost:<port>/admin/` → **cũng** có đủ ba header, dù status là 404.
  - `curl -sI http://localhost:<port>/api/products` → không rơi vào `index.html`
    (khi không có backend, một 502/503 là bằng chứng đúng: nó **đã** cố proxy, không fallback).
- `grep -n "unsafe-inline" ops/Caddyfile` chỉ khớp ở `style-src`.
- `grep -nE "unsafe-eval|https://cdn|http://cdn" ops/Caddyfile` không khớp gì.
- Ghi vào report **output curl thật**, không phải mô tả. SC-004 sẽ được T013 kiểm lại bằng
  Playwright; report của bạn là bằng chứng đầu tiên.

## Verification commands

```bash
docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile
# rồi dựng proxy và curl như trên
npm test && npm run lint
```

## Dependencies

T001 (thư mục `ops/`). T002 chạy song song được — nhưng **không** sửa file của nó.

## Previous task outputs

T002 tạo `ops/compose.yaml` với dịch vụ `proxy` mount file bạn viết vào
`/etc/caddy/Caddyfile`, backend tên `api`, cổng lấy từ `API_PORT`, và mount
`apps/storefront/dist` cho tệp tĩnh. Đọc `ops/compose.yaml` để lấy đúng tên host và cổng.
