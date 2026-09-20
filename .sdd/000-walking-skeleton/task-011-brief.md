# Task T011 — Module `catalog`: đường đọc của trang bán hàng

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T011**, `tasks.md` §Phase 4 (US1)
- **Owns**: `FR-001` (hiển thị Sản phẩm thật từ kho dữ liệu), `FR-002` (giá là số nguyên VND
  đã gồm VAT), `FR-004` (Sản phẩm không tồn tại → HTTP 404)
- Contract: `specs/000-walking-skeleton/contracts/storefront-http.md`
- Data model: `specs/000-walking-skeleton/data-model.md` §Module `catalog`
- Architecture: `docs/baseline/architecture.md` AD-5, AD-10, AD-11, AD-19, AD-20, §Consistency

## Objective

Làm các contract test đỏ của T010 xanh: API đọc trả Sản phẩm thật từ PostgreSQL, ghép tình
trạng tồn kho **bằng lời gọi service công khai**, và không để lộ con số tồn kho.

## Hợp đồng bootstrap của T010 — bắt buộc tương thích, không thương lượng

T010 đã khoá cách app được khởi động trong test, ghi trong
`apps/api/src/modules/catalog/catalog-test-support.ts`:
`createTestApp()` = `NestFactory.create(AppModule, { logger: false })` + `app.init()` —
**không** `setGlobalPrefix`, **không** `useGlobalPipes`/`useGlobalFilters`, **không**
`listen()`. Hệ quả bắt buộc cho `app.module.ts` mà bạn viết:

- Tiền tố `/api` và mọi pipe/filter/interceptor ảnh hưởng tới hợp đồng HTTP (đặc biệt bộ lọc
  404 dùng envelope lỗi dùng chung) **phải** khai **bên trong `AppModule`** — route-level
  hoặc qua token `APP_FILTER`/`APP_PIPE` — **không** chỉ trong `main.ts`. Nếu bạn đặt chúng
  chỉ trong `main.ts` (`app.setGlobalPrefix('api')`, `app.useGlobalFilters(...)`), test của
  T010 sẽ không đi qua chúng và sẽ đỏ sai lý do.
- Nếu bạn thấy hợp đồng bootstrap này sai hoặc không đủ, DỪNG và báo controller — đừng tự sửa
  `catalog-test-support.ts` (T010 sở hữu).

## Nợ dependency phải trả ở task này

`apps/api/package.json` **chưa** khai `packages/shared` là dependency thật — cả T009 (R19)
lẫn T010 (R20) đều dựa vào npm workspace hoisting và ghi lại khoản nợ này. **T011 phải thêm
`packages/shared` vào `dependencies` của `apps/api/package.json`, pin đúng phiên bản
`workspace:*` hoặc số phiên bản hiện có** — không để tích thêm sang T012/T013.

## Requirements

1. **Repository + service + controller** cho `category`, `product`, `product_image` trong
   `apps/api/src/modules/catalog/`. Dùng schema Drizzle của T004, không khai lại bảng.
2. **`name_normalized` chuẩn hoá lúc GHI, không lúc đọc** (AD-11). Dùng **đúng** quy tắc
   chuẩn hoá mà T005 đã dùng cho seed — đọc `.sdd/000-walking-skeleton/task-005-report.md`;
   hai quy tắc khác nhau là một lỗi dữ liệu âm thầm.
3. **Ghép tình trạng tồn kho bằng lời gọi service công khai `catalog → stock`.**
   **KHÔNG `JOIN` qua biên module** — AD-5: khoá ngoại không bao giờ là giấy phép `JOIN`.
   Gọi `stock.public.ts` của T009. Không import repository của `stock`.
4. **`price` là số nguyên VND đã gồm VAT** — không thập phân, không dòng thuế tách riêng,
   không chia 100 ở đâu cả. `bigint` từ database phải serialise thành **số nguyên JSON**
   (chú ý: `bigint` của JS không serialise thẳng bằng `JSON.stringify` — xử lý tường minh và
   nói rõ cách làm trong report).
5. **Ảnh đại diện là `product_image` có `position` nhỏ nhất** (UX §571). Không có ảnh →
   `imagePath: null`, không phải chuỗi rỗng.
6. **Sản phẩm không tồn tại → HTTP 404** với **envelope lỗi dùng chung** của `packages/shared`.
   **Không stack trace ra client**, không thông điệp nội bộ của framework, ở bất kỳ mã lỗi nào.
7. **`Cache-Control: no-store`** trên mọi response chứa `stockStatus` (AD-20). Không thêm
   tầng cache nào — không in-memory cache, không `stale-while-revalidate`, không memoize
   đường đọc tồn kho.
8. **`GET /api/health`** theo contract.
9. **Log có cấu trúc ra stdout kèm `request_id`** cho mỗi request. Bạn **sở hữu** middleware
   log này (Ruling R8); T014 sẽ **mở rộng** nó bằng thời lượng và endpoint p95 — đừng dựng
   sẵn phần của T014, và đừng viết log theo cách khiến T014 phải thay thế.
10. **Validate cấu hình một lần lúc khởi động** bằng schema của `packages/shared` (T006).
    **Không** đọc `process.env` rải rác trong mã.
11. **Không** tạo `apps/api/src/usecases/`. Không endpoint ghi nào (không đặt đơn, không giỏ
    hàng, không đăng nhập, không đường dẫn quản trị) — `contracts/…` §"Không có ở `000`".
12. **Không sửa test của T010 hay T008.** Nếu một test sai, DỪNG và báo controller.

## Architecture decisions ràng buộc task này

- **AD-5** — ranh giới module là ranh giới dữ liệu; truy cập chéo **chỉ** qua
  `<domain>.public.ts`. Không `JOIN` vượt biên, không import repository của module khác.
- **AD-10** — hình dạng response lấy từ `packages/shared`; BE **không** khai lại.
- **AD-11** — chuẩn hoá lúc ghi.
- **AD-19/FR-007** — con số tồn kho không rời server. API chỉ trả `in_stock`/`out_of_stock`.
- **AD-20** — không cache `stockStatus` ở bất kỳ tầng nào.
- **§Consistency** — cấu hình triển khai validate một lần lúc khởi động; không `process.env`
  rải rác; không stack trace ra client.

## Glossary

`stock status` → `stockStatus` ∈ {`in_stock`, `out_of_stock`}. Module tồn kho tên **`stock`**,
không bao giờ `inventory`. Nhãn tiếng Việt "Còn hàng"/"Hết hàng" **chỉ** ở tầng hiển thị
(`apps/storefront`), **không** ở API.

## Scope

**Allowed**
```text
apps/api/src/modules/catalog/**   (mã hiện thực — KHÔNG sửa file test của T010)
apps/api/src/main.ts              apps/api/src/app.module.ts
.sdd/000-walking-skeleton/task-011-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/api/src/modules/catalog/*-spec.ts   (T010 sở hữu)
apps/api/src/modules/stock/**            (chỉ được GỌI qua stock.public.ts)
apps/api/src/usecases/**  (không được tạo)      apps/storefront/**
packages/**   e2e/**   db/**   ops/**   docs/baseline/**   specs/**   scripts/**   tests/**
```

## Acceptance criteria của task

- **Mọi test của T010 XANH**. Dán bằng chứng TDD: output đỏ trước, xanh sau, cùng lệnh.
- Test của T008/T009 vẫn xanh (không hồi quy).
- `grep -rniE "join" apps/api/src/modules/catalog` không cho thấy `JOIN` nào chạm bảng của
  `stock`; mọi truy cập tồn kho đi qua `stock.public.ts` — chỉ ra đúng dòng trong report.
- `grep -rn "process.env" apps/api/src` chỉ khớp **một** chỗ: nơi nạp cấu hình lúc khởi động.
- 404 trả envelope dùng chung, không stack trace — dán output `curl` thật cho một id không tồn tại.
- `npm test`, `npm run lint`, `npm run build` exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate && npm run db:seed
npm test
npm run lint && npm run build
```

## Dependencies

T004 (lược đồ) · T005 (seed + quy tắc chuẩn hoá) · T006 (`packages/shared`) ·
T009 (`stock.public.ts`) · T010 (test đỏ).

## Previous task outputs

- Chữ ký `stock.public.ts`: `.sdd/000-walking-skeleton/task-009-report.md`.
- Tên export của `packages/shared`: `.sdd/000-walking-skeleton/task-006-report.md`.
- Quy tắc chuẩn hoá `name_normalized`: `.sdd/000-walking-skeleton/task-005-report.md`.
- `apps/api/src/main.ts` hiện là file giữ chỗ do T001 tạo (`export {}`); bạn sở hữu nội dung thật.
