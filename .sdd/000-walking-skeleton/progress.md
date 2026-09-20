# SDD ledger — plan: specs/000-walking-skeleton/tasks.md

**Feature**: `000-walking-skeleton` · **Track**: A · **Engine**: superpowers / subagent-driven-development
**Handoff**: `.sdd/000-walking-skeleton/handoff.yaml` — `/sdd-validate` PASS (2026-09-19)
**Worktree**: `.claude/worktrees/000-walking-skeleton` · **Branch**: `impl/000-walking-skeleton`
(nhánh con của `feature/000-walking-skeleton`, gộp ngược khi xong)
**Spec** (thẩm quyền ràng buộc): `specs/000-walking-skeleton/spec.md`
**Plan** (lập luận của spec): `specs/000-walking-skeleton/plan.md`

Ghi chú vị trí artifact: CLAUDE.md §2 và `.sdd/README.md` đè mặc định của skill —
brief/report/review nằm ở `.sdd/000-walking-skeleton/`, **không** ở `.superpowers/sdd/`.
Review package (diff lớn) nằm ở `.sdd/000-walking-skeleton/runs/<run-id>/*.snapshot.md`,
gitignored theo `.gitignore` của repo.

---

## Cổng môi trường — đo lại 2026-09-19 trước khi dispatch Task 1

| Cổng | Kết quả |
|---|---|
| Docker + Compose | ✅ 29.1.2 / v2.40.3-desktop.1 (`docker info` trả lời) |
| `postgres:18.6`, `caddy:2.11.4` | ✅ `docker manifest inspect` thành công cả hai |
| Phiên bản npm bị pin ở `plan.md` §Technical Context | ✅ tồn tại nguyên văn: typescript 5.9.3 · @nestjs/* 11.2.5 · react/react-dom 19.3.0 · vite 8.3.0 · @vitejs/plugin-react 6.1.1 · drizzle-orm 0.45.2 · drizzle-kit 0.31.10 · jest 30.4.2 · vitest 5.0.1 · @playwright/test 1.62.1 |
| Node | ✅ 24.21.0 (sàn `>=24.15`) |
| Baseline `npm test` trong worktree | ✅ glue 22 pass / 0 fail; product `SKIPPED` (đúng như mong đợi trước T001) |

Hệ quả: **dấu 🐳 "Docker chưa dùng được" trong `tasks.md` và `quickstart.md` đã lỗi thời.**
Không task nào bị chặn môi trường. `tasks.md`/`quickstart.md` do Spec Kit sở hữu; `quickstart.md`
nằm trong allowed scope của T015 và được sửa ở đó, `tasks.md` **không** sửa.

---

## Pre-flight conflict scan — mọi cặp task dùng chung file hoặc giao diện

| # | Task | Sản xuất → tiêu thụ | Kết quả |
|---|---|---|---|
| 1 | T001 ↔ T004 ↔ T005 | `package.json` gốc: workspaces+deps → script `db:migrate` → script `db:seed` | Không [P], tuần tự — không tranh chấp. Chỗ hở: deps `drizzle-orm`/`drizzle-kit`/`pg` không có chủ → **R3** |
| 2 | T001 ↔ T015 | `scripts/verify.mjs` → output "nửa sản phẩm ĐÃ CHẠY" | Mâu thuẫn: `verify.mjs` tự dò workspace, sửa nó là thừa và trái header của chính nó → **R1** |
| 3 | T001 ↔ T002…T007 | `package.json` của mỗi workspace khai `test` trước khi có test | Mâu thuẫn thật: Jest/Vitest exit 1 khi không có test → `npm test` đỏ suốt Phase 1–2 → **R2** |
| 4 | T002 ↔ T004, T005, T008, T010, T013, T015 | dịch vụ `postgres` + tên biến môi trường | Tên biến chưa ai chốt → trôi giữa 6 task → **R4** |
| 5 | T002 ↔ T011, T012 | compose service `api`/`proxy` cần image + `apps/storefront/dist` | Chỗ hở: **không task nào sở hữu Dockerfile của api**; T002 bị cấm chạm `apps/**` → **R5** |
| 6 | T003 ↔ T013 | `ops/Caddyfile` header → e2e khẳng định từng directive | Sạch: cả hai chép nguyên văn `contracts/storefront-http.md` |
| 7 | T003 ↔ T014 | `/api/*` proxy → endpoint tổng hợp p95 "nội bộ" | Mâu thuẫn: mọi `/api/*` đều ra ngoài; T014 không được sửa Caddyfile → **R9** |
| 8 | T004 ↔ T005, T008, T009, T010, T011 | 5 bảng + CHECK + FK → seed, test, repository | Sạch: `data-model.md` là hợp đồng chung, không chỗ nào diễn giải khác |
| 9 | T004 ↔ T009 | `CHECK (quantity >= 0)` + số dòng ảnh hưởng → `UPDATE` có điều kiện | Sạch: AD-1 nằm ở tầng dữ liệu, code chỉ đọc affected rows |
| 10 | T005 ↔ T013, T015 | `db/seed.ts` → e2e và quickstart cần đúng 1 Sản phẩm | Sạch, với điều kiện seed idempotent (T005 đã ghi) |
| 11 | T006 ↔ T010, T011, T012 | schema hợp đồng → contract test, API, SPA | Chỗ hở: **baseline không pin thư viện schema** (AD-10 chỉ nói "schema + type suy ra từ schema") → **R6** |
| 12 | T007 ↔ T012 | primitive `packages/ui` → storefront | Chỗ hở: không pin môi trường test DOM cho Vitest → **R7** |
| 13 | T008 ↔ T009 | cùng `apps/api/src/modules/stock/**`, test trước impl | Sạch: T008 chỉ file test, T009 chỉ file không-test |
| 14 | T010 ↔ T011 | cùng `apps/api/src/modules/catalog/**`, test trước impl | Sạch, cùng lý do |
| 15 | T009 ↔ T011 | `stock.public.ts` → `catalog` gọi qua service | Sạch: AD-5 cấm JOIN vượt biên, cả hai task ghi rõ |
| 16 | T011 ↔ T014 | `apps/api/src/**`: log có `request_id` → thêm duration + p95 | Chồng lấn: hai task cùng chạm tầng log → **R8** |
| 17 | T013 ↔ T014 | `e2e/**`: T013 sở hữu 2 spec, T014 thêm khẳng định p95 | Chồng lấn nhẹ → **R8b** |
| 18 | T012 ↔ T007 | bundle riêng, không import chéo (AD-9) | Sạch: AD-9 chưa kiểm chứng được ở `000` (plan §Ghi chú 3) |
| 19 | T015 ↔ `docs/baseline/verification.md` | T015 được phép sửa **nếu** lệnh không chạy tới bất biến | **Không phải ruling của tôi**: CLAUDE.md §3 + chính T015 đòi người duyệt trên nhánh `baseline/*`. Nếu chạm tới, DỪNG và hỏi |

### Tự nhất quán từng task

T001 ✅ (sau R1/R2/R3) · T002 ✅ (sau R5) · T003 ✅ · T004 ✅ · T005 ✅ · T006 ✅ (sau R6) ·
T007 ✅ (sau R7) · T008 ✅ — test nó đòi (4 file, luật AD-28) khớp code T009 phải viết ·
T009 ✅ · T010 ✅ · T011 ✅ · T012 ✅ · T013 ✅ · T014 ✅ (sau R8/R9) · T015 ✅ (xem hàng 19)

---

## Rulings trước khi thực thi

Ruling: R1 — T001 **không** viết lại `scripts/verify.mjs`; cơ chế "thôi báo SKIPPED" là tạo
`package.json` cho từng workspace, vì `verify.mjs` đã tự dò. Chỉ sửa nếu dò thật sự trượt, và
sửa tối thiểu. — Vì header của chính file đó cấm hardcode đường dẫn, và `verification.md`
§"Every command has two halves" dựa vào cơ chế dò. — Nếu sai: T015 báo product half vẫn
SKIPPED và T001 phải mở lại.

Ruling: R2 — `package.json` mỗi workspace khai đủ `test`/`lint`/`build` ngay từ T001, nhưng
runner chạy với cờ **không có test = pass** (`--passWithNoTests`) cho tới khi task sở hữu test
của nó hạ cánh. — Vì nếu không, `npm test` đỏ từ T001 tới T008 và mất hoàn toàn tín hiệu hồi
quy giữa các task. — Nếu sai: một workspace có thể im lặng không có test; T015 và review cuối
bắt được vì chúng đối chiếu với danh sách test mang tên bất biến của AD-21.

Ruling: R3 — deps tầng gốc cho công cụ database (`drizzle-orm` 0.45.2, `drizzle-kit` 0.31.10,
driver `pg`) do **T001** cài và pin, không phải T004. — Vì T001 sở hữu câu "pin đúng phiên bản
trong plan.md §Technical Context" ở `package.json` gốc; T004 chỉ thêm *script*. — Nếu sai:
T004 phải thêm một dòng dependency, sửa nhỏ, không đổi kiến trúc.

Ruling: R4 — tên biến môi trường chốt một lần tại T002 và mọi task sau dùng đúng thế:
`DATABASE_URL` (chuỗi kết nối PostgreSQL đầy đủ), `API_PORT`, `NODE_ENV`,
`PRODUCT_IMAGE_PATH` (đường dẫn volume ảnh). `ops/.env.example` là bản kê duy nhất. — Vì
`architecture.md` §Consistency đòi cấu hình triển khai validate một lần lúc khởi động bằng
schema của `packages/shared`; hai tên khác nhau ở hai task là lỗi lúc chạy, không phải lỗi
biên dịch. — Nếu sai: đổi tên biến là sửa cơ học ở `ops/` + `packages/shared`.

Ruling: R5 — Dockerfile của `apps/api` đặt tại **`ops/api.Dockerfile`** với build context là
gốc repo, và compose mount `apps/storefront/dist` vào Caddy; cả hai thuộc allowed scope của
**T002**. — Vì không task nào sở hữu `apps/api/Dockerfile` và T002 bị cấm chạm `apps/**`;
đây là chỗ hở của plan, không phải lựa chọn phong cách. — Nếu sai: di chuyển một file và sửa
đường dẫn build context.

Ruling: R6 — thư viện schema cho `packages/shared` là **zod, pin chính xác `4.6.5`**. — Vì
AD-10 đòi "schema + type **suy ra từ** schema" validate ở cả hai phía, baseline không pin
thư viện nào, và zod cho suy ra type trực tiếp; Constitution §VI chỉ đòi pin chính xác,
không chỉ định thư viện. — Nếu sai: đổi thư viện là viết lại `packages/shared` (khoảng một
task), các phía tiêu thụ đổi theo vì chúng import từ đúng một chỗ.

Ruling: R7 — `packages/ui` và `apps/storefront` test dưới Vitest với môi trường
`jsdom` + `@testing-library/react`, pin chính xác phiên bản khi cài. — Vì plan pin runner
(Vitest 5.0.1) nhưng không pin môi trường DOM, mà sàn WCAG cần render thật để kiểm. — Nếu
sai: đổi môi trường test, không chạm mã sản phẩm.

Ruling: R8 — **T011 sở hữu** middleware log có cấu trúc + `request_id`; **T014 mở rộng** nó
bằng trường thời lượng và endpoint tổng hợp p95, **không viết lại**. — Vì cả hai được phép
chạm `apps/api/src/**` và hai cách log song song là lỗi quan sát kinh điển. — Nếu sai: T014
phải hợp nhất hai đường log, sửa trong một file.

Ruling: R8b — trong `e2e/`, T014 **chỉ thêm file mới** (`performance.e2e-spec.ts`), không sửa
`security-headers.e2e-spec.ts` và `storefront-journey.e2e-spec.ts` của T013. — Vì T013 sở hữu
SC-004 và sửa spec của người khác làm mất chủ sở hữu tiêu chí (HV007b). — Nếu sai: review
cuối thấy một spec hai chủ.

Ruling: R9 — endpoint tổng hợp p95 của T014 đặt tại `/api/internal/metrics`, **không** liên kết
từ storefront, **không** chứa con số tồn kho. Việc chặn đường dẫn ở reverse proxy hoãn sang
feature sau. — Vì T003 đã chốt `/api/*` → NestJS và T014 không được sửa `ops/Caddyfile`;
"nội bộ" ở `tasks.md` không định nghĩa là chặn ở proxy. — Nếu sai: số đo hiệu năng đọc được
bởi người ngoài (không lộ tồn kho, không lộ dữ liệu khách) — rủi ro thấp, sửa bằng một dòng
Caddyfile trên nhánh sau.

Ruling: R10 — `handoff.yaml` ghi `require_tdd: false` (miễn trừ bootstrap: "test harness does
not yet exist"), nhưng `tasks.md` T008/T010 bắt test **ĐỎ trước**. Tôi theo `tasks.md` —
miễn trừ chỉ áp cho T001…T007, nơi harness chưa tồn tại. — Vì Constitution §II là
NON-NEGOTIABLE và miễn trừ được viết cho tình huống không còn đúng sau T001. — Nếu sai:
thừa kỷ luật, không thiếu.

---

## Tiến độ

Ruling: R11 — `lint` của mỗi workspace sản phẩm là `tsc --noEmit` (typescript 5.9.3 đã pin),
**không** dựng ESLint. — Vì baseline không pin linter nào và Constitution §VI cấm kéo vào một
stack không pin; `npm run lint` vẫn phải có nghĩa, và typecheck là kiểm tra tĩnh mạnh nhất
sẵn có mà không thêm phụ thuộc. — Nếu sai: thêm ESLint sau là một task riêng, không đụng mã
sản phẩm.

Ruling: R12 — `node_modules/`, `dist/`, `e2e/test-results/`, `e2e/playwright-report/` vào
`.gitignore` do **controller** làm, không phải một task. — Vì T001 báo đúng rằng `.gitignore`
nằm ngoài allowed scope của nó, nhưng để nguyên thì một `git add -A` của bất kỳ task nào sau
đây cũng nuốt trọn `node_modules/`; đây là vệ sinh kho mã ở tầng glue, cùng loại với commit
`.claude/worktrees/`. — Nếu sai: một mẫu ignore quá rộng che mất file thật; kiểm bằng
`git status --short` sau mỗi task.

## Tiến độ

Task 1: complete (commits 2226156..7717e31, review clean — spec ✅, task quality Approved)
Task 1: minor (deferred): `apps/api/tsconfig.json` khai `"types": ["node","jest"]` nhưng
  không workspace nào khai `@types/node`; nó chạy được nhờ hoisting, không nhờ khai báo.
Task 1: minor (deferred): `packages/shared/tsconfig.json` và `packages/ui/tsconfig.json` lặp
  lại `module`/`moduleResolution` đã có trong `tsconfig.base.json`.
Task 1: minor (deferred): `apps/storefront/tsconfig.json` và `e2e/tsconfig.json` kế thừa
  `declaration`/`sourceMap` trong khi đặt `noEmit: true` — cấu hình chết, vô hại.
Ruling: R13 — file loại trừ build context của ảnh api đặt tại **`ops/api.Dockerfile.dockerignore`**
(BuildKit đọc `<tên-Dockerfile>.dockerignore` trước `.dockerignore` ở gốc context), **không**
tạo `.dockerignore` ở gốc repo. — Vì review T002 đúng: `COPY . .` với context là gốc repo sẽ
đè `node_modules` đã `npm ci` trong tầng `deps` bằng cây của host (sai OS/arch), và không có
gì loại trừ `.git/`. Đặt ở `ops/` giữ mọi thứ trong allowed scope của T002; một `.dockerignore`
ở gốc là file gốc repo mà không task nào sở hữu. — Nếu sai: BuildKit bị tắt ở một môi trường
nào đó thì file này bị bỏ qua và build lại kéo cả cây; T015 dựng sạch sẽ bắt được.

Task 2: fix round 1/5 (3 addressed, 0 open — Dockerfile COPY order + `ops/api.Dockerfile.dockerignore`
  theo R13; đường mount Caddyfile; bằng chứng crash-loop postgres 18; commits 9f352f4..d7abf6e)
Task 2: complete (commits c0dd960..d7abf6e, review clean sau 1 vòng sửa)
Task 2: minor (deferred): `${PRODUCT_IMAGE_PATH:-...}` lặp ở hai chỗ trong `ops/compose.yaml`,
  phải tự giữ đồng bộ với `ops/.env.example`.
Task 2: minor (deferred): `ops/api.Dockerfile.dockerignore` chỉ loại `e2e/test-results`, phần
  còn lại của `e2e/` vẫn vào build context.
Task 2: minor (deferred): bằng chứng "node_modules khác nhau" chỉ chứng minh phần dockerignore,
  không chứng minh phần đảo thứ tự COPY (nhánh BuildKit tắt). Mã đúng cả hai phần khi đọc.
Ruling: R14 — `ops/Caddyfile` dùng placeholder `{$API_PORT:<mặc định>}` cho cổng backend thay
vì số ghi cứng; việc bơm `API_PORT` vào container `proxy` trong `ops/compose.yaml` để lại cho
task nào hợp pháp chạm compose lần sau (T015 hoặc một feature sau), và được ghi ở đây để
`/speckit-converge` không đánh rơi. — Vì T003 báo đúng rằng `ops/compose.yaml` là forbidden
scope của nó và hiện không bơm `API_PORT` vào `proxy`; placeholder có giá trị mặc định cho kết
quả **không tệ hơn** số ghi cứng hôm nay và **tự đúng** ngay khi biến được bơm, mà không cần
task nào sửa chéo file của task khác. — Nếu sai: đổi `API_PORT` trong `.env` mà quên bơm vào
`proxy` thì proxy vẫn trỏ cổng mặc định; T015 (dựng sạch, chạy trọn quickstart) là nơi bắt được.

Task 3: fix round 1/5 (1 addressed, 0 open — matcher `@api path /api /api/*` và
  `@admin path /admin /admin/*`; đường dẫn trần không còn rơi vào SPA fallback;
  header vẫn vô điều kiện trên cả năm đường dẫn; commits ce29ec9..b21bae7)
Task 3: complete (commits cb15644..b21bae7, review clean sau 1 vòng sửa)
Task 3: minor (deferred): `{ admin off }` trong `ops/Caddyfile` là hardening không được brief
  yêu cầu — vô hại, tự chú thích, giữ nguyên.
Task 3: deferred (cross-task): bơm `API_PORT` vào dịch vụ `proxy` của `ops/compose.yaml` —
  theo R14, để lại cho task nào chạm compose hợp pháp lần sau. `/speckit-converge` cần thấy dòng này.

Task 4: complete (commits 8792c18..cd20ac4, review clean — spec ✅, Approved)
Task 4: ⚠️ của reviewer đã đóng bởi controller: tôi tự chạy lại hai câu lệnh vi phạm trên
  database thật. `UPDATE stock SET quantity=-1` → `ERROR: violates check constraint
  "stock_quantity_non_negative"`; `DELETE FROM product` có sổ cái → `ERROR: violates RESTRICT
  setting of foreign key constraint "stock_ledger_product_id_product_id_fk"`. Hai transcript
  trong report của T004 là thật. Dọn bằng TRUNCATE sau khi kiểm; bốn bảng về 0 dòng.
Task 4: minor (deferred): comment đầu `db/drizzle.config.ts` nhắc tới `db:generate` trong khi
  `package.json` chỉ có `db:migrate` (generate chạy bằng `npx`).
Task 4: Ruling: `generatedByDefaultAsIdentity()` (BY DEFAULT, không ALWAYS) cho mọi khoá chính
  bigint được chấp nhận — `data-model.md` và `architecture.md` chỉ nói "bigint identity", không
  AD nào phụ thuộc lựa chọn này, và BY DEFAULT giúp seed chèn id tường minh. — Nếu sai: đổi sang
  ALWAYS là một migration chỉ-tiến nữa, không đụng mã.

Ruling: R15 — `tsx` phải được khai **tường minh** và **pin chính xác** trong `devDependencies`
của `package.json` gốc, dù nó đang có sẵn nhờ hoisting từ `drizzle-kit`/`vite`. — Vì
`npm run db:seed` là một **bước đã ghi trong quickstart** và `SC-007` đòi dựng lại từ kho mã
sạch; một phụ thuộc chỉ tồn tại nhờ cây phụ thuộc của gói khác có thể biến mất khi gói đó nâng
cấp, và khi đó bước seed gãy trên clone sạch — đúng thứ SC-007 tồn tại để bắt. Đây cùng loại
với minor `@types/node` của T001, nhưng nó **chịu tải lúc chạy**, không chỉ lúc biên dịch. —
Nếu sai: thừa một dòng devDependency.

Ruling: R16 — finding Important của review T005 (idempotency kiểu check-then-act trên cột
không có ràng buộc UNIQUE) được **tách đôi**: (a) nửa **tranh chấp đồng thời** phải sửa ngay
trong `db/seed.ts` bằng advisory lock của PostgreSQL — nằm trọn trong phạm vi T005, rẻ, và
đóng đúng lỗ mà SC-007 quan tâm khi ai đó chạy dựng lại hai lần song song; (b) nửa **khoá
UNIQUE trên `name_normalized`** **park lại**, vì sửa nó là một migration, mà `db/migrations/**`
là phạm vi của T004 đã đóng, và không tiêu chí nghiệm thu nào của `000` đòi nó. — Vì tiêu chí
thật (`SC-007`) nói "dựng lại bằng các bước đã ghi", tức tuần tự, và review cũng kết luận đây
là gia cố tương lai chứ không phải vi phạm tiêu chí. — Nếu sai: một hàng dữ liệu mẫu trùng
xuất hiện khi ai đó sửa tay `name_normalized` rồi seed lại; hiện rõ ngay ở trang chủ và sửa
bằng một migration thêm UNIQUE ở feature sau. **Ghi cho `/speckit-converge`: cân nhắc UNIQUE
`category.name_normalized` / `product.name_normalized` ở một feature sau.**
Ruling: R17 — cảnh báo ⚠️ của review ("nếu môi trường prod không đặt `NODE_ENV`, hàng rào seed
im lặng") **không** mở thêm việc ở `000`. — Vì `NODE_ENV` do T002 chốt làm biến phân biệt môi
trường, `ops/compose.yaml` là nơi khai nó, và feature `000` không có quy trình triển khai prod
nào để gia cố; thêm một tín hiệu thứ hai bây giờ là phát minh cơ chế ngoài baseline. — Nếu sai:
một lần triển khai prod quên đặt `NODE_ENV` có thể chạy seed; hậu quả là dữ liệu mẫu trong prod,
phát hiện ngay và xoá được. **Ghi cho `/speckit-converge`.**

Task 5: fix round 1/5 (4 addressed, 0 open — advisory lock `pg_advisory_xact_lock` đặt đúng
  trong transaction trước mọi SELECT; regex dùng escape unicode tường minh, cùng dải codepoint;
  comment giả định `PRODUCT_IMAGE_PATH`; thông điệp hàng rào prod nói cả cách khắc phục;
  commits 0a321cb..9fc574f)
Task 5: complete (commits 84cc156..9fc574f, review clean sau 1 vòng sửa; 1 finding park theo R16b)
Task 5: parked — nửa "khoá UNIQUE trên name_normalized" của finding Important — Ruling R16(b):
  cần migration, `db/migrations/**` là phạm vi T004 đã đóng, không tiêu chí nào của 000 đòi.
Task 5: minor (deferred): khoá advisory `72500001` là số chọn tay, chưa có sổ đăng ký khoá.
Task 5: minor (deferred): báo cáo test đua không dán dòng lệnh `&`/`wait` chứng minh hai tiến
  trình thật sự chồng nhau; tính đúng của khoá đã được xác minh bằng đọc mã.

Task 7: complete (commits 5792b00..dc46663, review clean — spec ✅, Approved)
Task 7: ⚠️ của reviewer đã đóng bởi controller: `npm ls react react-dom @types/react
  @types/react-dom --workspace=packages/ui` cho thấy cả bốn resolve đúng 19.3.0, không có
  hoist ma; lockfile nhất quán.
Task 7: minor (deferred): `colors.neutral`, `spacing.md/lg`, `fontSize.md/lg` khai nhưng
  T012 (storefront) chưa dùng — phần còn lại của thang đo tối thiểu, chờ consumer.
Task 7: minor (deferred): `RouteAnnouncer` dùng kỹ thuật `clip: rect(0,0,0,0)` cũ thay vì
  `clip-path: inset(50%)` hiện đại hơn — cả hai đều hoạt động đúng, không phải lỗi.

Task 6: complete (commits f8dd23e..5792b00, review clean — spec ✅, Approved)
Task 6: minor (deferred): self-review của report ghi nhầm grep quantity/inventory khớp "3
  dòng", thực tế 5 dòng (1 comment + 4 dòng test) — bản chất đúng (không có field tồn kho thật).
Task 6: note cho review T010: `.strict()` chỉ chặn `quantity` lạ **tại thời điểm** response
  chạy qua `.parse()/.safeParse()` — nếu handler serialize thẳng dòng DB thô mà không qua
  schema thì `.strict()` không cứu được. Kiểm tường minh ở review T010.

**Checkpoint Phase 2 (Foundational) — HOÀN TẤT.** T001…T007 đều complete, review sạch.
Hạ tầng, lược đồ, hợp đồng và packages/ui đã sẵn sàng cho Phase 3.

Task 8: complete (commits 96a0f8d..f2fb523, review clean — spec ✅, Approved; 4/4 test ĐỎ
  đúng lý do "Cannot find module './stock.service'", reviewer tự chạy lại npm test + tsc để
  xác nhận). `npm run lint`/`npm run build` không xanh cho `apps/api` — CHẤP NHẬN ĐƯỢC, đã xác
  minh: cascade chỉ gồm TS2307 (module thiếu, đúng thiết kế) + TS18046 (suy diễn kiểu theo
  sau), không che giấu lỗi nào khác. Contract T009 phải hiện thực nguyên văn:
  `WithdrawStock = (unitOfWork: StockUnitOfWork, input: WithdrawStockInput) =>
  Promise<WithdrawStockResult>`, `StockUnitOfWork = Pick<PoolClient, 'query'>`
  (xem `apps/api/src/modules/stock/stock.contract.ts` + task-008-report.md §1).
Task 8: minor (deferred): tiêu đề `it()` trong `stock-ledger-restrict.int-spec.ts` ghi
  "(23503)" nhưng assertion đúng kiểm `23001` — comment giải thích đúng, chỉ tiêu đề lệch.
Ruling: R18 — sửa `apps/api/tsconfig.build.json` để loại trừ `**/*.int-spec.ts` và
  `**/*.race-spec.ts` (khoảng trống có sẵn từ T001) là việc của **T009**, không phải một task
  riêng. — Vì T009 là nơi đầu tiên `npm run build` cần thật sự xanh cho `apps/api` (sau khi
  `stock.service.ts` tồn tại), và không tách một task chỉ để sửa một dòng exclude glob. Mở
  rộng allowed scope của T009 để bao gồm đúng một dòng này trong `tsconfig.build.json`. —
  Nếu sai: `npm run build` vẫn cố biên dịch file test chạm DB, lỗi hiện ngay ở review T009.

Ruling: R19 — finding Important #2 của review T009 (trùng lặp `StockStatus` giữa
`stock.public.ts` và `packages/shared`) **không** quay lại fix loop của T009 — đúng như review
kết luận, việc sửa đòi thêm `packages/shared` làm dependency của `apps/api/package.json`, nằm
ngoài allowed scope của T009 theo thiết kế. **Park, chuyển thành yêu cầu tường minh cho T011**:
khi T011 nối `catalog` với `packages/shared` (đã là dependency hợp pháp ở đó), T011 phải hoặc
(a) thêm `packages/shared` vào dependency của `apps/api` và cho `stock.public.ts` import type
từ đó, hoặc (b) giữ khai riêng nhưng ràng bằng `z.infer` kèm comment khẳng định khớp hình dạng.
— Nếu sai: hai enum hai giá trị trôi khỏi nhau lặng lẽ nếu `packages/shared` đổi sau này;
rủi ro thấp ở `000` (chỉ hai giá trị, không có động lực đổi), bắt được ở review T011.

Task 9: fix round 1/5 (1 addressed, 0 open — comment-only, không đổi executable line, xác
  nhận qua diff + đọc file thật; commits bd84437..7f50b35)
Task 9: complete (commits 3966eca..7f50b35, review clean sau 1 vòng sửa — spec ✅, Approved)
Task 9: Ruling R19 (đã ghi ở trên) — trùng lặp StockStatus park cho T011.
Task 9: minor (deferred): `stock.public.ts:getStockStatus` tái dùng type `StockUnitOfWork`
  (đặt tên cho khái niệm ghi giao dịch) cho một tham số đọc thuần — không phải lỗi, chỉ hơi
  khó đọc; alias riêng (`StockQueryable`) là cải thiện tùy chọn.
⚠️ chưa có tooling ép AD-5 (không ESLint, `lint` = `tsc --noEmit`, không chặn import xuyên
  module) — không phải khiếm khuyết của T009 (chưa module nào khác tồn tại để vi phạm), nhưng
  ghi lại để T011 review kiểm tường minh: `catalog` phải gọi qua `stock.public.ts`, không
  import `stock.repository.ts`/`stock.service.ts` trực tiếp.

**Checkpoint Phase 3 (User Story 2 — 🎯 lõi rủi ro) — HOÀN TẤT.** Bất biến trung tâm
(tồn kho không bao giờ âm dưới tải đồng thời) đã có bằng chứng chạy được trên PostgreSQL thật:
AC-AD1, AC-AD21, AC-AD28, SC-002 đều đạt. `npm test` giờ chạy tới `*.race-spec.ts`.

Ruling: R20 — T010 được phép mở rộng scope để sửa `apps/api/jest.config.js` (thêm ĐÚNG một
mục `transform` cho `packages/shared/dist/**/*.js`), dù brief T010 không liệt kê file này. —
Vì đây là khoảng trống thật: `packages/shared` build ra ESM, Jest (CJS loader mặc định) không
`require()` được, và `tsc` không phát hiện ra vì nó không chạy qua Jest; task đầu tiên thật sự
import từ `packages/shared` trong test (`apps/api`) là nơi hợp lý để phát hiện và vá — cùng
loại với R15/R18 (khoảng trống hạ tầng lộ ra ở task đầu tiên chạm tới nó). — Điều kiện: mục
`transform` phải hẹp (chỉ `packages/shared/dist`), không đổi hành vi test của T008/T009 (đã
báo cáo 7/7 xanh trước/sau). Review xác minh phạm vi hẹp và không hồi quy trước khi chấp nhận.
— Nếu sai: sửa lại `jest.config.js` là việc cơ học, không đụng mã sản phẩm.
Ghi chú cho brief T011: `apps/api/package.json` chưa khai `packages/shared` là dependency
thật (chỉ hoisting) — T010 xác nhận vẫn hoạt động nhưng đây là nợ tích luỹ từ T009 (R19) và
giờ cả T010. T011 PHẢI thêm dependency tường minh, không để tích thêm sang T012/T013.

Task 10: complete (commits c07db19..a78db0a, review clean — spec ✅, Approved; 3/3 catalog
  suite ĐỎ đúng lý do "Cannot find module '../../app.module'"; T008/T009 xác nhận KHÔNG hồi
  quy — con số đúng là 4 suite/6 test, không phải "7/7" như report/ruling R20 ghi nhầm)
Task 10: minor (deferred): `assertRawBodyNeverContainsQuantity` kiểm từ khoá phụ chỉ khớp
  "quantity"/"inventory" nguyên văn, chưa khớp hết danh sách biến thể (`stockcount`, `qty`…)
  nếu chúng lọt vào một chuỗi tự do — phòng tuyến CHÍNH (regex số nguyên trên toàn bộ raw
  text) không bị ảnh hưởng, đây chỉ là phòng tuyến phụ.
Task 10: minor (deferred, lặp lại từ R19/R20): `apps/api/package.json` vẫn chưa khai
  `packages/shared` là dependency thật — T011 PHẢI đóng (đã ghi trong brief T011).
R20 correction: con số đúng của T008/T009 là **4 test suites / 6 tests** (không phải 7/7 như
  ghi nhầm ở ruling R20 gốc) — review T010 tự chạy lại xác nhận không hồi quy dù con số báo
  cáo sai; sửa cho đúng ở đây.

Ruling: R21 — dọn database dev dùng chung: T011 tự báo còn sót một dòng product fixture từ
lúc curl thủ công sau Jest (không TRUNCATE được vì sandbox chặn lệnh đó). Controller đã kiểm
tra (`SELECT` cho thấy 1 product tên "Sản phẩm test …", giá 0, KHÔNG có category/image, chứng
tỏ `db:seed` sau đó không thực sự chèn được dữ liệu thật) và tự chạy TRUNCATE + `db:seed` lại.
Kết quả xác nhận: 1 category, 1 product "Cà phê sữa đá" giá 25000, 1 product_image, 1 stock
quantity=50, 0 stock_ledger. — Vì T012 (storefront) cần đúng một Sản phẩm thật để hiển thị,
và dữ liệu fixture sai sẽ làm sai lệch mọi kiểm thử tay tiếp theo. — Việc dọn dẹp KHÔNG phải
review code, không thay thế review T011; T011 vẫn phải qua review đầy đủ.

Task 11: complete (commits 193d42b..39e9d13, review clean — spec ✅, Approved; 7/7 test xanh
  (3 catalog + 4 stock, không hồi quy); `npm test`/`lint`/`build` xanh TOÀN BỘ workspace —
  LẦN ĐẦU TIÊN đúng trong feature này). Bootstrap contract của T010 được tôn trọng: `/api`
  qua `@Controller('api/...')`, filter lỗi qua `APP_FILTER` trong `CatalogModule` (không phải
  `AppModule` trực tiếp — do phạm vi không cho tạo `apps/api/src/common/**`); reviewer tự chạy
  lại qua đúng harness của T010 (`createTestApp()`) và xác nhận hoạt động thật, không chỉ qua
  `main.ts`. `packages/shared` giờ là dependency thật (nợ R19/R20 đã trả).
Task 11: minor (deferred): id sản phẩm dạng lỗi (`abc`, `1.5`) rơi vào cùng 404 như id không
  tồn tại — quyết định hợp lý, T010 không kiểm ca này, hợp đồng không phân biệt 400 vs 404.
Task 11: minor (deferred): `error-envelope.filter.ts` và `request-logging.middleware.ts` tự
  khai interface Request/Response tối giản thay vì `@types/express` — hợp lý trong phạm vi
  được phép, hơi trùng lặp.

Ghi chú vận hành (không phải finding): mỗi lần `npm test`/`npx jest` chạy trong `apps/api`,
các test contract (T010) TRUNCATE + tự tạo fixture riêng của chúng trên `postgres` dùng chung
— đúng luật AD-28. Hệ quả: sau BẤT KỲ lần chạy test nào, database dev sẽ còn dữ liệu fixture
của test, KHÔNG PHẢI dữ liệu demo của `db:seed`. Đây là hành vi ĐÚNG, không phải lỗi. Bất kỳ
ai kiểm tay qua trình duyệt/`curl` sau khi test đã chạy PHẢI tự chạy lại
`docker exec ... TRUNCATE ... ; npm run db:seed` trước. Đã làm lại lần này (reviewer T011 chạy
Jest → DB còn fixture → controller TRUNCATE + reseed → xác nhận "Cà phê sữa đá" 25000₫,
quantity=50). T012 (storefront, kiểm tay) và T015 (quickstart) đều phải tự làm bước này trước
khi kiểm; T015 vốn đã có `db:seed` trong quy trình chạy sạch.

Ruling: R22 — **lỗ hổng plan thật, phát hiện lúc T012 kiểm tay**: `product_image.path` lưu
đường dẫn TRÊN ĐĨA (đúng AD-15, đúng data-model.md), nhưng T011 trả nguyên văn giá trị đó làm
`imagePath`/`images[].path` trong response API — trong khi `contracts/storefront-http.md` thể
hiện hình dạng đó là **đường dẫn URL** (`"/images/…"`). Không route nào trong `ops/Caddyfile`
phục vụ tệp tĩnh từ `PRODUCT_IMAGE_PATH`. Kết quả: `<img src>` của T012 render đúng theo hợp
đồng nó nhận được, nhưng trỏ tới một đường dẫn trình duyệt không bao giờ tải được (`/data/...`
rơi vào SPA fallback, trả `index.html`) — ảnh sẽ KHÔNG hiện trên trình duyệt thật. Đây là lỗ
hổng chưa task nào trong 15 task sở hữu: T011 (đã đóng, không sai so với hợp đồng nó nhận —
hợp đồng chỉ nói hình dạng field, không nói rõ nghĩa vụ ánh xạ đường dẫn) và T003 (đã đóng,
brief của nó không yêu cầu route ảnh). SC-001/FR-001 đòi thấy **ảnh** thật ở cả hai trang;
T015 sẽ đi qua kịch bản tay #2 và phát hiện đây, nhưng phát hiện bây giờ rẻ hơn.

**Quyết định**: mở một fix nhỏ, có brief + review đầy đủ như một task, đặt tên **T011b**
(chèn giữa T012 và T013 trong trình tự thực thi — không đổi số của `tasks.md`, không sửa
`tasks.md`, chỉ là nhãn nội bộ của controller cho `/speckit-converge` truy vết). Phạm vi:
(a) `ops/Caddyfile` — thêm route tĩnh `/images/*` phục vụ tệp từ volume đã mount tại
`PRODUCT_IMAGE_PATH`; (b) `apps/api/src/modules/catalog/**` — ánh xạ `product_image.path`
(đường dẫn đĩa) thành URL `/images/<tên tệp>` trong mọi response (`imagePath` và
`images[].path`), không đổi cột dữ liệu. — Nếu sai: ảnh vẫn không hiện, T015 bắt lại, sửa cùng
phạm vi.

