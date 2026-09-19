# Báo cáo T001 — Dựng monorepo workspaces

**Trạng thái: DONE**

## Đã làm

Dựng 5 workspace theo đúng bảng phiên bản trong brief, cộng thư mục
`db/migrations/` và `ops/` (mỗi cái một `.gitkeep`):

- **`apps/api`** — `package.json` khai `@nestjs/core`/`common`/`platform-express`
  11.2.5, `reflect-metadata` 0.2.2, `rxjs` 7.8.2 (dependencies); `jest` 30.4.2,
  `ts-jest` 29.4.12, `@types/jest` 30.0.0, `supertest` 7.2.2,
  `@types/supertest` 7.2.1 (devDependencies). `tsconfig.json` kế thừa
  `tsconfig.base.json`, bật `experimentalDecorators`/`emitDecoratorMetadata`,
  module CommonJS. `tsconfig.build.json` loại `*.spec.ts`. `src/main.ts` là
  entry rỗng (`export {};`) — không có bootstrap Nest thật, để task sau thay.
  Scripts: `test` = `jest --passWithNoTests`, `lint` = `tsc --noEmit`,
  `build` = `tsc -p tsconfig.build.json`.
- **`apps/storefront`** — React 19.3.0 + Vite 8.3.0 + `@vitejs/plugin-react`
  6.1.1 + Vitest 5.0.1 (devDependency) + `jsdom` 30.1.0 +
  `@testing-library/react` 16.3.3. `index.html` + `src/main.tsx` tối thiểu
  (render `<StrictMode />` rỗng vào `#root`) — đủ để `vite build` thật, không
  giả vờ. `vite.config.ts` dùng `defineConfig` từ `vitest/config` (gộp kiểu
  Vite + Vitest) với `test.environment: "jsdom"`.
- **`packages/shared`** — `zod` 4.6.5 (dependency), Vitest 5.0.1
  (devDependency). `src/index.ts` là entry rỗng.
- **`packages/ui`** — Vitest 5.0.1, `jsdom` 30.1.0, `@testing-library/react`
  16.3.3 (đều devDependency, theo đúng bảng — chưa thêm React vì chưa có mã
  UI nào dùng nó). `src/index.ts` là entry rỗng.
- **`e2e`** — `@playwright/test` 1.62.1, `@axe-core/playwright` 4.13.0
  (devDependencies). **Không khai `test` và `build`** — chỉ `lint` (`tsc
  --noEmit`) và `test:e2e` (`playwright test --pass-with-no-tests`).
  `playwright.config.ts` tối thiểu (`testDir: "."`).
- **Root `package.json`**: thêm `workspaces` (5 mục đúng thứ tự brief),
  `dependencies.drizzle-orm` 0.45.2 + `pg` 8.23.0, `devDependencies.typescript`
  5.9.3 + `drizzle-kit` 0.31.10 + `@types/pg` 8.23.1 (R3 — deps công cụ
  database ở root). `scripts`/`engines`/`type`/`license` **giữ nguyên**.
- **`tsconfig.base.json`** ở gốc: `target: ES2023`, `module`/`moduleResolution:
  NodeNext`, `strict: true`. Mỗi workspace override `module`/`moduleResolution`
  phù hợp runtime của nó (CommonJS cho `apps/api`, ESNext/Bundler cho
  `apps/storefront` và `e2e`, NodeNext cho hai `packages/*`).
- **`scripts/verify.mjs`**: **không sửa** — cơ chế dò `package.json` hoạt động
  đúng như thiết kế (R1); log xác nhận cả 5 workspace được liệt kê, dòng
  `SKIPPED` không còn xuất hiện.

### Lệch khỏi bảng brief (có chủ đích, ghi rõ ở đây)

`npm run lint` ban đầu FAIL ở `apps/storefront`: `tsc --noEmit` báo thiếu
declaration cho `react`/`react-dom` (TS7016). Bảng T001 không liệt kê
`@types/react`/`@types/react-dom`, nhưng brief mục 3 cho phép "`@types/*`...
lấy bản mới nhất tại thời điểm cài, ghi số chính xác". Đã thêm
`@types/react` 19.3.0 và `@types/react-dom` 19.3.0 (khớp chính xác
React 19.3.0, không range) vào `apps/storefront/devDependencies`. Không có
cách nào khác để `tsc --noEmit` trung thực đi qua mã React thật mà không có
gói này — coi đây là phần bắt buộc của "công cụ dev" chứ không phải mở
rộng scope.

## Lệnh đã chạy và output thật

### `npm test` — exit 0
```
▸ glue · unit tests  → 22/22 pass
▸ apps/api · test        → No tests found, exiting with code 0 (passWithNoTests)
▸ apps/storefront · test → No test files found, exiting with code 0
▸ packages/shared · test → No test files found, exiting with code 0
▸ packages/ui · test     → No test files found, exiting with code 0
PASS glue · unit tests / apps/api · test / apps/storefront · test /
     packages/shared · test / packages/ui · test
```

### `npm run lint` — exit 0 (sau khi thêm @types/react*)
```
▸ glue · lint → ok javascript syntax (6 files) / python compile (4 files) / yaml parse (5 files)
▸ apps/api · lint        → PASS (tsc --noEmit sạch)
▸ apps/storefront · lint → PASS (tsc --noEmit sạch)
▸ packages/shared · lint → PASS
▸ packages/ui · lint     → PASS
▸ e2e · lint             → PASS
```

### `npm run build` — exit 0
```
▸ apps/api · build        → PASS (tsc -p tsconfig.build.json → dist/main.{js,d.ts,js.map})
▸ apps/storefront · build → PASS — vite v8.3.0, 14 modules transformed,
                             dist/index.html 0.32 kB, dist/assets/index-*.js 219.55 kB
▸ packages/shared · build → PASS (dist/index.{js,d.ts,js.map})
▸ packages/ui · build     → PASS (dist/index.{js,d.ts,js.map})
```

### `npm run test:regression` — exit 0
Chạy `npm test` (như trên, tất cả PASS) rồi `npm run test:e2e`:
```
▸ e2e · test:e2e → PASS (playwright test --pass-with-no-tests, browser
                    Chromium đã có sẵn trong cache máy — không cần tải mạng
                    lần này)
```

### Kiểm tra pin phiên bản
```
grep -nE '"[~^]' package.json apps/*/package.json packages/*/package.json e2e/package.json
→ không có kết quả (grep exit 1) — không có ^ hay ~ nào lọt vào.
```

Không còn dòng `SKIPPED — no product workspace exists yet` ở bất kỳ output nào.

## Files changed (đã commit `7717e31`)

```
package.json (sửa)                     package-lock.json (mới)
tsconfig.base.json (mới)
apps/api/package.json, tsconfig.json, tsconfig.build.json, src/main.ts
apps/storefront/package.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx
packages/shared/package.json, tsconfig.json, tsconfig.build.json, src/index.ts
packages/ui/package.json, tsconfig.json, tsconfig.build.json, src/index.ts
e2e/package.json, tsconfig.json, playwright.config.ts
db/migrations/.gitkeep
ops/.gitkeep
```

Không commit `.sdd/**` khác ngoài file báo cáo này (controller sở hữu).

## Self-review

- **Completeness**: cả 4 lệnh hợp đồng chạy thật và exit 0; mỗi workspace có
  script đúng bảng brief; e2e đúng là không khai `test`/`build`.
- **YAGNI**: không viết mã sản phẩm nào ngoài entry point tối thiểu bắt buộc
  để tsc/vite/jest có đầu vào thật. Không tạo `apps/backoffice/`,
  `apps/api/src/usecases/`, `ops/backup/` (AD-5, AD-9 tôn trọng). Không thêm
  React vào `packages/ui` vì chưa có mã dùng tới nó. Không thêm ESLint (R11).
- **Pin phiên bản**: xác nhận bằng grep ở trên — sạch. Duy nhất lệch là hai
  gói `@types/react*` không có trong bảng, đã giải thích ở trên và vẫn tuân
  quy tắc pin số chính xác.
- **Phạm vi file**: `git status` sau khi stage khớp chính xác danh sách trên;
  `node_modules/`, `dist/`, `e2e/test-results/` phát sinh khi cài/build đều
  **không** được `git add` (không sửa `.gitignore` vì file đó không nằm
  trong Allowed scope của brief — kiểm soát bằng cách `git add` từng file
  một thay vì `git add -A`).
- **`scripts/verify.mjs`**: không đụng, đúng R1.

## Mối quan tâm

- Không có mối quan tâm chặn nào. Một điểm cần lưu ý cho task sau: repo gốc
  chưa có `node_modules/`/`dist/`/`e2e/test-results/` trong `.gitignore`,
  nên mọi task sau cũng phải `git add` thủ công (không dùng `-A`/`.`) để
  tránh commit nhầm các thư mục sinh ra khi cài/build. Việc thêm các dòng
  này vào `.gitignore` nằm ngoài Allowed scope của T001 nên tôi không tự sửa
  — nêu ở đây để controller quyết định có cần một task/ruling riêng không.
- Playwright chạy được ngay vì máy đã có sẵn cache browser tại
  `~/.cache/ms-playwright` (Chromium 1208/1217). Nếu môi trường CI/máy khác
  chưa có cache này, `npx playwright install` cần chạy trước và cần mạng —
  đúng như `verification.md` đã ghi.
