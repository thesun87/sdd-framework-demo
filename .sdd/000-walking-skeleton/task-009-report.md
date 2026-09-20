# Task T009 — Báo cáo: module `stock`, đường ghi tồn kho duy nhất

## Trạng thái: DONE

## 1. Đã làm gì

Hiện thực đúng chữ ký `WithdrawStock` khoá bởi `stock.contract.ts` (T008), làm bốn test đỏ
của T008 thành xanh:

- **`apps/api/src/modules/stock/stock.repository.ts`** (mới) — lớp truy cập dữ liệu thô,
  không chứa quyết định nghiệp vụ:
  - `applyConditionalWithdrawal(unitOfWork, productId, quantity)` — MỘT câu `UPDATE` có điều
    kiện, `RETURNING quantity` lấy giá trị mới trong CÙNG câu lệnh (không `SELECT` lại). Trả
    `null` khi 0 dòng bị ảnh hưởng.
  - `insertStockLedgerEntry(unitOfWork, entry)` — MỘT câu `INSERT INTO stock_ledger ...
    RETURNING id`.
  - `readStockQuantity(queryable, productId)` — `SELECT quantity FROM stock WHERE product_id
    = $1`, dùng cho đọc-để-hiển-thị của `stock.public.ts`, KHÔNG dùng ở đường ghi.
  - Đăng ký `pg.types.setTypeParser(20, Number)` ở đầu file (giải thích ở mục 4).
- **`apps/api/src/modules/stock/stock.service.ts`** (mới) — export
  `withdrawStock: WithdrawStock` đúng chữ ký, gọi `applyConditionalWithdrawal` rồi (nếu áp
  dụng) `insertStockLedgerEntry`, cả hai trên cùng `unitOfWork` được truyền vào. Không
  `BEGIN`/`COMMIT`/`ROLLBACK`/`pool.connect()` ở đâu trong file.
- **`apps/api/src/modules/stock/stock.public.ts`** (mới) — bề mặt công khai duy nhất (AD-5):
  `getStockStatus(queryable, productId): Promise<'in_stock' | 'out_of_stock'>`, suy từ
  `quantity` qua `readStockQuantity`. Đọc thuần, không tham gia đơn vị công việc ghi. Kiểu
  `StockStatus` khai lại cục bộ (trùng `packages/shared` `StockStatusSchema`) thay vì import
  trực tiếp — xem mục 5 (Concerns).
- **`apps/api/tsconfig.build.json`** (Ruling R18) — thêm đúng hai pattern vào `exclude`:
  `**/*.int-spec.ts`, `**/*.race-spec.ts`. Không sửa gì khác trong file, không đụng
  `tsconfig.json`.

Không tạo `apps/api/src/usecases/`, không tạo controller/route HTTP, không thêm luồng
cộng/restock nào ngoài `withdrawStock`.

## 2. Bằng chứng TDD — đỏ trước, xanh sau, cùng lệnh

### ĐỎ (trước khi tạo `stock.service.ts`)
```
$ export DATABASE_URL=postgres://app:app@localhost:5432/shop
$ npm run db:migrate   → [✓] migrations applied successfully! (idempotent)
$ npm test
...
FAIL src/modules/stock/stock-never-negative.int-spec.ts
  Cannot find module './stock.service' from 'modules/stock/stock-never-negative.int-spec.ts'
FAIL src/modules/stock/stock-ledger-restrict.int-spec.ts
  Cannot find module './stock.service' from 'modules/stock/stock-ledger-restrict.int-spec.ts'
FAIL src/modules/stock/stock-ledger-matches-quantity.int-spec.ts
  Cannot find module './stock.service' from 'modules/stock/stock-ledger-matches-quantity.int-spec.ts'
FAIL src/modules/stock/stock-conditional-delta.race-spec.ts
  Cannot find module './stock.service' from 'modules/stock/stock-conditional-delta.race-spec.ts'

Test Suites: 4 failed, 4 total
Tests:       0 total
```
Khớp đúng lý do đỏ mà T008 mô tả (module chưa tồn tại, không phải lỗi cú pháp/kết nối).

### Vòng lặp trung gian — bắt hai lỗi kiểu bigint→string
Sau khi tạo `stock.service.ts`/`stock.repository.ts` lần đầu (không có `setTypeParser`):
```
FAIL stock-never-negative.int-spec.ts
  Expected  { applied: true, ledgerId: Any<Number>, quantityAfter: 0 }
  Received  { applied: true, ledgerId: "1", quantityAfter: 0 }
```
rồi sau khi ép kiểu `Number()` thủ công trong `insertStockLedgerEntry`:
```
FAIL stock-ledger-matches-quantity.int-spec.ts
  expect(ledgerRows.rows[0].id).toBe(result.ledgerId)
  Expected: 1        (result.ledgerId — number, đã ép)
  Received: "1"      (ledgerRows.rows[0].id — từ pool.query() thô của TEST, chưa ép)
```
Nguyên nhân và fix ở mục 4.

### XANH (sau khi thêm `pg.types.setTypeParser(20, Number)` vào `stock.repository.ts`)
```
$ npm test
...
▸ apps/api · test
  npm run --silent test
Test Suites: 4 passed, 4 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        1.102 s
...
────────────────────────────────────────────────────────────
PASS  glue · unit tests
PASS  apps/api · test
PASS  apps/storefront · test
PASS  packages/shared · test
PASS  packages/ui · test
────────────────────────────────────────────────────────────
```

### Race test — chạy lại 10 lần liên tiếp (mỗi lần jest tự lặp nội bộ 10 vòng nữa — SC-002)
```
$ cd apps/api && export DATABASE_URL=postgres://app:app@localhost:5432/shop
$ for i in $(seq 1 10); do npx jest src/modules/stock/stock-conditional-delta.race-spec.ts; done
=== run 1 ===  Tests: 1 passed, 1 total
=== run 2 ===  Tests: 1 passed, 1 total
=== run 3 ===  Tests: 1 passed, 1 total
=== run 4 ===  Tests: 1 passed, 1 total
=== run 5 ===  Tests: 1 passed, 1 total
=== run 6 ===  Tests: 1 passed, 1 total
=== run 7 ===  Tests: 1 passed, 1 total
=== run 8 ===  Tests: 1 passed, 1 total
=== run 9 ===  Tests: 1 passed, 1 total
=== run 10 === Tests: 1 passed, 1 total
```
10 lần chạy `jest` riêng biệt × 10 vòng lặp nội bộ trong chính test (`REPEAT_RUNS = 10`) =
100 vòng tranh chấp thật (25 kết nối `pg` độc lập/vòng, tồn kho ban đầu 8) — kết quả giống
hệt mỗi lần: đúng 8 thành công / 17 `applied:false`, đúng 8 dòng `stock_ledger`, `quantity`
cuối = 0.

## 3. SQL thực dùng (nguyên văn)

```sql
-- Đường ghi (RÚT) — MỘT câu, không đọc-rồi-ghi:
UPDATE stock
   SET quantity = quantity - $1, updated_at = now()
 WHERE product_id = $2 AND quantity >= $1
 RETURNING quantity;

-- Sổ cái — MỘT dòng cho mỗi lần applied:true, cùng unitOfWork:
INSERT INTO stock_ledger (product_id, delta, quantity_after, reason, order_id, actor_account_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- Đọc-để-hiển-thị (stock.public.ts, KHÔNG phải đường ghi):
SELECT quantity FROM stock WHERE product_id = $1;
```

## 4. Phát hiện kỹ thuật đáng chú ý — parser bigint

`stock_ledger.id` là `bigint` (T004). Driver `pg` mặc định trả cột `int8`/OID 20 dạng
**chuỗi** (tránh mất độ chính xác ngoài ngưỡng an toàn của JS `number`). `WithdrawStockResult
.ledgerId` trong hợp đồng là `number`, và test `stock-ledger-matches-quantity.int-spec.ts` đối
chiếu `ledgerId` đó với `id` đọc lại bằng **`pool.query` thô của chính test** (không ép kiểu ở
phía test). Muốn cả hai phía khớp kiểu, phải sửa ở tầng driver (registry `pg.types` là toàn
cục trong tiến trình), không phải ép kiểu cục bộ chỉ trong `stock.repository.ts` — nếu chỉ
`Number()` một phía, hai giá trị lệch kiểu (`1` vs `"1"`) dù cùng giá trị, và `toBe` (so sánh
nghiêm ngặt `Object.is`) vẫn đỏ. Do đó thêm
`pgTypes.setTypeParser(20, (v) => Number(v))` ở đầu `stock.repository.ts` — chạy khi module
này được import lần đầu (trước mọi test trong cùng file), nhất quán với quyết định
`mode: 'number'` mà T004 đã chọn cho MỌI cột `bigint`. Đã xác nhận: race-spec vẫn dùng
`count(*)::int` (ép kiểu tường minh trong SQL của chính test) cho các so sánh số dòng — không
phụ thuộc parser này, nên không có xung đột.

## 5. Tự soát (self-review)

- **Không đọc-rồi-ghi trên đường ghi**: `grep -rnE "SELECT.*quantity" apps/api/src/modules/stock`
  chỉ khớp bốn file test (T008, không phải của tôi) và đúng một chỗ trong code của tôi —
  `stock.repository.ts` dòng `readStockQuantity` — dùng bởi `stock.public.ts` để **hiển thị**
  `stockStatus`, không phải để quyết định ghi. `stock.service.ts`/`applyConditionalWithdrawal`
  không có `SELECT` nào; giá trị sau ghi lấy qua `RETURNING` trong CÙNG câu `UPDATE`.
- **`FOR UPDATE`/`BEGIN`**: `grep -rn "FOR UPDATE\|BEGIN" apps/api/src/modules/stock` chỉ
  khớp comment giải thích (của tôi và của T008), không có lệnh SQL `BEGIN`/`FOR UPDATE` thật
  nào trong code của tôi.
- **`unitOfWork` không tự mở**: `stock.service.ts`/`stock.repository.ts` chỉ gọi
  `unitOfWork.query(...)`; không `import { Pool }` hay bất kỳ hàm mở kết nối nào (chỉ
  `import { types as pgTypes } from 'pg'` — một object cấu hình parser, không phải kết nối).
- **Không `apps/api/src/usecases/`**: xác nhận bằng `test -d` — không tồn tại.
- **T008 files bất biến**: `git diff --stat` trên bốn `*-spec.ts`, `stock.contract.ts`,
  `stock-test-support.ts` → rỗng (byte-identical).
- **Phạm vi**: chỉ 3 file mới (`stock.repository.ts`, `stock.service.ts`, `stock.public.ts`)
  + đúng dòng `exclude` trong `tsconfig.build.json` + report này. `git status --short` xác
  nhận không có file nào khác bị đụng.

## 6. File đã thay đổi

```
apps/api/src/modules/stock/stock.repository.ts   (mới)
apps/api/src/modules/stock/stock.service.ts      (mới)
apps/api/src/modules/stock/stock.public.ts       (mới)
apps/api/tsconfig.build.json                     (sửa — đúng 1 dòng exclude, Ruling R18)
.sdd/000-walking-skeleton/task-009-report.md     (mới, file này)
```

## 7. Concerns

- **`stock.public.ts` khai lại cục bộ kiểu `StockStatus`** thay vì import
  `StockStatusSchema`/`StockStatus` từ `packages/shared`, dù `packages/shared` đã export đúng
  hình dạng này. Lý do: `apps/api/package.json` hiện chưa khai `shared` là dependency, và sửa
  `package.json` của `apps/api` nằm ngoài Allowed scope của T009 (chỉ liệt `stock.service.ts`,
  `stock.public.ts`, `apps/api/src/modules/stock/**`, và một dòng `tsconfig.build.json`).
  Về mặt kỹ thuật `import { StockStatus } from 'shared'` vẫn RESOLVE được (workspace npm
  symlink `node_modules/shared → packages/shared` tồn tại sẵn bất kể có khai dependency hay
  không), nhưng dùng một cross-workspace import không khai báo là nợ kỹ thuật ẩn tôi không
  muốn để lại — controller/T011 nên quyết định khi ghép `catalog`. Không chặn test nào của
  T009 (không test nào import `stock.public.ts`).
- **`pg.types.setTypeParser(20, Number)` là side-effect TOÀN CỤC của tiến trình Node**, đăng
  ký ngay khi `stock.repository.ts` được import. Nó ảnh hưởng MỌI cột `bigint` đọc qua bất kỳ
  `pg.Pool`/`Client` nào trong cùng tiến trình (kể cả module khác nếu sau này cùng chạy chung
  process, ví dụ `catalog` đọc `product.id`), không chỉ của `stock`. Đây là chủ ý (giải thích
  ở mục 4 — cần thiết để test T008 đối chiếu kiểu nhất quán) và khớp quyết định
  `mode: 'number'` mà T004 đã chọn cho toàn schema, nhưng nêu rõ ở đây vì nó là một hiệu ứng
  phụ vượt ra ngoài file gọi nó — nếu một module sau này (`identity`, `ordering`) cần `bigint`
  thật (`BigInt` JS) cho một cột cụ thể, side-effect này sẽ áp đặt `number` lên cột đó luôn
  trừ khi bị ghi đè lại bằng một `setTypeParser` khác sau đó trong cùng tiến trình.
- Không có concern nào về tính đúng của bất biến cốt lõi (UPDATE có điều kiện, 0 dòng là giá
  trị, đúng 1 dòng sổ cái/lần ghi, `unitOfWork` không tự mở) — đã kiểm chứng bằng bốn test
  thật trên PostgreSQL 18.6 thật, lặp lại 10 lần cho race test, cùng cho kết quả.

## 8. Fix round 1/5 — chỉ sửa comment quanh `pgTypes.setTypeParser` (`stock.repository.ts`)

Review chấp nhận task (spec ✅, không Critical), nêu một Important rẻ để đóng ngay:
`stock.repository.ts:31` — global mutation của driver `pg` là cần thiết (đã xác nhận), nhưng
comment quanh nó cần sửa **hai chỗ**, KHÔNG đổi hành vi/logic:

1. **Vị trí rủi ro**: đây là một side-effect TOÀN TIẾN TRÌNH sống trong một file tên
   `stock.repository.ts` — một kỹ sư sau này làm `identity`/`ordering`, thấy cột `bigint` đọc
   qua `pg` thô ra `number` thay vì `string`, không có lý do gì để tìm nguyên nhân trong file
   của module `stock`. → Thêm một khối cảnh báo NỔI BẬT ở đầu file (trước cả `import`), nói rõ
   ràng đây là sửa đổi TOÀN CỤC registry `pg.types` cho OID 20, ảnh hưởng MỌI `Pool`/`Client`/
   `PoolClient` trong CÙNG tiến trình Node — không chỉ hai bảng của module này.
2. **Khung sai về T004**: comment cũ nói đây là "đăng ký lại đúng giả định [T004] đã chọn" —
   phóng đại. `mode: 'number'` của T004 là tuỳ chọn GIẢI MÃ ở tầng `drizzle-orm`, chỉ có hiệu
   lực qua chính query builder của Drizzle trên client đã bọc `drizzle(pool)`. Module này dùng
   `pg.Pool.query()` thô, không qua Drizzle — quyết định của T004 không tự động áp dụng ở đây.
   → Sửa lại thành: đây là một QUYẾT ĐỊNH MỚI ở tầng registry OID của driver thô `pg`, MỞ RỘNG
   tinh thần của T004 sang tầng mà T004 chưa chạm tới — không phải "lặp lại nguyên trạng một
   lựa chọn đã có sẵn".

Không đổi `stock.public.ts` (StockStatus duplication đã có ruling riêng, ngoài phạm vi vòng
này). Không có thay đổi logic nào — chỉ hai khối comment trong `stock.repository.ts`.

### Lệnh và output thật (không đổi hành vi — xanh lại y hệt)

```
$ export DATABASE_URL=postgres://app:app@localhost:5432/shop
$ npm test
...
────────────────────────────────────────────────────────────
PASS  glue · unit tests
PASS  apps/api · test
PASS  apps/storefront · test
PASS  packages/shared · test
PASS  packages/ui · test
────────────────────────────────────────────────────────────

$ cd apps/api && npx jest --verbose
Test Suites: 4 passed, 4 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        1.242 s

$ cd .. && npm run lint
────────────────────────────────────────────────────────────
PASS  glue · lint
PASS  apps/api · lint
PASS  apps/storefront · lint
PASS  packages/shared · lint
PASS  packages/ui · lint
PASS  e2e · lint
────────────────────────────────────────────────────────────

$ npm run build
────────────────────────────────────────────────────────────
PASS  apps/api · build
PASS  apps/storefront · build
PASS  packages/shared · build
PASS  packages/ui · build
────────────────────────────────────────────────────────────
```

`git diff -- apps/api/src/modules/stock/stock.repository.ts` xác nhận thay đổi CHỈ trong hai
khối comment (thêm cảnh báo đầu file + viết lại đoạn giải thích T004) — không dòng code thực
thi nào bị đổi. `stock.public.ts`, `stock.service.ts`, `tsconfig.build.json` không đụng tới.

### File thay đổi vòng này
```
apps/api/src/modules/stock/stock.repository.ts   (sửa — chỉ comment)
.sdd/000-walking-skeleton/task-009-report.md      (nối thêm mục 8, file này)
```
