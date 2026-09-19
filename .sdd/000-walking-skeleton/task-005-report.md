# Task T005 — Báo cáo: `db/seed.ts` (nạp Sản phẩm mẫu, idempotent, không chạy ở prod)

## Trạng thái: DONE

## 1. Đã làm gì

- `db/seed.ts` (mới) — script riêng, **tách hẳn** khỏi `db/migrations/`, không sinh migration,
  không gọi `drizzle-kit`. Import bảng từ `db/schema/index.js` (`category`, `product`,
  `productImage`, `stock`) — không khai lại lược đồ.
- Hàng rào chạy được: nếu `process.env.NODE_ENV === 'production'` → `console.error` thông
  điệp rõ ràng + `process.exit(1)` — chạy trước cả việc đọc `DATABASE_URL`.
- Nạp trong **một transaction** (`db.transaction`):
  - 1 `category` — "Đồ uống".
  - 1 `product` thuộc category đó — "Cà phê sữa đá", `description` không rỗng, `price = 25000`
    (VND nguyên, đã gồm VAT).
  - 1 `product_image` cho product đó — `path = "${PRODUCT_IMAGE_PATH}/ca-phe-sua-da.jpg"`
    (mặc định `PRODUCT_IMAGE_PATH=/data/product-images` khi biến chưa set, khớp
    `${PRODUCT_IMAGE_PATH:-/data/product-images}` của `ops/compose.yaml`), `position = 0`.
    Không tạo file ảnh thật (task không yêu cầu).
  - 1 dòng `stock` cho product đó, `quantity = 50`, `updated_at = new Date().toISOString()`.
  - **Không** ghi vào bảng sổ cái tồn kho (yêu cầu #5) — xem mục 6.
- `package.json`: thêm đúng một script `"db:seed": "tsx db/seed.ts"`.

### Cơ chế idempotent (yêu cầu #2)

Lược đồ T004 **không** có ràng buộc UNIQUE trên `category.name`/`product.name` (chỉ PK
`id` tự sinh identity), nên idempotency cho hai bảng đó là logic ứng dụng — tra trước khi
ghi:
- `category`, `product`: `SELECT ... WHERE name_normalized = $1 LIMIT 1`; có thì dùng `id` cũ,
  không thì `INSERT ... RETURNING id`.
- `product_image`: `SELECT ... WHERE product_id = $1 AND path = $2 LIMIT 1`; có thì bỏ qua.
- `stock`: PK = `product_id` → `INSERT ... ON CONFLICT (product_id) DO NOTHING` — idempotent
  **ở tầng database**, không chỉ tầng ứng dụng.

Toàn bộ nằm trong một transaction nên lần chạy thứ hai không bao giờ thấy trạng thái nửa vời.

### Quy tắc chuẩn hoá `name_normalized` (AD-11) — **T011 phải dùng lại nguyên văn**

```ts
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
```

Thứ tự bắt buộc:
1. `.toLowerCase()` trước (đưa "Đ" → "đ").
2. Thay `đ` → `d` bằng tay — "đ" (U+0111) là **một chữ cái riêng**, Unicode NFD **không**
   tách nó thành "d" + dấu, nên phải xử lý trước khi NFD chạy.
3. `.normalize('NFD')` rồi xoá mọi dấu kết hợp (`U+0300`–`U+036F`) — bỏ dấu các nguyên âm còn
   lại.
4. `.trim()`.

Ví dụ thật đã kiểm chứng qua chạy seed: `"Đồ uống"` → `"do uong"`; `"Cà phê sữa đá"` →
`"ca phe sua da"`.

## 2. Lệnh đã chạy và output thật

### Chuẩn bị (database trống, đã migrate)
```
$ export DATABASE_URL=postgres://app:app@localhost:5432/shop
$ npm run db:migrate
[✓] migrations applied successfully!
$ docker exec shop-online-postgres-1 psql -U app -d shop -c \
    "SELECT count(*) FROM category; ... FROM stock_ledger;"
→ cả năm SELECT đều trả 0
```

### Lần 1 (`npm run db:seed`)
```
> tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
exit=0
```
Đếm sau lần 1 (category | product | product_image | stock | stock_ledger):
```
1 | 1 | 1 | 1 | 0
```

### Lần 2
```
> tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
exit=0
```
Đếm sau lần 2: `1 | 1 | 1 | 1 | 0` — **không đổi**.

### Lần 3
```
> tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
exit=0
```
Đếm sau lần 3: `1 | 1 | 1 | 1 | 0` — **không đổi**.

(Sau đó có sửa lại hai dòng comment trong `db/seed.ts` để không chứa nguyên văn chuỗi
`stock_ledger` — xem mục 3. Đã chạy lại `npm run db:seed` một lần nữa với bản cuối cùng để
xác nhận: `exit=0`, đếm vẫn `1 | 1 | 1 | 1 | 0`, `SELECT * FROM stock_ledger` vẫn `(0 rows)`.)

### `NODE_ENV=production npm run db:seed`
```
> tsx db/seed.ts
db/seed.ts: từ chối chạy vì NODE_ENV=production. Script này chỉ nạp dữ liệu MẪU cho môi
trường phát triển/kiểm thử — không bao giờ chạy ở production.
exit=1
```

### `SELECT * FROM stock_ledger` sau seed
```
 id | product_id | delta | quantity_after | reason | order_id | actor_account_id | created_at
----+------------+-------+----------------+--------+----------+------------------+------------
(0 rows)
```

### `grep -rn "stock_ledger" db/seed.ts`
```
(không khớp gì) → grep exit=1
```
Lưu ý: bản nháp đầu tiên có nhắc "stock_ledger" trong comment giải thích lý do không ghi
bảng đó — vi phạm đúng câu chữ acceptance criteria (`grep` phải không khớp gì). Đã sửa lại
comment để diễn đạt cùng ý ("bảng sổ cái tồn kho") mà không dùng tên bảng nguyên văn. Xác
nhận lại: `grep` không còn khớp.

### Bốn lệnh hợp đồng
```
$ npm test    → PASS (glue, apps/api, apps/storefront, packages/shared, packages/ui)
$ npm run lint → PASS (glue, apps/api, apps/storefront, packages/shared, packages/ui, e2e)
$ npm run build → PASS (apps/api, apps/storefront, packages/shared, packages/ui)
$ npm run db:migrate → EXIT=0 (idempotent, migration đã áp từ trước)
```

## 3. Một quyết định kỹ thuật phát sinh giữa chừng — cách chạy TypeScript

Thử đầu tiên: `"db:seed": "node db/seed.ts"`. Thất bại:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../db/schema/index.js' imported from
db/seed.ts
```
Lý do: hỗ trợ TypeScript gốc của Node 24 (type-stripping) **không** viết lại phần mở rộng
`.js` trong import specifier thành `.ts` khi resolve — nó cần đúng file `.js` tồn tại. Các
file trong `db/schema/` dùng `import ... from './catalog.js'` (đúng quy ước NodeNext), việc
đó chạy được qua `drizzle-kit` (dùng `tsx`/esbuild nội bộ) nhưng không chạy được qua `node`
trần. Đã đổi sang `"db:seed": "tsx db/seed.ts"` — `tsx` đã có sẵn trong cây phụ thuộc (đến từ
`drizzle-kit` và `vite`/`vitest` của các workspace, xác nhận bằng `npm ls tsx`), **không**
thêm dependency mới, đúng yêu cầu #6 của brief ("nếu bạn cần một runner, dùng thứ đã có trong
cây phụ thuộc, đừng thêm dependency mới"). `package-lock.json` không đổi (`git diff --stat`
rỗng) — xác nhận không có gói mới nào được cài.

## 4. Tự soát (self-review)

- **Idempotency**: đã chứng minh bằng ba lần chạy thật, số dòng cả bốn bảng không đổi sau
  lần 2 và lần 3. Cơ chế: tra-trước-khi-ghi cho category/product/product_image,
  `ON CONFLICT DO NOTHING` (khoá chính thật) cho stock.
- **Hàng rào production**: là code (`if (process.env.NODE_ENV === 'production') { ...;
  process.exit(1); }`) chạy TRƯỚC mọi kết nối database, không phải comment. Đã chứng minh
  bằng output thật, exit code 1.
- **Không dependency mới**: `package-lock.json` không đổi; `package.json` dependencies/
  devDependencies không đổi, chỉ thêm 1 dòng script dùng `tsx` đã có sẵn.
- **Không ghi sổ cái tồn kho**: đã chứng minh bằng `SELECT * FROM stock_ledger` → 0 dòng, và
  `grep -rn "stock_ledger" db/seed.ts` → không khớp (kể cả trong comment).
- **Không chạm vùng cấm**: `git diff --stat` xác nhận chỉ `db/seed.ts` (mới) và `package.json`
  (1 dòng thêm) bị đổi. Không đụng `db/migrations/**`, `db/drizzle.config.ts`, `db/schema/**`,
  `apps/**`, `packages/**`, `e2e/**`, `ops/**`, `docs/baseline/**`, `specs/**`, `scripts/**`,
  `tests/**`.
- **Ảnh**: `product_image.path` là chuỗi đường dẫn hệ tệp trỏ vào `PRODUCT_IMAGE_PATH`, không
  phải blob (AD-15). Không tạo file ảnh thật, không tạo file rải rác trong repo.

## 5. File đã thay đổi

```
db/seed.ts     (mới) — script seed, ~155 dòng, có docblock giải thích quy tắc normalizeName
package.json   (sửa — thêm đúng 1 script "db:seed": "tsx db/seed.ts")
```

Commit: `8b109f1 feat(000): T005 — db/seed.ts: nạp 1 Sản phẩm mẫu, idempotent, chặn
NODE_ENV=production`

## 6. Concerns

- Không có concern nào chưa giải quyết. Một câu hỏi đã tự trả lời trong lúc làm (mục 3: cách
  chạy `.ts` — chọn `tsx` thay vì `node` trần) đã ghi lại rõ lý do và bằng chứng không thêm
  dependency.
- Dữ liệu seed (1 category "Đồ uống", 1 product "Cà phê sữa đá") **vẫn còn trong database**
  sau khi task này kết thúc — đúng như hướng dẫn, không dọn lại về trạng thái trống, vì task
  sau (T008 và các task hiển thị trang chủ) có thể cần một Product thật để kiểm thử/thấy kết
  quả. Postgres container vẫn đang chạy (`shop-online-postgres-1`, healthy).
- `productId`/`categoryId` được insert qua `generatedByDefaultAsIdentity()` (T004) — seed
  không truyền `id` tường minh, để database tự sinh; không phát sinh xung đột vì database
  đang trống khi lần đầu chạy trong môi trường này.

## 7. Fix theo ruling R15 — khai báo tường minh `tsx`

Controller (ruling **R15**) chỉ ra: `db:seed` chạy qua `tsx` tồn tại **chỉ nhờ hoisting** từ
`drizzle-kit`/`vite` (mục 3 ở trên) — đây là phụ thuộc runtime **ẩn**, load-bearing cho một
bước ghi trong `quickstart.md`. Nếu `drizzle-kit` hoặc `vite` đổi cây phụ thuộc, `npm run
db:seed` có thể vỡ trên một checkout sạch — đúng thứ SC-007 tồn tại để bắt, và trái
Constitution §VI (biết chính xác phiên bản đang chạy). Ruling nới rộng phạm vi cho phép của
`package.json` ra ngoài dòng script `db:seed`, cho đúng việc này.

### Đã làm
- Thêm `"tsx": "4.23.13"` vào `devDependencies` gốc — **ghim đúng bản đã resolve từ trước**
  (xác nhận bằng `npm ls tsx` trước khi sửa: mọi nơi đều `tsx@4.23.13`), không dùng `^`/`~`,
  khớp phong cách ghim cứng đã có của `typescript`/`drizzle-kit`/`@types/pg`.
- Chạy `npm install` để cập nhật `package-lock.json`.

### Lệnh và output thật

**Entry đã ghim trong `package.json`:**
```json
"devDependencies": {
  "typescript": "5.9.3",
  "drizzle-kit": "0.31.10",
  "@types/pg": "8.23.1",
  "tsx": "4.23.13"
},
```

**`npm ls tsx` sau khi cài — `tsx` giờ là phụ thuộc trực tiếp, mọi nơi khác deduped vào đúng
bản đó:**
```
sdd-framework-demo@0.1.0 .../000-walking-skeleton
├─┬ drizzle-kit@0.31.10
│ └── tsx@4.23.13 deduped
├─┬ shared@0.1.0 -> ./packages/shared
│ └─┬ vitest@5.0.1
│   └─┬ vite@8.3.0
│     └── tsx@4.23.13 deduped
├─┬ storefront@0.1.0 -> ./apps/storefront
│ └─┬ vite@8.3.0
│   └── tsx@4.23.13 deduped
├── tsx@4.23.13
└─┬ ui@0.1.0 -> ./packages/ui
  └─┬ vitest@5.0.1
    └─┬ vite@8.3.0
      └── tsx@4.23.13 deduped
```

**`npm install` — không cài phiên bản mới, chỉ ghi lại lockfile:**
```
up to date, audited 671 packages in 2s
```
`git diff --stat -- package-lock.json` → `1 file changed, 1 insertion(+)` — đúng như ruling
dự đoán, đã commit cùng thay đổi này.

**`npm run db:seed` sau khi khai báo tường minh — vẫn idempotent, đếm không đổi:**
```
=== ĐẾM TRƯỚC ===
1 | 1 | 1 | 1 | 0
=== npm run db:seed ===
> tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
exit=0
=== ĐẾM SAU ===
1 | 1 | 1 | 1 | 0
```

**Ba lệnh hợp đồng còn lại:**
```
$ npm test    → PASS (glue, apps/api, apps/storefront, packages/shared, packages/ui)
$ npm run lint → PASS (glue, apps/api, apps/storefront, packages/shared, packages/ui, e2e)
$ npm run build → PASS (apps/api, apps/storefront, packages/shared, packages/ui)
```

### File đã thay đổi (fix này)
```
package.json       (sửa — thêm "tsx": "4.23.13" vào devDependencies)
package-lock.json   (sửa — npm install, 1 dòng, tsx: deduped-only → phụ thuộc trực tiếp)
```

Commit: `0a321cb fix(000): T005 R15 — khai báo tường minh tsx@4.23.13 trong devDependencies`

### Concerns
- Không có concern mới. `tsx` giờ xuất hiện hai lần trong cây (`devDependencies` gốc + vẫn là
  dependency bắc cầu của `drizzle-kit`/`vite`) nhưng npm dedupe về đúng một bản
  (`4.23.13`) — không có hai phiên bản khác nhau cùng tồn tại.

## 8. Fix round 1/5 — finding review (Important) + 3 Minor, theo ruling R16

### Finding (verbatim, tóm tắt bối cảnh)

Review chỉ ra idempotency của `category`/`product`/`product_image` là check-then-act khoá
trên cột **mutable, không có ràng buộc** (`name_normalized`, hoặc `product_id`+`path`) —
xác nhận trên database sống: chỉ có index của PRIMARY KEY, không có UNIQUE nào khác. Hai
lỗ hổng ba lần chạy tuần tự trước đó không hề chạm tới:
1. **Chạy đồng thời**: hai tiến trình seed race qua `SELECT` trước khi cái nào `COMMIT`, có
   thể cùng thấy "chưa tồn tại" và cùng `INSERT`, sinh hai dòng trùng `name_normalized`.
2. **Sửa key từ bên ngoài**: nếu `name_normalized` của dòng đã có bị đổi mà không xoá dòng,
   lần chạy sau lookup miss và chèn trùng.

**Ruling R16** tách finding làm hai:
- **(a) Fix ngay, trong `db/seed.ts`**: khoá advisory phạm vi transaction
  (`pg_advisory_xact_lock`) ở đầu transaction seed, khoá cố định, kèm comment giải thích —
  đóng nửa "chạy đồng thời".
- **(b) Parked, KHÔNG làm**: thêm UNIQUE index trên `name_normalized` — đó là migration,
  thuộc `db/migrations/**` của T004 (đã đóng), không có acceptance criterion nào của feature
  `000` đòi hỏi nó. Ghi vào ledger cho một feature sau. Không tạo migration, không lách bằng
  cách nào khác.

### Đã làm

- **(a) Khoá advisory** — thêm đúng một câu lệnh ngay đầu `db.transaction(...)`:
  ```ts
  await tx.execute(sql`SELECT pg_advisory_xact_lock(72500001)`);
  ```
  Khoá **phạm vi transaction** (`_xact_`) — tự nhả khi transaction commit/rollback, không
  cần unlock tay, không rò khoá nếu script crash giữa chừng. Khoá cố định `72500001`, kèm
  comment tại chỗ giải thích nó chặn nửa nào của finding và vì sao không chặn được nửa còn
  lại (đã parked theo R16(b)).
- **Minor 1 — regex bỏ dấu (dòng ~68 bản trước)**: bản trước nhúng **ký tự dấu kết hợp gõ
  trực tiếp** (vô hình trong mã nguồn — chính là nguyên nhân review bắt được) thay vì escape
  Unicode. Đổi thành `.replace(/[̀-ͯ]/g, '')` — escape tường minh, sống sót qua
  diff/đổi editor/đổi encoding. Đã lập một lần regen bị lỗi lần hai (tool ghi ra `\\u0300`
  hai gạch chéo thay vì một) trước khi xác nhận đúng bằng `od -c` (dump byte thật của file) —
  xem lệnh ở dưới.
- **Minor 2 — comment giả định `PRODUCT_IMAGE_PATH` ổn định**: thêm comment ngay trên khoá
  tra-tồn-tại của `product_image` nói rõ nếu biến này đổi giữa hai lần chạy, seed sẽ chèn
  thêm một dòng ảnh thứ hai thay vì nhận ra là cùng ảnh logic. Không đổi cấu trúc khoá (đúng
  yêu cầu — chỉ ghi chú, không sửa).
- **Minor 3 — thông điệp hàng rào production**: thêm nửa "phải làm gì" — thông điệp giờ kết
  thúc bằng "Nếu bạn đang cố nạp dữ liệu mẫu cho dev/test, hãy chạy lại với
  NODE_ENV=development (hoặc test)."

### Lệnh và output thật

**Xác nhận byte thật của regex sau khi sửa (dump `od -c`, không phải nhìn qua editor có thể
tự động hiển thị sai) — hai chuỗi liền kề `\`, `u`, `0`, `3`, `0`, `0` và `\`, `u`, `0`, `3`,
`6`, `f`, không có ký tự dấu kết hợp gõ trực tiếp nào còn sót:**
```
0000560       .   r   e   p   l   a   c   e   (   /   [   \   u   0   3
0000600   0   0   -   \   u   0   3   6   f   ]   /   g   ,       '   '
```

**Hành vi chuẩn hoá — byte-for-byte giống báo cáo gốc (chạy trực tiếp hàm rút từ file, không
chỉ đọc mã):**
```
$ node -e '... normalizeName lấy nguyên văn từ db/seed.ts ...'
"ca phe sua da"
"do uong"
```

**Xoá sạch bốn bảng để dựng lại kịch bản đua từ trạng thái trống (dùng DELETE, không
TRUNCATE — TRUNCATE bị chặn bởi sandbox trong phiên này):**
```
$ docker exec shop-online-postgres-1 psql -U app -d shop -c \
    "DELETE FROM product_image; DELETE FROM stock; DELETE FROM product; DELETE FROM category; ..."
DELETE 1 (x4)
$ SELECT count(*) cả bốn bảng → 0 | 0 | 0 | 0 | 0
```

**Hai tiến trình `npm run db:seed` chạy THẬT SỰ ĐỒNG THỜI (background từ cùng một shell,
`wait` cả hai) nhắm vào cùng database sống, từ trạng thái trống:**
```
=== LOG A ===
> tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
A exit=0
=== LOG B ===
> tsx db/seed.ts
db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).
B exit=0
```

**Đếm sau khi cả hai đã xong — vẫn đúng 1/1/1/1/0, KHÔNG nhân đôi:**
```
1 | 1 | 1 | 1 | 0
```
Kiểm tra trực tiếp nội dung (không chỉ đếm) — chỉ một dòng mỗi bảng:
```
category: id=1, name="Đồ uống", name_normalized="do uong"
product:  id=1, category_id=1, name="Cà phê sữa đá", name_normalized="ca phe sua da"
```
→ Khoá advisory đã serialize hai tiến trình: tiến trình vào sau đợi tới khi tiến trình vào
trước commit/rollback xong mới được đọc, nên không còn cửa sổ đua giữa SELECT và INSERT.

**`npm run db:seed` một lần nữa sau bài test đua — vẫn idempotent:**
```
exit=0; đếm: 1 | 1 | 1 | 1 | 0
```

**`NODE_ENV=production npm run db:seed` — vẫn thoát khác 0, thông điệp giờ có cả lý do lẫn
cách sửa:**
```
db/seed.ts: từ chối chạy vì NODE_ENV=production. Script này chỉ nạp dữ liệu MẪU cho môi
trường phát triển/kiểm thử — không bao giờ chạy ở production. Nếu bạn đang cố nạp dữ liệu
mẫu cho dev/test, hãy chạy lại với NODE_ENV=development (hoặc test).
exit=1
```

**Ba lệnh hợp đồng còn lại:**
```
$ npm test    → PASS (glue, apps/api, apps/storefront, packages/shared, packages/ui)
$ npm run lint → PASS (glue, apps/api, apps/storefront, packages/shared, packages/ui, e2e)
$ npm run build → PASS (apps/api, apps/storefront, packages/shared, packages/ui)
```

### File đã thay đổi (fix round này)
```
db/seed.ts   (sửa — +24/-3 dòng: khoá advisory, regex escape tường minh, 2 comment, 1 câu
              thông điệp)
```

Commit: `9fc574f fix(000): T005 fix round 1 — khoá advisory chống đua, sửa regex, thông điệp
rõ hơn`

### Tự soát phạm vi
`git diff --stat` xác nhận CHỈ `db/seed.ts` bị đổi trong commit này — không đụng
`package.json`, `db/migrations/**`, `db/schema/**`, hay bất kỳ vùng cấm nào khác. Không tạo
migration (đúng R16(b) — parked).

### Concerns
- UNIQUE index cho `name_normalized` vẫn CHƯA có ở tầng database — đúng theo R16(b), ghi
  nhận lại ở đây để không ai hiểu nhầm phần (b) của finding đã được xử lý. Nửa "sửa key từ
  bên ngoài rồi lookup miss" của finding gốc **vẫn còn tồn tại** sau fix này — đó là hệ quả
  trực tiếp của việc parked, không phải sai sót của fix round này.
- Khoá advisory dùng số cố định `72500001` chọn tuỳ ý (không có registry khoá advisory nào
  trong repo ở thời điểm này) — nếu một task sau thêm khoá advisory khác, phải tự tra tránh
  trùng số; đáng để có một chỗ ghi tập trung nếu số lượng khoá advisory tăng lên, nhưng đó là
  việc ngoài phạm vi task này.
