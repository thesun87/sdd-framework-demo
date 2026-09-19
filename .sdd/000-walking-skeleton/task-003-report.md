# Báo cáo T003 — `ops/Caddyfile`

## Đã làm gì

Tạo `ops/Caddyfile` (file mới, chưa tồn tại trước đó — đúng như ghi chú trong `ops/compose.yaml`).
Một site block `:80` với ba route loại trừ lẫn nhau theo thứ tự khai báo:

1. `handle /api/*` → `reverse_proxy api:3000`. Cổng `3000` lấy từ giá trị thật của biến
   `API_PORT` trong `ops/.env.example`, ghi cứng thay vì dùng cú pháp `{$API_PORT}` — vì
   `ops/compose.yaml` (T002, không sửa) không đưa biến này vào container `proxy` (không có
   `environment:`/`env_file:` cho service đó), nên `{$API_PORT}` sẽ rỗng lúc Caddy khởi động.
   Đứng trước route tĩnh trong Caddyfile nên `/api/*` không thể rơi xuống SPA fallback.
2. `handle /admin/*` → `respond 404`. Chưa có bundle admin ở `000`, nhưng vẫn nằm dưới
   `import security_headers` ở top-level site block nên vẫn mang đủ header.
3. `handle` (còn lại) → `root * /srv/storefront; try_files {path} /index.html; file_server`.

Header an toàn gói trong snippet dùng chung `(security_headers)`, import một lần ở top-level
của site block (không lặp trong từng `handle`) — do vậy áp dụng cho MỌI nhánh, kể cả nhánh
lỗi (404, 502). Nội dung header nguyên văn theo `contracts/storefront-http.md` / AD-29, không
thêm/bớt directive:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
                          base-uri 'self'; frame-ancestors 'none'; connect-src 'self';
                          style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
X-Content-Type-Options: nosniff
```

Cache-Control không đặt ở proxy cho `/api/*` — để nguyên cho API tự đặt `no-store` (T010/T011).

Thêm `{ admin off }` (global option) để tắt Caddy admin API trong container — giảm bề mặt
tấn công, không thuộc yêu cầu bắt buộc của brief nhưng không đổi hành vi định tuyến/header.

## Lệnh đã chạy + output thật

### 1. Validate config với image đã pin

```
$ docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile
{"level":"info",...,"msg":"using config from file","file":"/etc/caddy/Caddyfile"}
{"level":"info",...,"msg":"adapted config to JSON","adapter":"caddyfile"}
{"level":"warn",...,"msg":"server is listening only on the HTTP port, so no automatic HTTPS will be applied to this server",...}
{"level":"info",...,"msg":"started background certificate maintenance",...}
{"level":"info",...,"msg":"stopped background certificate maintenance",...}
{"level":"info",...,"msg":"servers shutting down with eternal grace period"}
Valid configuration
```
Exit 0. (Lần chạy đầu có warning "Caddyfile input is not formatted" do một dòng trống thừa
trước block `{ admin off }` — đã sửa và chạy `caddy fmt` để xác nhận không còn khác biệt.)

### 2. Dựng proxy độc lập (không dùng `docker compose` — `api` chưa có source nên build sẽ
   fail; không đụng tới container `postgres` của T002 đang chạy)

```
$ docker run -d --name t003-proxy-test \
    -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" \
    -v "$PWD/apps/storefront/dist:/srv/storefront:ro" \
    -p 8180:80 \
    caddy:2.11.4
```
Container lên khỏe, log không có lỗi (`"msg":"serving initial configuration"`).

### 3. curl ba đường dẫn

```
$ curl -sI http://localhost:8180/
HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 321
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Content-Type: text/html; charset=utf-8
Etag: "dljczo743egj8x"
Last-Modified: Sat, 19 Sep 2026 14:22:45 GMT
Referrer-Policy: same-origin
Server: Caddy
Vary: Accept-Encoding
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:31:17 GMT

$ curl -sI http://localhost:8180/admin/
HTTP/1.1 404 Not Found
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:31:17 GMT

$ curl -sI http://localhost:8180/api/products
HTTP/1.1 502 Bad Gateway
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:31:20 GMT
```

`/admin/` → 404 nhưng vẫn mang đủ ba header (chính là phần "nhiều cấu hình Caddy làm sai" mà
brief cảnh báo — chứng minh bằng `header` đặt ở top-level site block, không lồng trong từng
`handle`, nên áp dụng cả cho nhánh lỗi).

`/api/products` → 502 Bad Gateway (không có backend `api` sống, đúng như acceptance criteria
dự đoán) — chứng minh Caddy ĐÃ cố `reverse_proxy`, không rơi vào SPA fallback. Kiểm thêm body:

```
$ curl -s http://localhost:8180/api/products    → rỗng (không phải nội dung index.html)
$ curl -s http://localhost:8180/admin/          → rỗng (404 thuần, không phải index.html)
```

Dọn dẹp: `docker stop t003-proxy-test && docker rm t003-proxy-test`. Container `postgres`
của T002 (`shop-online-postgres-1`) không bị đụng vào, vẫn `Up ... (healthy)`.

### 4. grep kiểm CSP

```
$ grep -n "unsafe-inline" ops/Caddyfile
22:# 'unsafe-inline' CHỈ xuất hiện ở style-src (nhượng bộ baseline cho style nội tuyến của
26:		Content-Security-Policy "...; style-src 'self' 'unsafe-inline'"
```
Cả hai khớp đều nằm trong ngữ cảnh `style-src` (một là comment giải thích, một là directive
thật) — không có khớp nào ở `script-src` hay directive khác.

```
$ grep -nE "unsafe-eval|https://cdn|http://cdn" ops/Caddyfile
(không khớp gì)
```

## Tự review

- Ba directive bắt buộc (`Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`)
  có mặt nguyên văn, đúng dấu chấm phẩy/khoảng trắng theo contract.
- `'unsafe-inline'` chỉ ở `style-src`. Không có `'unsafe-eval'`, không có nguồn CDN nào.
- Không lặp danh sách header ba lần — dùng snippet `(security_headers)` import một lần ở
  top-level site block, áp dụng cho toàn bộ ba nhánh `handle`.
- `/api/*` đứng trước route tĩnh và dùng `handle` (loại trừ lẫn nhau) nên không thể rơi vào
  fallback dù backend trả gì.
- Không đặt `Cache-Control` cho `/api/*` ở proxy — để nguyên cho API (T010/T011, AD-20).
- Không đụng `ops/compose.yaml`, `ops/api.Dockerfile`, `ops/.env.example` hay bất kỳ file nào
  ngoài `ops/Caddyfile` + report này.
- `caddy fmt` xác nhận file đã đúng định dạng chuẩn của Caddy (không còn khác biệt).

## Mối lo ngại

- Cổng `3000` cho `reverse_proxy api:3000` là **ghi cứng**, không phải `{$API_PORT}`, vì
  `ops/compose.yaml` (T002, không được sửa) không truyền biến `API_PORT` vào container
  `proxy`. Nếu `API_PORT` trong `ops/.env.example` đổi giá trị sau này, `ops/Caddyfile` sẽ
  không tự đồng bộ theo — đây là hệ quả của ranh giới scope giữa T002 và T003, không phải
  điều tôi có thể tự sửa (sửa `ops/compose.yaml` để bơm `API_PORT` vào `proxy` là ngoài scope
  cho phép của task này). Nếu đây là vấn đề, cần một task/ruling riêng để T002 truyền biến
  môi trường đó vào service `proxy`.
- Không kiểm được hành vi thật với backend `api` sống (chưa có source, đúng như context đã
  nêu) — 502 Bad Gateway là bằng chứng đúng theo brief, nhưng chưa phải bằng chứng end-to-end
  với API thật. Việc đó thuộc T013 (Playwright) theo brief.

---

## Fix theo ruling R14 (sau review lần 1)

### Vấn đề

Bản đầu ghi cứng `reverse_proxy api:3000` vì `ops/compose.yaml` (T002, forbidden) không bơm
`API_PORT` vào container `proxy`. Ruling R14 của controller: fix vẫn nằm trong file của tôi —
dùng placeholder Caddy có giá trị mặc định thay vì ghi cứng, để khi một task sau này bơm biến
đó vào service `proxy`, Caddyfile tự đúng mà không cần sửa chéo task; việc bơm biến vào compose
bị hoãn và đã ghi vào ledger.

### Thay đổi

`ops/Caddyfile`:
```diff
- reverse_proxy api:3000
+ reverse_proxy api:{$API_PORT:3000}
```
Và cập nhật comment phía trên `{ admin off }` để nêu rõ: nguồn giá trị mặc định là
`ops/.env.example` (`API_PORT=3000`), service `proxy` hiện chưa nhận biến `API_PORT` (T002
chưa bơm), việc này bị hoãn có chủ đích và đã ghi vào ledger (R14) — không phải sơ suất.

### Lệnh đã chạy + output thật

**1. `caddy fmt` — xác nhận không lệch định dạng:**
```
$ docker run --rm -v "$PWD/ops:/work" -w /work caddy:2.11.4 caddy fmt Caddyfile | diff -u ops/Caddyfile -
fmt diff exit=0
```

**2. `caddy validate` với image đã pin:**
```
$ docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile
{"level":"info",...,"msg":"using config from file","file":"/etc/caddy/Caddyfile"}
{"level":"info",...,"msg":"adapted config to JSON","adapter":"caddyfile"}
{"level":"warn",...,"msg":"server is listening only on the HTTP port, so no automatic HTTPS will be applied to this server",...}
{"level":"info",...,"msg":"started background certificate maintenance",...}
Valid configuration
{"level":"info",...,"msg":"servers shutting down with eternal grace period"}
{"level":"info",...,"msg":"stopped background certificate maintenance",...}
```
Exit 0.

**3. Dựng lại proxy độc lập (không có `API_PORT` trong env container — đúng thực tế hôm nay)
   và curl ba đường dẫn:**
```
$ docker run -d --name t003-proxy-test \
    -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" \
    -v "$PWD/apps/storefront/dist:/srv/storefront:ro" \
    -p 8180:80 \
    caddy:2.11.4

$ curl -sI http://localhost:8180/
HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 321
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Content-Type: text/html; charset=utf-8
Etag: "dljczo743egj8x"
Last-Modified: Sat, 19 Sep 2026 14:22:45 GMT
Referrer-Policy: same-origin
Server: Caddy
Vary: Accept-Encoding
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:34:01 GMT

$ curl -sI http://localhost:8180/admin/
HTTP/1.1 404 Not Found
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:34:01 GMT

$ curl -sI http://localhost:8180/api/products
HTTP/1.1 502 Bad Gateway
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:34:04 GMT
```
Vẫn 502 (không có backend sống → đúng, không rơi SPA fallback) và vẫn đủ ba header trên cả
ba đường dẫn — không đổi hành vi so với trước fix, đúng như rationale của R14 dự đoán.

**4. Chứng minh placeholder thật sự sống (không chỉ rơi về default một cách im lặng), bằng
   `caddy adapt` và so sánh giá trị `dial` trong JSON đã adapt khi có/không có `API_PORT`
   trong môi trường của tiến trình chạy `caddy adapt`:**
```
$ docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 \
    caddy adapt --config /etc/caddy/Caddyfile 2>/dev/null | grep -o '"dial":"[^"]*"'
"dial":"api:3000"

$ docker run --rm -e API_PORT=4444 -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 \
    caddy adapt --config /etc/caddy/Caddyfile 2>/dev/null | grep -o '"dial":"[^"]*"'
"dial":"api:4444"
```
Không có `API_PORT` → rơi về mặc định `3000` (đúng hành vi hôm nay, không tệ hơn bản ghi
cứng cũ). Có `API_PORT=4444` → dùng đúng giá trị đó. Xác nhận placeholder hoạt động thật,
không phải chỉ là chuỗi ký tự chết.

**5. grep lại (không đổi so với lần trước):**
```
$ grep -n "unsafe-inline" ops/Caddyfile
25:# 'unsafe-inline' CHỈ xuất hiện ở style-src (...)
29:		Content-Security-Policy "...; style-src 'self' 'unsafe-inline'"

$ grep -nE "unsafe-eval|https://cdn|http://cdn" ops/Caddyfile
(không khớp gì)
```

Dọn dẹp: `docker stop t003-proxy-test && docker rm t003-proxy-test`. `shop-online-postgres-1`
(T002) không bị đụng, vẫn `Up ... (healthy)`.

### Kết luận

Concern ban đầu đã được xử lý theo R14 trong phạm vi file của T003, không đụng
`ops/compose.yaml`. Việc bơm `API_PORT` vào service `proxy` trong compose vẫn là việc hoãn
lại, thuộc task/ruling khác — Caddyfile giờ đã sẵn sàng tiếp nhận nó mà không cần sửa lại.

---

## Fix round 1/5 — hổng matcher đường dẫn trần (`/admin`, `/api` không có "/" cuối)

### Vấn đề (review vòng 1)

`handle /api/*` và `handle /admin/*` chỉ khớp tiền tố có dấu "/" theo sau — xác nhận qua
`caddy adapt`: route biên dịch mang `"path": ["/api/*"]` / `"path": ["/admin/*"]` nguyên văn.
Đường dẫn TRẦN `/admin` hoặc `/api` (không có "/" cuối — thứ người dùng thật hay gõ, hoặc một
scanner) KHÔNG khớp hai matcher này, nên rơi xuống `handle` còn lại và nhận `index.html` của
storefront với HTTP 200 thay vì 404 (với `/admin`) — header an toàn vẫn còn (vì `header` nằm
ngoài mọi `handle`, nên AC-AD29 tự thân không vi phạm), nhưng ý định của hợp đồng định tuyến
("`/admin/*` không có gì phía sau, trả gì cũng được — nhưng không phải trang chủ shop") bị âm
thầm phá vỡ. Cùng lỗ hổng áp dụng về nguyên tắc cho `/api` trần với bảo đảm "không bao giờ rơi
SPA fallback". Vòng verify đầu tiên chỉ test `/admin/` có "/" cuối nên không bắt được.

### Thay đổi

`ops/Caddyfile`:
```diff
-	handle /api/* {
+	@api path /api /api/*
+	handle @api {
 		reverse_proxy api:{$API_PORT:3000}
 	}
...
-	handle /admin/* {
+	@admin path /admin /admin/*
+	handle @admin {
 		respond 404
 	}
```
Thử `handle /api /api/*` (nhiều path trần trực tiếp trên `handle`) trước — Caddy từ chối:
`caddy validate` báo lỗi `wrong argument count or unexpected line ending after '/api/*'`.
Chuyển sang named matcher (`@api path /api /api/*`, `@admin path /admin /admin/*`) — đây là
cú pháp Caddy hỗ trợ OR nhiều pattern path cho một `handle`. Cập nhật comment giải thích cả lý
do kỹ thuật (matcher path tiền tố cần "/" theo sau) lẫn việc `handle` không nhận nhiều path
trần cùng lúc.

`{ admin off }` — theo ghi chú Minor của review, giữ nguyên, không đụng vào (deferred, ngoài
phạm vi vòng fix này).

### Lệnh đã chạy + output thật

**1. Thử cú pháp sai trước (để lại làm bằng chứng tại sao chọn named matcher):**
```
$ docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile
Error: adapting config using caddyfile: parsing caddyfile tokens for 'handle': wrong argument
count or unexpected line ending after '/api/*', at /etc/caddy/Caddyfile:52
```
(Exit 1 — với `handle /api /api/*` viết trực tiếp, chưa dùng named matcher.)

**2. Sau khi sửa sang named matcher — `caddy fmt` xác nhận không lệch định dạng:**
```
$ docker run --rm -v "$PWD/ops:/work" -w /work caddy:2.11.4 caddy fmt Caddyfile | diff -u ops/Caddyfile -
fmt diff exit=0
```

**3. `caddy validate` với image đã pin:**
```
$ docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 caddy validate --config /etc/caddy/Caddyfile
{"level":"info",...,"msg":"using config from file","file":"/etc/caddy/Caddyfile"}
{"level":"info",...,"msg":"adapted config to JSON","adapter":"caddyfile"}
{"level":"warn",...,"msg":"server is listening only on the HTTP port, so no automatic HTTPS will be applied to this server",...}
{"level":"info",...,"msg":"servers shutting down with eternal grace period"}
{"level":"info",...,"msg":"started background certificate maintenance",...}
{"level":"info",...,"msg":"stopped background certificate maintenance",...}
Valid configuration
```
Exit 0.

**4. `caddy adapt` — xác nhận route biên dịch mang cả hai dạng path:**
```
$ docker run --rm -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.11.4 \
    caddy adapt --config /etc/caddy/Caddyfile 2>/dev/null | python3 -m json.tool | grep -A3 '"path"'
                                    "path": [
                                        "/api",
                                        "/api/*"
                                    ]
--
                                    "path": [
                                        "/admin",
                                        "/admin/*"
                                    ]
```

**5. Dựng lại proxy độc lập, curl đủ 5 trường hợp review vòng 1 yêu cầu:**
```
$ docker run -d --name t003-proxy-test \
    -v "$PWD/ops/Caddyfile:/etc/caddy/Caddyfile:ro" \
    -v "$PWD/apps/storefront/dist:/srv/storefront:ro" \
    -p 8180:80 \
    caddy:2.11.4

$ curl -sI http://localhost:8180/
HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 321
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Content-Type: text/html; charset=utf-8
Etag: "dljczo743egj8x"
Last-Modified: Sat, 19 Sep 2026 14:22:45 GMT
Referrer-Policy: same-origin
Server: Caddy
Vary: Accept-Encoding
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:40:40 GMT

$ curl -sI http://localhost:8180/admin
HTTP/1.1 404 Not Found
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:40:40 GMT

$ curl -sI http://localhost:8180/admin/
HTTP/1.1 404 Not Found
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:40:40 GMT

$ curl -sI http://localhost:8180/api
HTTP/1.1 502 Bad Gateway
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:40:44 GMT

$ curl -sI http://localhost:8180/api/products
HTTP/1.1 502 Bad Gateway
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; connect-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: same-origin
Server: Caddy
X-Content-Type-Options: nosniff
Date: Sat, 19 Sep 2026 14:40:47 GMT
```

`/admin` (trần) và `/admin/` đều 404 kèm đủ header, không còn lọt xuống `index.html`.
`/api` (trần) và `/api/products` đều 502 (cố proxy, không SPA fallback). `/` vẫn phục vụ
storefront với đủ header.

**6. grep lại (không đổi so với trước):**
```
$ grep -n "unsafe-inline" ops/Caddyfile
25:# 'unsafe-inline' CHỈ xuất hiện ở style-src (...)
29:		Content-Security-Policy "...; style-src 'self' 'unsafe-inline'"

$ grep -nE "unsafe-eval|https://cdn|http://cdn" ops/Caddyfile
(không khớp gì)
```

Dọn dẹp: `docker stop t003-proxy-test && docker rm t003-proxy-test`. `shop-online-postgres-1`
(T002) không bị đụng, vẫn `Up ... (healthy)`.

### Không đổi

Không nới lỏng bất kỳ directive CSP nào. Không đụng `ops/compose.yaml` hay file nào khác của
T002. `{ admin off }` giữ nguyên theo ghi chú Minor của reviewer (deferred, ngoài vòng này).
