# Task T008 — Bốn test bất biến tồn kho, tất cả phải ĐỎ trước T009

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T008**, `tasks.md` §Phase 3 (US2)
- **Owns**: `AC-AD21`, `AC-AD28`, `SC-002` — ba tiêu chí nghiệm thu, task này là chủ sở hữu duy nhất
- Spec: `spec.md` User Story 2, kịch bản 5/6/7; `AC-AD1`, `AC-AD21`, `AC-AD27`, `AC-AD28`; `SC-002`
- Data model: `specs/000-walking-skeleton/data-model.md` §Module `stock`, §Quy tắc kiểm chứng
- Architecture: `docs/baseline/architecture.md` AD-1, AD-21, AD-23, AD-27, AD-28

## Objective

**Đây là lý do feature 000 tồn tại.** Viết bằng chứng chạy được cho bất biến trung tâm của sản
phẩm: tồn kho không bao giờ âm, và số lần rút thành công không bao giờ vượt lượng có thật —
trên PostgreSQL **thật**, dưới tải đồng thời **thật**.

Cả bốn test phải **ĐỎ** khi bạn giao nộp. T009 là task làm chúng xanh. Test xanh ở task này
nghĩa là bạn đã viết cả code lẫn test — sai quy trình, và review sẽ trả lại.

## Requirements

### Bốn file, đúng tên, trong `apps/api/src/modules/stock/`

1. **`stock-conditional-delta.race-spec.ts`** — test quan trọng nhất của cả feature.
   - Tồn kho ban đầu **M ≥ 5**; **N ≥ 20** kết nối **độc lập**, mỗi kết nối rút **1** đơn vị.
   - Khẳng định: **đúng M** lần thành công · **N − M** lần trả về "0 dòng bị ảnh hưởng"
     (kết quả **hợp lệ**, không phải exception) · `stock.quantity` cuối **bằng 0** ·
     không thời điểm nào âm.
   - **Chạy lại ≥ 10 lần liên tiếp trên cùng một database, không dựng lại nó**, kết quả
     **giống hệt** mỗi lần (SC-002, AD-28).
2. **`stock-never-negative.int-spec.ts`** — không đường nào đưa `quantity` xuống dưới 0;
   ràng buộc `CHECK` của database là hàng rào cuối, và test phải chứng minh nó chặn thật.
3. **`stock-ledger-matches-quantity.int-spec.ts`** — mỗi lần ghi thành công sinh **đúng một**
   dòng `stock_ledger`, và `quantity_after` của dòng đó **khớp** `stock.quantity` sau thao tác.
4. **`stock-ledger-restrict.int-spec.ts`** — xoá một `product` đang có dòng sổ cái bị chặn
   **ở tầng dữ liệu** bởi `ON DELETE RESTRICT` (AD-24), không phải bởi một lệnh `if` trong code.

### Luật cô lập — AD-28, không thương lượng

- Chạy trên **trạng thái đã commit**. Mỗi tiến trình tranh chấp dùng **kết nối riêng của nó**.
- Dọn dẹp bằng **`TRUNCATE`**. **KHÔNG BAO GIỜ** cô lập bằng transaction rollback — cách đó
  gộp N tiến trình vào một transaction, tranh chấp biến mất, và test xanh một cách vô nghĩa.
  `architecture.md` gọi thẳng đây là thứ tệ hơn không có test.
- **KHÔNG BAO GIỜ** nhiều promise trên **một** kết nối: `Promise.all` trên một client `pg`
  tuần tự hoá các câu lệnh và giết mất tranh chấp. Dùng N client/pool-connection riêng biệt,
  và đảm bảo pool đủ lớn cho N.
- Mọi test **tự tạo dữ liệu nó cần**; không giả định database sạch, không phụ thuộc thứ tự
  chạy, không phụ thuộc `db:seed`.
- Lược đồ test dựng bằng **đúng** `npm run db:migrate` của T004 (AD-25). **Không** `CREATE TABLE`
  trong test helper. Nếu thiếu bảng, chạy migration — đừng dựng lược đồ bằng đường riêng.
- Database thật, PostgreSQL 18.6 trong `ops/compose.yaml` (AD-27). **Không** `pg-mem`, không
  SQLite, không repository giả. Nối bằng `DATABASE_URL`.

### Giao diện mà T009 sẽ phải khớp

`stock` chưa tồn tại, nên test của bạn **định nghĩa** hợp đồng. Hãy khai nó rõ ràng ở một chỗ
(một file type/interface nhỏ trong thư mục test, hoặc import từ đường dẫn mà T009 sẽ tạo) và
**ghi nguyên văn chữ ký đó vào report** — T009 sẽ được lệnh hiện thực **đúng** chữ ký này.
Ràng buộc từ AD-23 mà chữ ký phải thể hiện: service **nhận đơn vị công việc làm tham số** khi
tham gia thao tác lớn hơn và **không bao giờ tự mở cái nó đã nhận**.

Đường ghi là **một câu `UPDATE` có điều kiện trên giá trị đang có**
(`SET quantity = quantity - :n WHERE product_id = :id AND quantity >= :n`), và **số dòng bị
ảnh hưởng = 0 là giá trị trả về hợp lệ**. Test phải khẳng định điều đó như một **giá trị**,
không bắt exception.

### Hạ tầng test

- Cấu hình **Jest 30.4.2** cho `apps/api` (`jest.config.*`), chạy được `*.int-spec.ts` và
  `*.race-spec.ts`. Bỏ `--passWithNoTests` khỏi script `test` của `apps/api` khi đã có test thật.
- Race test **không** chạy song song với các test khác trên cùng bảng: cấu hình để nó chạy
  tuần tự (worker đơn cho file đó, hoặc chạy nối tiếp). Song song *bên trong* test là điểm
  của nó; song song *giữa các file* trên cùng dữ liệu là nguồn lỗi giả.
- Test cần database chạy. Nếu `DATABASE_URL` không nối được, test phải **thất bại rõ ràng**
  với thông điệp nói cần chạy `docker compose -f ops/compose.yaml up -d postgres`, **không**
  được tự động bỏ qua (skip). Một test tự skip khi thiếu database là cách bất biến trung tâm
  âm thầm biến mất khỏi CI.

## Architecture decisions ràng buộc task này

- **AD-21** — feature **chưa xong** cho tới khi có test tải đồng thời thật mang tên nó, chạy
  được bằng lệnh trong `docs/baseline/verification.md`. Nếu `npm test` không chạy tới test của
  bạn, **sửa hợp đồng chứ đừng bỏ test** — nhưng `verification.md` nằm ngoài phạm vi của bạn:
  nếu cần sửa nó, DỪNG và báo controller.
- **AD-27** — PostgreSQL thật, cùng dòng phiên bản với prod.
- **AD-28** — luật cô lập ở trên.
- **AD-23** — đơn vị công việc do **đường vào** mở. Ở feature này, chính test đóng vai đường
  vào (không có HTTP cho đường ghi — `plan.md` §Ghi chú 2).
- **AD-1** — delta có điều kiện, không đọc-rồi-ghi.

## Scope

**Allowed**
```text
apps/api/src/modules/stock/**   (CHỈ file test và type khai hợp đồng — không mã hiện thực)
apps/api/jest.config.*          apps/api/test/**        apps/api/package.json  (script `test`)
.sdd/000-walking-skeleton/task-008-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/storefront/**   apps/api/src/modules/catalog/**   packages/**   e2e/**
db/**   ops/**   docs/baseline/**   specs/**   scripts/**   tests/**   package.json (gốc)
Mọi file KHÔNG PHẢI test trong apps/api/src/modules/stock/  ← T009 sở hữu
```

## Acceptance criteria của task

- Bốn file tồn tại, đúng tên, đúng hậu tố (`.race-spec.ts` / `.int-spec.ts`).
- `npm test` chạy tới chúng và **cả bốn ĐỎ**. Dán output đỏ thật vào report, kèm lý do vì sao
  mỗi cái đỏ (thiếu module/hàm, chứ không phải lỗi cú pháp hay lỗi kết nối).
- `grep -rniE "rollback|BEGIN;|pg-mem|sqlite" apps/api/src/modules/stock apps/api/test`
  không khớp gì (trừ comment giải thích vì sao bị cấm — nói rõ trong report nếu giữ).
- Race test dùng **N ≥ 20 kết nối độc lập** và **M ≥ 5** — chỉ ra đúng dòng code trong report.
- Report ghi **nguyên văn chữ ký** service mà T009 phải hiện thực.
- `npm run lint`, `npm run build` exit 0 (test đỏ là do khẳng định/thiếu module, không phải do
  TypeScript không biên dịch được toàn workspace — nếu buộc phải để `tsc` đỏ, nói rõ trong report).

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate
npm test            # phải ĐỎ ở đúng bốn test này
npm run lint
npm run build
```

## Dependencies

T001 (workspace + Jest 30.4.2) · T002 (`postgres`, `DATABASE_URL`) · T004 (lược đồ năm bảng).
**Không** phụ thuộc T005 (seed) — test tự tạo dữ liệu của nó.

## Previous task outputs

- `ops/.env.example`: `DATABASE_URL`, `API_PORT`, `NODE_ENV`, `PRODUCT_IMAGE_PATH`.
- T004 định nghĩa schema Drizzle ở `db/schema/` và migration ở `db/migrations/`; đọc
  `.sdd/000-walking-skeleton/task-004-report.md` để biết tên module và cách nối.
- Dịch vụ `postgres` là **dùng chung, không dựng lại mỗi lần chạy** — nó đang chạy sẵn.
