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
