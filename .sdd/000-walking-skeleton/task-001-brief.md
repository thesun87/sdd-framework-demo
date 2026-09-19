# Task T001 — Dựng monorepo workspaces

## Source
- Feature: `000-walking-skeleton` (Track A)
- Task: **T001**, `specs/000-walking-skeleton/tasks.md` §Phase 1
- Spec: `specs/000-walking-skeleton/spec.md` — T001 không sở hữu tiêu chí nghiệm thu nào
- Plan: `specs/000-walking-skeleton/plan.md` §Technical Context, §Project Structure
- Architecture: `docs/baseline/architecture.md` §Cây nguồn, AD-5, AD-9, AD-27
- Verification contract: `docs/baseline/verification.md`

## Objective

Dựng bộ xương monorepo để mọi task sau có chỗ đặt mã, và để `npm test` / `npm run lint` /
`npm run build` bắt đầu **chạy nửa sản phẩm** thay vì in `SKIPPED — no product workspace
exists yet`. Không viết mã sản phẩm nào ở task này.

## Requirements

1. **Root `package.json`**: thêm trường `workspaces` liệt kê đúng năm workspace:
   `apps/api`, `apps/storefront`, `packages/shared`, `packages/ui`, `e2e`.
   Giữ nguyên `scripts`, `engines`, `type`, `license` đang có — bốn lệnh của
   `verification.md` **không được đổi** (Constitution §III).
2. **Thư mục**: tạo `apps/`, `packages/`, `e2e/`, `db/migrations/`, `ops/`.
   Git không commit được thư mục rỗng: `db/migrations/` và `ops/` nhận một `.gitkeep`;
   các workspace tự có `package.json` nên không cần.
3. **Phiên bản pin chính xác** — không `^`, không `~`, không dist-tag, không `latest`
   (Constitution §VI). Lấy nguyên từ `plan.md` §Technical Context:

   | Gói | Phiên bản | Đặt ở đâu |
   |---|---|---|
   | `typescript` | `5.9.3` | root (devDependency, dùng chung) |
   | `drizzle-orm` | `0.45.2` | root |
   | `drizzle-kit` | `0.31.10` | root (devDependency) |
   | `pg` + `@types/pg` | bản mới nhất lúc cài, **pin chính xác** | root |
   | `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | `11.2.5` | `apps/api` |
   | `reflect-metadata`, `rxjs` | pin chính xác bản hợp lệ với NestJS 11 | `apps/api` |
   | `jest` | `30.4.2` | `apps/api` (devDependency) |
   | `ts-jest`, `@types/jest`, `supertest`, `@types/supertest` | pin chính xác | `apps/api` |
   | `react`, `react-dom` | `19.3.0` | `apps/storefront` |
   | `vite` | `8.3.0` | `apps/storefront` (devDependency) |
   | `@vitejs/plugin-react` | `6.1.1` | `apps/storefront` (devDependency) |
   | `vitest` | `5.0.1` | `apps/storefront`, `packages/shared`, `packages/ui` |
   | `jsdom`, `@testing-library/react` | pin chính xác | `apps/storefront`, `packages/ui` |
   | `zod` | `4.6.5` | `packages/shared` |
   | `@playwright/test` | `1.62.1` | `e2e` |
   | `@axe-core/playwright` | pin chính xác | `e2e` |

   `@types/*` và công cụ dev được phép lấy bản mới nhất **tại thời điểm cài**, nhưng phải
   ghi vào `package.json` dưới dạng số chính xác, không range.
4. **Script của từng workspace** — `scripts/verify.mjs` chạy workspace nào **khai** script
   tương ứng:

   | Workspace | `test` | `lint` | `build` | `test:e2e` |
   |---|---|---|---|---|
   | `apps/api` | `jest --passWithNoTests` | `tsc --noEmit` | `tsc -p tsconfig.build.json` | — |
   | `apps/storefront` | `vitest run --passWithNoTests` | `tsc --noEmit` | `vite build` | — |
   | `packages/shared` | `vitest run --passWithNoTests` | `tsc --noEmit` | `tsc -p tsconfig.build.json` | — |
   | `packages/ui` | `vitest run --passWithNoTests` | `tsc --noEmit` | `tsc -p tsconfig.build.json` | — |
   | `e2e` | **không khai** | `tsc --noEmit` | **không khai** | `playwright test --pass-with-no-tests` |

   `e2e` **không** khai `test` và **không** khai `build`: `verification.md` nói rõ Playwright
   treo dưới `regression`, không dưới `test`, và e2e không có sản phẩm để build.
   Cờ "không có test = pass" là bắt buộc ở task này và **chỉ** tới khi task sở hữu test của
   workspace đó hạ cánh (T008 cho `apps/api`, T012 cho `apps/storefront`, T013 cho `e2e`).
5. **`build` phải chạy được ngay hôm nay.** `apps/storefront` chưa có mã nguồn; `vite build`
   với một `index.html` + một entry point rỗng tối thiểu là chấp nhận được, hoặc bất kỳ cách
   nào khiến lệnh exit 0 mà **không** giả vờ (không `exit 0` cứng, không `echo`). Nếu không có
   cách nào trung thực, báo DONE_WITH_CONCERNS và nói rõ.
6. **TypeScript**: `tsconfig.base.json` ở gốc (target/lib/module hợp với Node 24 + ESM,
   `strict: true`), mỗi workspace có `tsconfig.json` kế thừa nó. `apps/api` cần
   `experimentalDecorators`/`emitDecoratorMetadata` cho NestJS 11.
7. **`scripts/verify.mjs`**: đọc header của file trước. Nó **đã** tự dò workspace qua
   `package.json`. Sửa nó **chỉ khi** việc dò thật sự trượt, và sửa tối thiểu. Không hardcode
   đường dẫn — header của chính file cấm điều đó, và `verification.md` §"Every command has two
   halves" dựa vào cơ chế dò.

## Architecture decisions ràng buộc task này

- **AD-9** — `apps/storefront` và `apps/backoffice` là **hai bundle riêng**, entry point riêng,
  thư mục output riêng. Ở `000` chỉ dựng `storefront`; đừng dựng cấu hình nào giả định một
  bundle duy nhất sẽ phục vụ cả hai.
- **AD-5** — ranh giới module = ranh giới thư mục. Không tạo `apps/api/src/usecases/`,
  `apps/backoffice/`, `ops/backup/`: `plan.md` §Structure Decision nói rõ chúng **chưa mọc**,
  và mỗi cái có feature sở hữu nó trong `feature-map.md`.
- **Constitution §VI** — phiên bản pin chính xác. Một `^` lọt vào runtime dependency là finding.
- **Constitution §III** — bốn lệnh ở `docs/baseline/verification.md` là hợp đồng. Không thêm
  lệnh thứ năm, không đổi tên bốn lệnh hiện có.

## Glossary (dùng đúng, `docs/baseline/glossary.md`)

- module tồn kho tên **`stock`**, không bao giờ `inventory` (từ này nằm trong cột *Do NOT use*).
- `catalog`, `product`, `category`, `product_image`, `stock`, `stock_ledger` là tên canonical.

## Rulings của controller áp cho task này (ghi ở `.sdd/000-walking-skeleton/progress.md`)

- **R1** — không viết lại `verify.mjs`; workspace có `package.json` **là** cơ chế.
- **R2** — script test khai ngay từ T001 với cờ "không có test = pass".
- **R3** — deps công cụ database (`drizzle-orm`, `drizzle-kit`, `pg`) cài ở **root**, do task này.
- **R11** — `lint` của workspace sản phẩm là `tsc --noEmit`; **không** dựng ESLint.

## Scope

**Allowed**
```text
package.json           package-lock.json      tsconfig*.json
apps/**  (chỉ khung workspace: package.json, tsconfig.json, entry tối thiểu cho build)
packages/**            e2e/**                 db/**  (chỉ thư mục + .gitkeep)
ops/**   (chỉ thư mục + .gitkeep)             scripts/verify.mjs  (sửa tối thiểu, xem #7)
.sdd/000-walking-skeleton/task-001-report.md  (báo cáo của bạn)
```

**Forbidden** — chạm vào là DỪNG và báo xung đột, không tự sửa (CLAUDE.md §3, §5)
```text
docs/baseline/**              .specify/**              _bmad/**
specs/000-walking-skeleton/spec.md      specs/000-walking-skeleton/plan.md
specs/000-walking-skeleton/tasks.md     scripts/sdd/**          tests/**
scripts/lint.mjs              .sdd/** (trừ file báo cáo của bạn)
apps/backoffice/**            apps/api/src/usecases/**          ops/backup/**
```

## Acceptance criteria của task

- `npm test` exit 0, và output **không còn** dòng `SKIPPED — no product workspace exists yet`;
  thay vào đó liệt kê từng workspace đã chạy.
- `npm run lint` exit 0 (glue + `tsc --noEmit` của từng workspace).
- `npm run build` exit 0.
- `npm run test:regression` exit 0 (gồm `test:e2e` → Playwright với `--pass-with-no-tests`;
  nếu Playwright đòi tải browser và máy không có, báo DONE_WITH_CONCERNS kèm lệnh cần chạy —
  **đừng** bỏ script `test:e2e`).
- `grep -nE '"[~^]' package.json apps/*/package.json packages/*/package.json e2e/package.json`
  không trả về dependency runtime nào.
- Không file nào ngoài Allowed scope bị chạm.

## Verification commands (chạy nguyên văn, từ gốc worktree)

```bash
npm test
npm run lint
npm run build
npm run test:regression
```

## Dependencies

Không. Đây là task đầu tiên.

## Previous task outputs

Không có.
