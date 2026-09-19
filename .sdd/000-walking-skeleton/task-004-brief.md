# Task T004 — Drizzle Kit + migration đầu tiên: năm bảng, hai module

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T004**, `tasks.md` §Phase 2
- **Owns**: `AC-AD25` (lược đồ dựng bằng migration tuần tự, chỉ tiến, áp từ một nơi duy nhất,
  **trước khi** ứng dụng khởi động; lược đồ test dựng bằng đúng lệnh áp cho prod)
- Data model (hợp đồng đầy đủ, đọc kỹ): `specs/000-walking-skeleton/data-model.md`
- Architecture: `docs/baseline/architecture.md` AD-1, AD-2, AD-4, AD-5, AD-11, AD-24, AD-25

## Objective

Dựng lược đồ **năm bảng** của feature 000 bằng Drizzle Kit **0.31.10**, áp bằng
`drizzle-kit migrate` như một **bước riêng trước khi app khởi động**. Bất biến trung tâm của
sản phẩm — tồn kho không bao giờ âm — sống **trong ràng buộc `CHECK` của database**, không
trong code.

## Requirements

1. **`db/drizzle.config.ts`** — cấu hình Drizzle Kit: dialect `postgresql`, đường dẫn schema,
   thư mục output `db/migrations/`, chuỗi kết nối đọc từ **`DATABASE_URL`** (tên biến đã chốt
   ở T002, Ruling R4 — không đặt tên khác).
2. **Định nghĩa schema** bằng Drizzle (TypeScript), rồi **sinh** migration bằng
   `drizzle-kit generate`. Tên file migration **mang dấu thời gian**, không phải số đếm.
3. **Năm bảng, đúng `data-model.md`** — mọi cột, kiểu và ràng buộc dưới đây là bắt buộc:

   **`category`**: `id` bigint identity PK · `name` text NOT NULL · `name_normalized` text
   NOT NULL · `created_at` timestamptz NOT NULL default `now()`

   **`product`**: `id` bigint identity PK · `category_id` bigint NULL, FK → `category.id` ·
   `name` text NOT NULL · `name_normalized` text NOT NULL · `description` text NOT NULL
   default `''` · `price` **bigint** NOT NULL **`CHECK (price >= 0)`** · `created_at`
   timestamptz NOT NULL default `now()`
   **Không** cột `slug`. **Không** cột trạng thái "ngừng bán" (FR-26, thuộc feature `009`).

   **`product_image`**: `id` bigint identity PK · `product_id` bigint NOT NULL, FK →
   `product.id` **`ON DELETE CASCADE`** · `path` text NOT NULL · `position` int NOT NULL

   **`stock`**: `product_id` bigint **PK**, FK → `product.id` **`ON DELETE CASCADE`** ·
   `quantity` int NOT NULL **`CHECK (quantity >= 0)`** ← bất biến trung tâm ·
   `updated_at` timestamptz NOT NULL

   **`stock_ledger`** (append-only): `id` bigint identity PK · `product_id` bigint NOT NULL,
   FK → `product.id` **`ON DELETE RESTRICT`** · `delta` int NOT NULL **`CHECK (delta <> 0)`** ·
   `quantity_after` int NOT NULL **`CHECK (quantity_after >= 0)`** · `reason` enum NOT NULL với
   **đúng ba giá trị** `order_placed | order_cancelled | manual_adjustment` ·
   `order_id` bigint NULL **KHÔNG khoá ngoại** (giá trị trần — AD-24: `stock` không được biết
   `ordering` tồn tại) · `actor_account_id` bigint NULL · `created_at` timestamptz NOT NULL
   default `now()`

4. **Tiền và thời gian**: tiền là `bigint` VND **nguyên**, không kiểu dấu phẩy động, không
   `numeric` có phần thập phân. Thời gian là `timestamptz` (UTC).
5. **Script `db:migrate`** trong `package.json` gốc, chạy `drizzle-kit migrate`.
   **`drizzle-kit push` bị cấm ở MỌI môi trường, kể cả máy dev** (AD-25). Không thêm script
   `db:push`, không nhắc `push` trong tài liệu bạn viết.
6. **Mô tả migration**: kèm một comment ở đầu file SQL sinh ra (hoặc một file
   `db/migrations/README.md` nếu Drizzle ghi đè comment) nói rõ migration này **giữ nguyên**
   ràng buộc nào của AD-1 (`CHECK (quantity >= 0)`) và của AD-24 (`RESTRICT` trên sổ cái,
   `order_id` không FK). AD-25 đòi mọi migration chạm `stock` phải nói điều đó.
7. **Áp từ một nơi duy nhất**: lược đồ của database test dựng bằng **đúng** lệnh `db:migrate`
   này. Không viết đường riêng cho test (`CREATE TABLE` trong test helper là vi phạm AD-25 và
   sẽ bị bắt ở review của T008).

## Architecture decisions ràng buộc task này

- **AD-25** — migration tuần tự, **chỉ tiến**, một nguồn áp duy nhất, chạy **trước** khi app
  khởi động. Không migration lùi. Không app tự chạy migration lúc boot.
- **AD-24** — `stock.product_id` CASCADE; `stock_ledger.product_id` **RESTRICT** (sổ cái là
  bản kiểm toán, xoá Sản phẩm có sổ cái phải bị chặn ở **tầng dữ liệu**); `stock_ledger.order_id`
  **không** FK.
- **AD-1** — tồn kho không bao giờ âm. `CHECK (quantity >= 0)` **là** nơi bất biến sống.
- **AD-4** — enum `reason` giữ **đủ ba** giá trị ngay từ `000`, dù `000` chỉ sinh một loại.
  Enum là hợp đồng dữ liệu; mở rộng sau là một migration nữa.
- **AD-11** — `name_normalized` chuẩn hoá **lúc ghi**; ở task này chỉ cần **cột tồn tại**,
  việc điền nó là T011.
- **Constitution §VI** — `drizzle-kit` 0.31.10, `drizzle-orm` 0.45.2, đã pin ở T001.

## Scope

**Allowed**
```text
db/migrations/**      db/drizzle.config.ts      db/schema/**  (định nghĩa schema Drizzle)
package.json          (chỉ thêm script `db:migrate`)
.sdd/000-walking-skeleton/task-004-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/**   packages/**   e2e/**   ops/**   docs/baseline/**   specs/**   scripts/**   tests/**
db/seed.ts  (T005 sở hữu)
```

## Acceptance criteria của task

- `docker compose -f ops/compose.yaml up -d postgres` rồi `npm run db:migrate` exit 0 trên
  một database **trống**, và tạo đúng năm bảng.
- Chạy `npm run db:migrate` **lần thứ hai** không lỗi và không đổi gì (idempotent theo nghĩa
  của migration: không áp lại cái đã áp).
- Kiểm bằng `psql` (hoặc `docker compose exec postgres psql`) và ghi **output thật** vào report:
  - `\d stock` cho thấy `CHECK (quantity >= 0)`;
  - `\d stock_ledger` cho thấy `CHECK (delta <> 0)`, `CHECK (quantity_after >= 0)`,
    FK `RESTRICT` tới `product`, và **không** FK nào trên `order_id`;
  - `\d product` cho thấy `CHECK (price >= 0)` và `price` kiểu `bigint`;
  - enum `reason` có đúng ba nhãn.
- Chứng minh `CHECK` thật sự chặn: `UPDATE stock SET quantity = -1` bị database từ chối —
  dán lỗi thật vào report.
- Chứng minh `RESTRICT` thật sự chặn: `DELETE FROM product` khi có dòng `stock_ledger` bị từ
  chối — dán lỗi thật vào report.
- `grep -rn "drizzle-kit push\|db:push" package.json db/` không khớp gì.
- Bốn lệnh hợp đồng vẫn exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate
npm test && npm run lint && npm run build
```

## Dependencies

T001 (deps `drizzle-orm` 0.45.2 / `drizzle-kit` 0.31.10 / `pg` đã pin ở root) ·
T002 (dịch vụ `postgres`, biến `DATABASE_URL`).

## Previous task outputs

- `ops/.env.example` liệt kê `DATABASE_URL`, `API_PORT`, `NODE_ENV`, `PRODUCT_IMAGE_PATH`.
  Dùng đúng `DATABASE_URL`, không đặt tên mới.
- `package.json` gốc đã có `workspaces` và các script hợp đồng; chỉ thêm `db:migrate`.
