# Task T008 — Báo cáo: bốn test bất biến tồn kho, tất cả ĐỎ trước T009

## Trạng thái: DONE_WITH_CONCERNS

(Lý do gắn cờ CONCERNS: `npm run lint` và `npm run build` KHÔNG exit 0 cho `apps/api` — xem
mục 5. Đây là hệ quả không tránh được của việc test phải ĐỎ vì "thiếu module", không phải
lỗi trong test hay trong cấu hình do task này viết. Brief đã lường trước và cho phép, với
điều kiện nói rõ trong report — mục này làm đúng điều đó.)

## 1. Chữ ký hợp đồng mà T009 PHẢI hiện thực (nguyên văn)

File: `apps/api/src/modules/stock/stock.contract.ts` — CHỈ khai kiểu, KHÔNG một dòng mã
hiện thực nào (interface/type erase lúc biên dịch).

```ts
import type { PoolClient } from 'pg';

/** Đơn vị công việc tối giản mà `stock` nhận làm tham số. Chỉ phơi `query` — KHÔNG phơi
 *  `connect`, `release`, hay bất kỳ thứ gì cho phép mở/đóng kết nối — để không thể viết một
 *  hiện thực "hợp lệ về kiểu" mà lại tự mở connection riêng. */
export type StockUnitOfWork = Pick<PoolClient, 'query'>;

export type StockLedgerReason = 'order_placed' | 'order_cancelled' | 'manual_adjustment';

export interface WithdrawStockInput {
  readonly productId: number;
  readonly quantity: number;          // > 0, số đơn vị muốn RÚT khỏi tồn kho
  readonly reason: StockLedgerReason;
  readonly orderId?: number | null;        // giá trị trần, KHÔNG khoá ngoại (AD-24)
  readonly actorAccountId?: number | null; // NULL ở 000 (identity chưa tồn tại)
}

export type WithdrawStockResult =
  | {
      readonly applied: true;
      readonly quantityAfter: number;  // stock.quantity NGAY SAU thao tác
      readonly ledgerId: number;       // id của dòng stock_ledger vừa sinh
    }
  | { readonly applied: false };       // 0 dòng bị ảnh hưởng — GIÁ TRỊ hợp lệ, KHÔNG exception

export type WithdrawStock = (
  unitOfWork: StockUnitOfWork,
  input: WithdrawStockInput,
) => Promise<WithdrawStockResult>;
```

**T009 phải tạo `apps/api/src/modules/stock/stock.service.ts` và export:**
```ts
export const withdrawStock: WithdrawStock = async (unitOfWork, input) => { ... };
```

### Giải thích chữ ký — vì sao nó thể hiện AD-23 Ở TẦNG KIỂU

- `unitOfWork` là tham số **bắt buộc**, không có overload nào cho phép gọi mà không truyền
  nó → về mặt kiểu, hàm KHÔNG CÓ CÁCH NÀO tự mở connection/transaction của riêng nó.
- `StockUnitOfWork = Pick<PoolClient, 'query'>` chỉ phơi `query` — không phơi `connect`,
  `release`, `pool`. Hiện thực không thể "âm thầm" lấy một connection khác qua tham số này.
- Hệ quả bắt buộc cho T009: **không được gọi `BEGIN`/`COMMIT`/`ROLLBACK`/`pool.connect()`**
  bên trong `withdrawStock`. Đường vào (ở `000` là chính test, vì không có HTTP cho đường
  ghi — `plan.md` §Ghi chú 2) phải tự mở transaction, truyền `client` vào, và tự
  COMMIT/ROLLBACK sau khi hàm trả về. Test dùng `withUnitOfWork()` (trong
  `stock-test-support.ts`) làm mẫu chính xác cho việc này.
- **Đường ghi**: một câu `UPDATE` có điều kiện, không đọc-rồi-ghi (AD-1):
  ```sql
  UPDATE stock SET quantity = quantity - :quantity, updated_at = now()
  WHERE product_id = :productId AND quantity >= :quantity
  ```
  - Ảnh hưởng 1 dòng → ghi thêm ĐÚNG MỘT dòng `stock_ledger`
    (`delta = -quantity`, `quantity_after` = giá trị mới) trong CÙNG `unitOfWork`, trả
    `{ applied: true, quantityAfter, ledgerId }`.
  - Ảnh hưởng 0 dòng → trả `{ applied: false }` — KHÔNG ném lỗi, KHÔNG ghi sổ cái.
- Hợp đồng chỉ định nghĩa đường RÚT (trừ tồn kho) — khớp đúng những gì bốn test T008 cần và
  đúng những gì `data-model.md`/brief mô tả bằng SQL cụ thể. `000` không có luồng
  restock/huỷ đơn thật, nên không cần một hàm cộng riêng ở task này; nếu task sau cần, đó là
  một bổ sung hợp đồng, không phải một cách hiểu khác của chữ ký này.

## 2. Bốn file test — đúng tên, tại `apps/api/src/modules/stock/`

1. `stock-conditional-delta.race-spec.ts` — M=8, N=25 kết nối độc lập (dòng 33–34: `const
   INITIAL_QUANTITY = 8`, `const CONCURRENT_WITHDRAWALS = 25`), lặp 10 lần liên tiếp
   (`REPEAT_RUNS = 10`, dòng 35) trên CÙNG database (chỉ `TRUNCATE` giữa các lần, không dựng
   lại schema — dòng 55). Mỗi phần tử tranh chấp là một lời gọi `withUnitOfWork(pool, ...)`
   riêng (dòng 63–69) → N `pool.connect()` độc lập thật, chạy qua `Promise.allSettled` (dòng
   71). Khẳng định: không rejection nào (dòng 78–79), đúng M `applied:true`, đúng N-M
   `applied:false` (dòng 81–86), đúng M dòng `stock_ledger` (dòng 90–94), quantity cuối = 0
   (dòng 96–101).
2. `stock-never-negative.int-spec.ts` — hai test: (a) `withdrawStock` trả `applied:false`
   khi rút quá tồn kho, không ném lỗi; (b) một `UPDATE` vô điều kiện bỏ qua toàn bộ ứng dụng
   bị Postgres từ chối bằng `CHECK (quantity >= 0)` — khẳng định `code: '23514'`,
   `constraint: 'stock_quantity_non_negative'` (đã xác minh mã lỗi thật bằng script độc lập,
   xem mục 4).
3. `stock-ledger-matches-quantity.int-spec.ts` — hai test: một lần rút → đúng 1 dòng sổ cái,
   `quantity_after` khớp `ledgerId`/`stock.quantity`; hai lần rút liên tiếp → đúng 2 dòng, dòng
   mới nhất khớp tồn kho hiện tại (10 → 7 → 5).
4. `stock-ledger-restrict.int-spec.ts` — sinh một dòng `stock_ledger` qua ĐƯỜNG GHI THẬT
   (`withdrawStock`, không INSERT tay), sau đó `DELETE FROM product` bằng SQL thô trực tiếp
   trên `pool` (không qua service, không qua `if` nào) → khẳng định Postgres từ chối với
   `code: '23001'` (`restrict_violation` — **không phải `23503`**, xem mục 4),
   `constraint: 'stock_ledger_product_id_product_id_fk'`.

Hạ tầng dùng chung: `apps/api/src/modules/stock/stock-test-support.ts` — pool/connection,
`assertDatabaseReachable`, `truncateAllTables`, `withUnitOfWork`, `seedProduct`, `seedStock`.
KHÔNG chứa logic nghiệp vụ `stock` (không phải `.service.ts`, T009 không đụng file này).

**Vì sao đặt CÙNG THƯ MỤC `src/modules/stock/` thay vì `apps/api/test/`** (brief liệt kê cả
hai là phạm vi được phép): thử đặt ở `apps/api/test/db-helper.ts` trước, và `npm run lint`
báo `TS6059: File ... is not under 'rootDir' './src'` vì `apps/api/tsconfig.json` đặt
`rootDir: "./src"` và một file trong `src/` import một file ngoài `src/` vỡ ràng buộc đó khi
chạy `tsc` toàn chương trình (dù Jest/ts-jest — biên dịch từng file — không bị ảnh hưởng).
`apps/api/tsconfig.json` nằm ngoài phạm vi được phép sửa của T008. Chuyển hẳn file này vào
`src/modules/stock/` (vẫn là "file test", không phải "mã hiện thực" của module `stock`) xoá
sạch lỗi TS6059 mà không cần đụng tsconfig. Kết quả: `apps/api/test/` hiện không tồn tại —
không cần dùng đến phạm vi đó cho task này.

## 3. Cấu hình Jest — `apps/api/jest.config.js`

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '\\.(int|race)-spec\\.ts$',
  maxWorkers: 1,
  testTimeout: 30_000,
};
```

- Thay hẳn khối `"jest": {...}` từng nhúng trong `apps/api/package.json` (T001) — Jest không
  cho phép vừa có `jest.config.js` vừa có `package.json#jest` cùng lúc ("Multiple
  configurations found"). Đã xoá khối cũ; đây là hệ quả bắt buộc của việc thêm
  `jest.config.*` mà brief chính là người yêu cầu ("Cấu hình Jest ... (jest.config.*)"), nêu
  rõ ở đây vì phạm vi liệt kê `package.json (script test)` nói cụ thể về script — xoá field
  `jest` là điều kiện để `npm test` chạy được chứ không phải mở rộng phạm vi tuỳ tiện.
- `testRegex` khớp đúng `*.int-spec.ts`/`*.race-spec.ts`, KHÔNG khớp `*.spec.ts` thường (test
  hiện có duy nhất trong repo là bốn file này).
- `maxWorkers: 1`: race-spec không được chạy song song với file khác chạm cùng 5 bảng
  (AD-28). Toàn bộ test hiện có trong `apps/api` ĐỀU chạm DB dùng chung, nên cách đơn giản
  và an toàn nhất là chạy TOÀN BỘ file tuần tự trong một worker — không file nào chạy song
  song với file khác. Song song *bên trong* race-spec (N connection `pg` độc lập qua
  `Promise.allSettled`) không bị ảnh hưởng — đó là song song ở tầng connection, không phải
  tầng Jest worker. Đã ghi chú trong file: nếu sau này thêm unit test thuần vào `apps/api`,
  đây là điểm cần xét lại (vd. Jest "projects"), ngoài phạm vi T008.
- `apps/api/package.json`: bỏ `--passWithNoTests` khỏi script `test` (nay có test thật).

## 4. Lệnh đã chạy và output ĐỎ thật

Trạng thái môi trường: `postgres` (18.6, container `shop-online-postgres-1`) đang chạy,
healthy, cổng 5432 publish ra host. `npm run db:migrate` (với
`DATABASE_URL=postgres://app:app@localhost:5432/shop`) chạy `[✓] migrations applied
successfully!`, xác nhận lược đồ 5 bảng của T004 đã dựng.

### `npm test` (chạy từ `apps/api/`, có `DATABASE_URL` hợp lệ)

```
FAIL src/modules/stock/stock-ledger-restrict.int-spec.ts
  ● Test suite failed to run
    Cannot find module './stock.service' from 'modules/stock/stock-ledger-restrict.int-spec.ts'
      22 | import { withdrawStock } from './stock.service';
         | ^

FAIL src/modules/stock/stock-ledger-matches-quantity.int-spec.ts
  ● Test suite failed to run
    Cannot find module './stock.service' from '...'
      19 | import { withdrawStock } from './stock.service';

FAIL src/modules/stock/stock-never-negative.int-spec.ts
  ● Test suite failed to run
    Cannot find module './stock.service' from '...'
      21 | import { withdrawStock } from './stock.service';

FAIL src/modules/stock/stock-conditional-delta.race-spec.ts
  ● Test suite failed to run
    Cannot find module './stock.service' from '...'
      30 | import { withdrawStock } from './stock.service';

Test Suites: 4 failed, 4 total
Tests:       0 total
Time:        0.31 s
```
**Cả bốn ĐỎ vì lý do ĐÚNG: `Cannot find module './stock.service'`** — file `stock.service.ts`
(T009 sở hữu) chưa tồn tại. Không phải lỗi cú pháp, không phải lỗi kết nối database. Đã chạy
lại KHÔNG có `DATABASE_URL` (unset) → kết quả giống hệt (module-not-found xảy ra trước khi
bất kỳ `beforeAll`/kết nối DB nào chạy) — xác nhận lý do đỏ độc lập với trạng thái database.

### Xác nhận riêng: `assertDatabaseReachable` thất bại RÕ RÀNG khi thiếu DB (không skip)

Kiểm bằng một script tạm (không commit, đã xoá) trỏ tới cổng sai (`59999`):
```
Thất bại rõ ràng như mong đợi: Không nối được PostgreSQL qua DATABASE_URL="(chưa đặt)".
Chạy: docker compose -f ops/compose.yaml up -d postgres
```
Đúng hành vi yêu cầu: ném lỗi có hướng dẫn lệnh cần chạy, không tự skip.

### Xác nhận riêng: các câu SQL/mã lỗi mà test dựa vào là THẬT (không đoán)

Cũng bằng script tạm (không commit), chạy trực tiếp trên `postgres` thật để xác nhận đúng
mã lỗi Postgres trước khi viết assertion:
```
CHECK fired as expected: 23514 stock_quantity_non_negative
RESTRICT fired as expected: 23001 stock_ledger_product_id_product_id_fk
```
Phát hiện quan trọng: RESTRICT khi XOÁ một bản ghi bị tham chiếu trả **`23001`
(restrict_violation)**, KHÔNG PHẢI `23503` (`foreign_key_violation` — mã đó dành cho vi phạm
FK lúc CHÈN/SỬA giá trị tham chiếu không tồn tại). Test `stock-ledger-restrict.int-spec.ts`
đã sửa để khẳng định đúng `23001` — nếu tôi không xác minh bằng Postgres thật, assertion ban
đầu (`23503`) sẽ khiến test này ĐỎ SAI LÝ DO ngay cả sau khi T009 hiện thực đúng, và sẽ không
ai phát hiện cho tới khi T009 chạy thử.

### `grep` cấm rollback/BEGIN;/pg-mem/sqlite

```
$ grep -rniE "rollback|BEGIN;|pg-mem|sqlite" apps/api/src/modules/stock
```
Khớp 9 dòng — **8 dòng là comment giải thích tại sao bị cấm** (nêu rõ luật AD-28 hoặc mô tả
hành vi COMMIT/ROLLBACK bình thường của một transaction). **1 dòng là mã thật**:
`stock-test-support.ts:116: await client.query('ROLLBACK');` — nằm trong `withUnitOfWork()`,
chạy khi callback `fn` (lời gọi `withdrawStock`) ném lỗi *bất ngờ* (không phải trường hợp
"hết hàng" — trường hợp đó trả `applied:false`, một giá trị, không phải throw). Đây là xử lý
lỗi tiêu chuẩn cho MỘT transaction thật trên MỘT connection mà chính lời gọi đó vừa mở — nó
KHÔNG được dùng để **cô lập giữa các test** (việc đó là của `truncateAllTables`, dùng TRUNCATE
đúng như AD-28 yêu cầu). Không có bất kỳ chỗ nào dùng rollback để "undo" dữ liệu giữa các
lần chạy hay giữa các test.

### `npm run lint` / `npm run build`

**KHÔNG exit 0** cho `apps/api` — xem giải thích và cân nhắc ở mục 5. Các workspace khác
(`glue`, `apps/storefront`, `packages/shared`, `packages/ui`, `e2e`) đều PASS cả lint lẫn
build; chỉ `apps/api` FAIL.

```
▸ apps/api · lint / build (giống nhau)
src/modules/stock/stock-conditional-delta.race-spec.ts(30,31): error TS2307: Cannot find
  module './stock.service' or its corresponding type declarations.
... (tương tự cho 3 file còn lại)
src/modules/stock/stock-ledger-matches-quantity.int-spec.ts(44,10): error TS18046:
  'result' is of type 'unknown'.
... (7 dòng TS18046 tương tự — hệ quả của TS2307 ở trên)
```

## 5. Vì sao `tsc` (lint/build) KHÔNG xanh — và vì sao đây KHÔNG phải lỗi của task này

Toàn bộ lỗi thuộc hai loại, cả hai đều BẮT NGUỒN TRỰC TIẾP từ việc `./stock.service` chưa
tồn tại (đúng như thiết kế — T009 tạo nó):

1. **`TS2307` Cannot find module './stock.service'`** — chính là "thiếu module" mà brief mô
   tả là lý do ĐỎ ĐÚNG cho `npm test`. `tsc --noEmit`/`tsc -p tsconfig.build.json` là kiểm
   tra TOÀN CHƯƠNG TRÌNH — nó sẽ luôn báo lỗi này chừng nào import trỏ tới một file không
   tồn tại, bất kể file đó nằm ở đâu. Đây là hệ quả **không tránh được** của chính yêu cầu
   "test ĐỎ vì thiếu module" — không có cách viết test nào import từ một đường dẫn T009 sẽ
   tạo mà lại làm `tsc` toàn chương trình xanh trước khi đường dẫn đó tồn tại.
2. **`TS18046` 'x' is of type 'unknown'`** — hệ quả suy diễn kiểu của (1): vì `withdrawStock`
   không suy được kiểu thật, `withUnitOfWork<T>` không suy được `T` cụ thể, và biến kết quả
   rơi về `unknown` ở vài chỗ tôi có kiểm tra `if (!result.applied)` trước khi dùng. Sẽ tự
   biến mất khi T009 tạo `stock.service.ts` với kiểu `WithdrawStock` thật.

Tôi đã **loại bỏ** một nguyên nhân ĐỎ thứ ba không nên tồn tại: ban đầu đặt file hạ tầng
dùng chung ở `apps/api/test/db-helper.ts` gây thêm `TS6059` (vi phạm `rootDir`) — đã sửa
bằng cách chuyển file đó vào `src/modules/stock/stock-test-support.ts` (mục 2). Đây là phần
tôi CÓ THỂ và ĐÃ sửa trong phạm vi được phép.

**Tôi đã KHÔNG**: sửa `apps/api/tsconfig.json`/`tsconfig.build.json` (loại trừ các hậu tố
`*.int-spec.ts`/`*.race-spec.ts` khỏi build sẽ giải quyết phần build, nhưng hai file đó nằm
ngoài phạm vi được phép của T008 — không có trong danh sách Allowed); KHÔNG viết một stub
hiện thực cho `stock.service.ts` để ép `tsc` xanh (bị cấm tường minh — sẽ làm mờ ranh giới
ĐỎ và là chính xác thứ "sai quy trình" mà brief cảnh báo).

**Khuyến nghị cho controller/T009**: `apps/api/tsconfig.build.json` hiện loại trừ
`"**/*.spec.ts"`/`"**/*.test.ts"` nhưng KHÔNG loại trừ `"**/*.int-spec.ts"`/
`"**/*.race-spec.ts"` — đây là một khoảng trống có sẵn từ T001, không phải do T008 tạo ra,
và nó cũng sẽ ảnh hưởng `npm run build` SAU KHI T009 hiện thực xong (build production sẽ cố
biên dịch cả file test chạm DB, dù không còn lỗi module-not-found nữa). Sửa exclude glob của
`tsconfig.build.json` để thêm hai hậu tố này là việc hợp lý cho một task riêng (có thể là
phần đầu của T009, hoặc một T00x-fix nhỏ) — KHÔNG phải việc của T008 vì file đó ngoài phạm
vi được phép.

## 6. Tự soát (self-review)

- **Không mã hiện thực lọt vào `stock/`**: `stock.contract.ts` chỉ có `import type`,
  `export type`, `export interface` — không một câu lệnh runtime nào. `stock-test-support.ts`
  chứa mã chạy được, nhưng toàn bộ là hạ tầng test (pool/truncate/seed/transaction-wrapper),
  không một dòng nào hiện thực `withdrawStock` hay bất kỳ quy tắc nghiệp vụ nào của `stock`.
  Không có file `stock.service.ts` — đúng như brief yêu cầu (đó là việc của T009).
- **Luật cô lập AD-28**: TRUNCATE cho dọn dẹp (`truncateAllTables`, dùng trong `beforeEach`
  hoặc đầu mỗi vòng lặp race); N kết nối độc lập thật (mỗi `withUnitOfWork` = một
  `pool.connect()` riêng); không transaction-rollback dùng để cô lập test (ROLLBACK duy nhất
  trong code là xử lý lỗi tiêu chuẩn của MỘT unit-of-work, không phải cơ chế dọn dẹp — mục
  4); không `CREATE TABLE` ở đâu cả (đã grep xác nhận không có, dựa hoàn toàn vào
  `npm run db:migrate`); PostgreSQL thật qua `DATABASE_URL`, không pg-mem/SQLite.
- **N ≥ 20, M ≥ 5**: `CONCURRENT_WITHDRAWALS = 25` (dòng 34), `INITIAL_QUANTITY = 8` (dòng
  33) trong `stock-conditional-delta.race-spec.ts`.
- **Không mở rộng phạm vi**: chỉ chạm `apps/api/jest.config.js` (mới),
  `apps/api/package.json` (script `test` + xoá field `jest` nhúng — giải thích ở mục 3),
  `apps/api/src/modules/stock/**` (chỉ file test + `stock.contract.ts` type-only +
  `stock-test-support.ts` hạ tầng test). KHÔNG chạm `apps/api/tsconfig*.json`,
  `db/**`, `ops/**`, `docs/baseline/**`, `specs/**`, `packages/**`, `apps/storefront/**`,
  `apps/api/src/modules/catalog/**`, root `package.json`. Không thêm dependency nào (dùng
  `pg`/`@types/pg` đã có sẵn ở root, hoisted qua npm workspaces — không sửa
  `apps/api/package.json#dependencies`).
- **Không tự tạo `stock.service.ts` dù chỉ để thử**: xác nhận bằng script tạm ĐỘC LẬP (không
  nằm trong `apps/api/`, không import bất kỳ file nào của module `stock`) để kiểm chứng các
  câu SQL/mã lỗi trước khi viết assertion — script đó đã xoá, không có dấu vết trong git
  status.

## 7. File đã thay đổi

```
apps/api/jest.config.js                                             (mới)
apps/api/package.json                                                (sửa: script test, xoá field "jest")
apps/api/src/modules/stock/stock.contract.ts                        (mới, type-only)
apps/api/src/modules/stock/stock-test-support.ts                    (mới, hạ tầng test)
apps/api/src/modules/stock/stock-conditional-delta.race-spec.ts     (mới)
apps/api/src/modules/stock/stock-never-negative.int-spec.ts         (mới)
apps/api/src/modules/stock/stock-ledger-matches-quantity.int-spec.ts (mới)
apps/api/src/modules/stock/stock-ledger-restrict.int-spec.ts        (mới)
```

## 8. Concerns

1. **`npm run lint`/`npm run build` không exit 0 cho `apps/api`** — đã giải thích đầy đủ ở
   mục 5. Đây là hệ quả cấu trúc của việc test phải ĐỎ vì thiếu module, kết hợp với việc
   không được sửa `tsconfig*.json`. Tôi tin đây là kết quả ĐÚNG cho task này (brief cho phép
   tường minh), nhưng cần controller xác nhận vì AC gốc ghi "exit 0" không kèm ngoại lệ rõ
   trong chính task-008-brief.md (ngoại lệ nằm ở chỉ dẫn cấp trên tôi nhận được).
2. **Khoảng trống có sẵn ở `tsconfig.build.json`** (không loại trừ `*.int-spec.ts`/
   `*.race-spec.ts`) sẽ còn ảnh hưởng `npm run build` cả SAU KHI T009 xong, trừ khi ai đó sửa
   exclude glob — nêu ở mục 5, ngoài phạm vi T008.
3. `withdrawStock` chỉ hỗ trợ RÚT (delta âm) — đủ cho bốn test và đúng những gì `000` cần
   (không có luồng restock/huỷ đơn thật ở `000`), nhưng nếu một task sau cần cộng tồn kho
   qua cùng đường ghi, đó là một MỞ RỘNG hợp đồng (tham số/hàm mới), không phải một cách hiểu
   khác của `WithdrawStock` hiện tại — nêu rõ để không ai đoán nhầm khi đọc report này.
