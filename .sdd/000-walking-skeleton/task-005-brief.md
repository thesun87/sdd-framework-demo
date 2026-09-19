# Task T005 — `db/seed.ts`: nạp Sản phẩm mẫu, idempotent, không bao giờ chạy ở prod

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T005**, `tasks.md` §Phase 2
- **Owns**: — (không sở hữu tiêu chí nghiệm thu; nhưng `SC-007` phụ thuộc nó)
- Quyết định của người, 2026-09-19: `plan.md` §Quyết định đã chốt **(A)** — seed bằng script
  riêng, **không** bằng migration
- Data model: `specs/000-walking-skeleton/data-model.md`

## Objective

Một lệnh nạp dữ liệu mẫu để trang chủ có **một Sản phẩm thật** để hiển thị. Nó phải nằm trong
kho mã, không nằm trong đầu ai đó — `SC-007` đòi dựng lại toàn hệ thống từ kho sạch bằng các
bước đã ghi, không thao tác tay.

## Requirements

1. **`db/seed.ts`** — tách **hẳn** khỏi `db/migrations/`. Không sinh migration, không gọi
   `drizzle-kit`. Dùng `drizzle-orm` + `pg` đã pin ở root.
2. **Idempotent**: chạy lại nhiều lần cho **cùng một trạng thái**, không nhân bản dữ liệu,
   không lỗi ở lần thứ hai. `SC-007` phụ thuộc trực tiếp vào tính chất này.
3. **Không bao giờ chạy ở prod**: đọc `NODE_ENV` (tên biến đã chốt ở T002) và **thoát với lỗi
   rõ ràng** nếu là `production`. Đây là hàng rào chạy được, không phải một dòng comment.
4. **Nội dung tối thiểu phải nạp**:
   - **một** `category`;
   - **một** `product` thuộc category đó, có `description` không rỗng và `price` là số nguyên
     VND đã gồm VAT (ví dụ `149000`);
   - **ít nhất một** `product_image` cho product đó, `position` bắt đầu từ 0;
   - **một** dòng `stock` cho product đó với `quantity > 0`.
   `name_normalized` điền đúng quy tắc chuẩn hoá lúc ghi (AD-11) — bỏ dấu tiếng Việt, hạ chữ
   thường. Nếu bạn phải chọn một quy tắc cụ thể, chọn cái đơn giản nhất và **ghi rõ trong
   report** để T011 dùng lại đúng quy tắc đó.
5. **Không** ghi `stock_ledger` ở seed. Sổ cái ghi lại **thay đổi** tồn kho; trạng thái ban
   đầu của dữ liệu mẫu không phải một thay đổi nghiệp vụ. Nếu bạn cho rằng cần, DỪNG và báo —
   đừng tự quyết.
6. **Script `db:seed`** trong `package.json` gốc. Node 24 chạy TypeScript trực tiếp được;
   nếu bạn cần một runner, dùng thứ đã có trong cây phụ thuộc, **đừng** thêm dependency mới.
7. **Ảnh**: `product_image.path` là đường dẫn trên hệ tệp (AD-15), không phải blob. Trỏ vào
   `PRODUCT_IMAGE_PATH` theo quy ước của `ops/.env.example`. Không cần tệp ảnh thật ở task này;
   nếu bạn tạo một tệp ảnh placeholder, nó phải nằm trong volume/thư mục đã khai, không nằm
   rải rác trong repo.

## Architecture decisions ràng buộc task này

- **AD-25** — chỉ phủ **migration lược đồ**. Dữ liệu mẫu **không** được nhét vào migration:
  đó chính là lý do người quyết chốt (A). Đừng "tiện tay" chuyển nó thành migration.
- **AD-15** — ảnh trên hệ tệp cục bộ, không blob.
- **AD-11** — `name_normalized` chuẩn hoá lúc ghi.
- **AD-16** — phụ thuộc runtime chỉ PostgreSQL + hệ tệp. Không thêm thư viện faker, không
  thêm CLI framework.

## Scope

**Allowed**
```text
db/seed.ts      package.json  (chỉ thêm script `db:seed`)
.sdd/000-walking-skeleton/task-005-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
db/migrations/**   db/drizzle.config.ts   db/schema/**  (T004 sở hữu — chỉ ĐỌC, không sửa)
apps/**   packages/**   e2e/**   ops/**   docs/baseline/**   specs/**   scripts/**   tests/**
```

## Acceptance criteria của task

- Trên database đã `db:migrate`: `npm run db:seed` exit 0 và tạo đúng 1 category, 1 product,
  ≥ 1 product_image, 1 dòng stock với `quantity > 0`.
- Chạy `npm run db:seed` **lần thứ hai và thứ ba**: exit 0, và `SELECT count(*)` của cả bốn
  bảng **không đổi**. Dán output thật của cả ba lần vào report.
- `NODE_ENV=production npm run db:seed` **thoát khác 0** với thông điệp rõ ràng. Dán output.
- `SELECT * FROM stock_ledger` sau seed trả về **0 dòng**.
- `grep -rn "stock_ledger" db/seed.ts` không khớp gì.
- Bốn lệnh hợp đồng vẫn exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate
npm run db:seed && npm run db:seed && npm run db:seed
NODE_ENV=production npm run db:seed ; echo "exit=$?"
npm test && npm run lint && npm run build
```

## Dependencies

T004 (lược đồ đã có). T002 (`DATABASE_URL`, `NODE_ENV`, `PRODUCT_IMAGE_PATH`).

## Previous task outputs

T004 định nghĩa schema Drizzle ở `db/schema/` và migration ở `db/migrations/`. Import schema
từ đó — **không** khai lại bảng trong `seed.ts`; hai định nghĩa song song là chính xác thứ
AD-10/AD-25 muốn tránh. Đọc `.sdd/000-walking-skeleton/task-004-report.md` để biết tên module
schema thực tế.
