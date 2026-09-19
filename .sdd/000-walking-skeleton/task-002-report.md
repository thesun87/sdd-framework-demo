# Báo cáo T002 — `ops/compose.yaml`: postgres + api + proxy

## Đã hiện thực

1. **`ops/compose.yaml`** — 3 dịch vụ đúng yêu cầu:
   - `postgres:18.6`, `POSTGRES_USER/PASSWORD/DB=app/app/shop`, publish `5432:5432` ra host
     (Jest trên host nối thẳng vào), named volume `postgres-data` mount tại
     `/var/lib/postgresql` (không phải `.../data` — xem mục "Sự cố" bên dưới),
     healthcheck `pg_isready -U app -d shop`.
   - `api` — `build.context: ..` (gốc repo, Ruling R5), `dockerfile: ops/api.Dockerfile`,
     `depends_on.postgres.condition: service_healthy`, không publish cổng ra host, `env_file:
     .env.example` + override riêng `DATABASE_URL` để dùng hostname `postgres` (bên trong
     mạng compose, `localhost` là chính container nên không dùng lại giá trị host-side được),
     mount named volume `product-images` tại đường dẫn lấy từ `${PRODUCT_IMAGE_PATH}`.
   - `proxy` — `caddy:2.11.4`, mount `ops/Caddyfile` (chưa tồn tại — file của T003, tham
     chiếu là đúng theo brief) và `apps/storefront/dist`, publish `80:80`, `depends_on: api`.
     Cũng mount named volume ảnh sản phẩm (read-only) phòng trường hợp Caddy phục vụ ảnh
     trực tiếp — quyết định thật thuộc Caddyfile của T003.
   - Comment đầu file nêu rõ AD-27, AD-28 (dùng chung, không dựng lại mỗi lần chạy; test
     tranh chấp dọn bằng TRUNCATE, không bao giờ rollback; không có database thứ hai), AD-16
     (chỉ 3 dịch vụ, không Redis/broker), AD-8 (chỉ `proxy` publish HTTP).
2. **`ops/api.Dockerfile`** — 3 stage `deps → build → run`, tất cả `FROM node:24.21.0-bookworm-slim`
   (dòng 24, tag chính xác theo `docs/tooling-versions.md`). Comment đầu file nói rõ
   `apps/api` chưa có mã nguồn ở `000`, Dockerfile đúng hình dạng và validate bằng
   `docker compose config`, không cần build thành công hôm nay — T011/T015 mới thực sự chạy.
3. **`ops/.env.example`** — đúng 4 biến của R4 (`DATABASE_URL`, `API_PORT`, `NODE_ENV`,
   `PRODUCT_IMAGE_PATH`), giá trị mẫu chạy được ngay cho máy dev, comment giải thích vì sao
   `api` override `DATABASE_URL` bên trong mạng compose.

## Sự cố gặp phải và cách xử lý

`postgres:18.6` (khác các tag `postgres` cũ) **crash-loop** khi mount volume thẳng vào
`/var/lib/postgresql/data`. Bằng chứng thật, `docker compose -f ops/compose.yaml logs
postgres --tail 50` lúc đó (trích, log lặp lại nhiều lần do container tự restart):

```text
postgres-1  |        The suggested container configuration for 18+ is to place a single mount
postgres-1  |        at /var/lib/postgresql which will then place PostgreSQL data in a
postgres-1  |        subdirectory, allowing usage of "pg_upgrade --link" without mount point
postgres-1  |        boundary issues.
postgres-1  |
postgres-1  |        See https://github.com/docker-library/postgres/issues/37 for a (long)
postgres-1  |        discussion around this process, and suggestions for how to do so.
postgres-1  | Error: in 18+, these Docker images are configured to store database data in a
postgres-1  |        format which is compatible with "pg_ctlcluster" (specifically, using
postgres-1  |        major-version-specific directory names).  This better reflects how
postgres-1  |        PostgreSQL itself works, and how upgrades are to be performed.
postgres-1  |
postgres-1  |        See also https://github.com/docker-library/postgres/pull/1259
postgres-1  |
postgres-1  |        Counter to that, there appears to be PostgreSQL data in:
postgres-1  |          /var/lib/postgresql/data (unused mount/volume)
postgres-1  |
postgres-1  |        This is usually the result of upgrading the Docker image without
postgres-1  |        upgrading the underlying database using "pg_upgrade" (which requires both
postgres-1  |        versions).
```

(nguồn gốc thượng nguồn của thay đổi này: `docker-library/postgres` issue #37 và PR #1259,
dẫn thẳng trong log trên). Log nói rõ ảnh 18+ tự quản lý thư mục con theo major version bên
trong `/var/lib/postgresql` (kiểu `pg_ctlcluster`) và từ chối khởi động nếu thấy dữ liệu ở
đường dẫn `.../data` cũ. Đã sửa: mount named volume tại `/var/lib/postgresql` (không phải
`.../data`), kèm comment giải thích trong `ops/compose.yaml`. Sau khi sửa, container start
khỏe mạnh ngay (xem log/lệnh ở mục "Lệnh đã chạy và kết quả thật"). Đã dọn volume hỏng
(`docker volume rm shop-online_postgres-data`) trước khi dựng lại — volume đó vừa tạo, chưa
từng init thành công nên không mất dữ liệu thật nào.

## Lệnh đã chạy và kết quả thật

```text
$ docker compose -f ops/compose.yaml config
→ in đủ 3 dịch vụ (postgres, api, proxy) + 2 named volume + network, exit 0.

$ grep -nE 'image:.*(latest|:2$|:18$)' ops/compose.yaml
→ không khớp gì (exit 1) — đúng yêu cầu.

$ docker compose -f ops/compose.yaml up -d postgres
→ Network/Volume/Container created & started.

$ docker compose exec -T postgres pg_isready -U app -d shop
→ "/var/run/postgresql:5432 - accepting connections"
→ `docker compose ps` báo STATUS "Up ... (healthy)".

# Chứng minh named volume sống qua down + up:
$ docker compose exec -T postgres psql -U app -d shop -c \
  "CREATE TABLE volume_probe(id serial primary key, note text);
   INSERT INTO volume_probe(note) VALUES ('t002-volume-check-19092026');
   SELECT * FROM volume_probe;"
→ id=1, note=t002-volume-check-19092026

$ docker compose -f ops/compose.yaml down
→ container + network removed, VOLUME KHÔNG bị xoá (không dùng -v).

$ docker compose -f ops/compose.yaml up -d postgres
→ container mới, lên "healthy" ngay lần poll đầu tiên.

$ docker compose exec -T postgres psql -U app -d shop -c "SELECT id, note FROM volume_probe;"
→ id=1, note=t002-volume-check-19092026   ← DỮ LIỆU SỐNG QUA down/up, named volume hoạt động.

$ docker compose exec -T postgres psql -U app -d shop -c "DROP TABLE volume_probe;"
→ dọn bảng thử nghiệm, để lại database sạch cho các task sau.

$ npm test   → PASS glue, apps/api, apps/storefront, packages/shared, packages/ui
$ npm run lint → PASS (bao gồm yaml parse 5 file, tức ops/compose.yaml hợp lệ)
$ npm run build → PASS apps/api, apps/storefront (Vite build thật), packages/shared, packages/ui
```

Container `postgres` được **để chạy** (không `down`) sau khi hoàn tất, theo yêu cầu —
`docker compose -f ops/compose.yaml ps` cuối cùng cho STATUS "Up ... (healthy)".

## Tự soát xét (self-review)

- **Đầy đủ**: đủ 3 dịch vụ, đủ 4 biến `.env.example`, comment AD-28 đọc được từ chính file
  compose.
- **YAGNI**: không thêm dịch vụ thứ tư; mount ảnh sản phẩm vào `proxy` là theo đúng điều kiện
  "nếu Caddy phục vụ ảnh trực tiếp" mà brief nêu, không phải mở rộng phạm vi tự ý.
- **Tag chính xác**: `postgres:18.6`, `caddy:2.11.4`, `node:24.21.0-bookworm-slim` — grep xác
  nhận không có `latest`/`:2`/`:18` trần trong `ops/compose.yaml`.
- **Phạm vi**: chỉ sửa `ops/compose.yaml`, `ops/.env.example`, `ops/api.Dockerfile`,
  `.sdd/000-walking-skeleton/task-002-report.md`. Không chạm `apps/**`, `packages/**`,
  `db/**`, `e2e/**`, `ops/Caddyfile`, `docs/baseline/**`, `.specify/**`, `_bmad/**`,
  `specs/**`, `scripts/**`, `tests/**`, `package.json`.
- Không commit thay đổi không thuộc task này: `git status` khi bắt đầu đã có sẵn thay đổi
  chưa commit ở `.gitignore` và hai brief `.sdd/.../task-006-brief.md`,
  `task-007-brief.md` — không phải do task này tạo ra, **không** đưa vào commit.

## Băn khoăn

- `ops/.env.example` được `env_file:` thẳng vào dịch vụ `api` để "chạy được ngay cho máy
  dev" như brief yêu cầu — nghĩa là giá trị mẫu (`app`/`app`/`shop`) chạy thật trong compose
  mặc định, không chỉ là tài liệu tham khảo. Coi đây là quyết định phù hợp với yêu cầu
  "Kèm giá trị mẫu chạy được ngay cho máy dev", nhưng nêu ra để review nếu ai đó kỳ vọng
  `.env.example` thuần tài liệu.
- Việc override `DATABASE_URL` riêng cho `api` (khác giá trị host-side trong `.env.example`)
  là cần thiết về mặt kỹ thuật (compose network vs host), đã giải thích bằng comment tại cả
  hai file. Không đổi tên biến (vẫn `DATABASE_URL`, đúng R4), chỉ khác giá trị theo ngữ cảnh.
- `docker compose` không tự nạp `ops/.env.example` để thay thế `${PRODUCT_IMAGE_PATH}` ngay
  trong file YAML (chỉ tên file `.env` mới được tự nạp) — đã dùng fallback
  `${PRODUCT_IMAGE_PATH:-/data/product-images}` và ghi chú cách lấy đúng giá trị
  (`--env-file` hoặc copy thành `ops/.env`) để `docker compose config` không gãy khi chưa có
  file `.env` thật.

---

## Fix round 1/5 — phản hồi review

### Defect Important — `ops/api.Dockerfile` (`COPY . .` ghi đè `node_modules` của stage `deps`)

Review đúng: build context là gốc repo, không có `.dockerignore` nào ở repo, `node_modules`
thật (294M, cài đủ cho toàn monorepo trên host) nằm ngay trong context. Thứ tự COPY cũ
(`COPY --from=deps node_modules` → rồi `COPY . .`) khiến bản host ghi đè bản container ở
lớp cuối — sai kiến trúc/OS khi build thật trên máy khác Linux glibc x86/arm container, và
gửi cả `.git/`, `docs/`, `specs/`, `e2e/` vào context.

**Áp dụng cả hai phần theo yêu cầu:**

1. **`ops/api.Dockerfile.dockerignore`** (mới, Ruling R13) — loại `node_modules`,
   `**/node_modules`, `.git`, `dist`, `**/dist`, `.sdd`, `docs`, `specs`,
   `e2e/test-results`. Đặt cạnh Dockerfile trong `ops/`, không đụng gốc repo.
2. **Đảo thứ tự COPY** trong stage `build`: `COPY . .` chạy TRƯỚC,
   `COPY --from=deps /repo/node_modules ./node_modules` chạy SAU — để lớp `node_modules`
   container luôn là lớp ghi đè cuối, phòng hờ trường hợp BuildKit bị tắt và
   `*.dockerignore` không được đọc.

### Minor 1 — `ops/compose.yaml` mount Caddyfile vòng qua gốc repo

Sửa `../ops/Caddyfile:/etc/caddy/Caddyfile:ro` → `./Caddyfile:/etc/caddy/Caddyfile:ro`.
Re-confirm bằng `docker compose config` (xem lệnh bên dưới) — vẫn resolve đúng
`.../ops/Caddyfile`.

### Minor 2 — báo cáo thiếu bằng chứng log thật cho sự cố crash-loop postgres 18

Đã bổ sung trích log thật (`docker compose logs postgres --tail 50` đã chạy ở vòng đầu) vào
mục "Sự cố gặp phải và cách xử lý" phía trên, kèm nguồn gốc thượng nguồn
(`docker-library/postgres` issue #37, PR #1259) mà chính log đó dẫn ra.

### Lệnh đã chạy và kết quả thật (fix round 1)

```text
$ docker compose -f ops/compose.yaml config -q
→ exit 0.

$ docker compose -f ops/compose.yaml config | grep -A3 'source:.*Caddyfile'
        source: /home/.../000-walking-skeleton/ops/Caddyfile
        target: /etc/caddy/Caddyfile
        read_only: true
→ đúng, resolve vào ops/Caddyfile, không còn vòng qua gốc repo.

$ docker compose -f ops/compose.yaml ps   (trước và sau toàn bộ fix round)
→ shop-online-postgres-1 ... Up ... (healthy)  — KHÔNG down/lên lại, container gốc vẫn sống.

# Chứng minh dockerignore thực sự loại trừ node_modules khỏi context:
$ du -sh node_modules   → 294M   (kích thước thật trên host, để so sánh)

# Lần thử đầu chạy sai context (../ tính từ cwd=repo root, không phải từ ops/) → lộ ra lỗi
# thao tác, không phải lỗi cấu hình: context rơi ra ngoài repo, "package-lock.json": not
# found. Sửa lại lệnh cho đúng context mà compose dùng thật (context: .. trong compose.yaml
# resolve từ ops/, tức = gốc repo = cwd khi build tay từ gốc repo):

$ DOCKER_BUILDKIT=1 docker build -f ops/api.Dockerfile --target deps -t t002-probe .
#3 transferring context: 415.86kB   ← so với node_modules một mình đã 294M, context nhỏ hơn
                                       ~700 lần, tức đã bị loại. Build target `deps` tiếp tục
                                       chạy `npm ci`, đang tải base image thì bị ngắt do
                                       registry TLS handshake timeout (mạng, không liên quan
                                       fix) khi pipe qua `head -60`.

$ timeout 60 docker build -f ops/api.Dockerfile --target deps --no-cache -t t002-probe2 .
#5 transferring context: 276B done
→ exit 0. Không cache, context vẫn ở mức byte — node_modules/.git/docs/specs chắc chắn
   không nằm trong context gửi cho daemon.

$ timeout 90 docker build -f ops/api.Dockerfile --target build -t t002-probe-build .
#10 [build 3/5] COPY . .                                    DONE 0.3s
#11 [build 4/5] COPY --from=deps /repo/node_modules ./node_modules   DONE 1.0s
#12 [build 5/5] RUN npm run build --workspace=apps/api        DONE 1.1s (tsc -p tsconfig.build.json — 0 lỗi)
→ exit 0. BUILD TARGET THÀNH CÔNG THẬT (apps/api đã có package.json + tsconfig từ T001, dù
   brief không yêu cầu build phải xanh ở 000). Đây là bằng chứng end-to-end tốt nhất: COPY
   . . xong trong 0.3s (khớp context nhỏ ở trên), rồi node_modules-từ-deps mới đè lên sau
   cùng, đúng thứ tự đã sửa.

$ docker run --rm t002-probe-build sh -c \
  "du -sh /repo/node_modules; ls /repo/node_modules | wc -l; \
   test -f /repo/node_modules/.package-lock.json && echo 'has npm lockfile marker'"
170M	/repo/node_modules
333
has npm lockfile marker (container-installed)
→ SO SÁNH: node_modules trên host có 407 mục top-level (cài cho cả 5 workspace); node_modules
   trong image chỉ 333 mục / 170M (npm ci --workspace=apps/api). KHÁC NHAU RÕ RỆT → xác nhận
   node_modules trong image là bản container tự cài, KHÔNG bị `COPY . .` ghi đè bằng bản host.

$ docker rmi t002-probe t002-probe2 t002-probe-build
→ dọn 3 image thử nghiệm, không để lại rác.

$ npm test && npm run lint && npm run build
→ PASS toàn bộ workspace (glue, apps/api, apps/storefront, packages/shared, packages/ui, e2e lint).
```

`postgres` container **không hề bị động tới** trong suốt fix round này — vẫn là container đã
dựng từ vòng đầu, "Up ... (healthy)" liên tục, không `down`/`up` lại.

### Phạm vi thay đổi (fix round 1)

Sửa: `ops/api.Dockerfile` (đảo COPY), `ops/compose.yaml` (đường dẫn Caddyfile), file mới
`ops/api.Dockerfile.dockerignore`, cập nhật `.sdd/000-walking-skeleton/task-002-report.md`
(bằng chứng log thật + báo cáo fix round này). Không chạm gì ngoài phạm vi được phép của
T002.

### Băn khoăn còn lại

- `${PRODUCT_IMAGE_PATH:-...}` trùng lặp giữa `api` và `proxy` — theo chỉ đạo, **để nguyên**,
  không sửa ở vòng này.
