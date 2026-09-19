# Task T009 — Module `stock`: đường ghi tồn kho duy nhất của hệ thống

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T009**, `tasks.md` §Phase 3 (US2)
- **Owns**: `AC-AD1` — tồn kho KHÔNG BAO GIỜ âm, qua bất kỳ đường nào
- Spec: `spec.md` US2 kịch bản 5/7; `AC-AD1`
- Data model: `specs/000-walking-skeleton/data-model.md` §Module `stock`
- Architecture: `docs/baseline/architecture.md` AD-1, AD-2, AD-4, AD-5, AD-23, AD-24

## Objective

Làm **bốn test đỏ của T008 xanh**, bằng module `stock` — chủ sở hữu **duy nhất** đường ghi vào
tồn kho trong toàn hệ thống. Không viết gì ngoài thứ cần để bốn test đó xanh.

## Requirements

1. **Entity/repository** cho `stock` và `stock_ledger`, dùng schema Drizzle của T004
   (`db/schema/`) — **không** khai lại bảng.
2. **Service công khai `stock.public.ts`** — bề mặt duy nhất mà module khác được gọi (AD-5).
   Chữ ký **phải khớp nguyên văn** hợp đồng mà T008 đã khai; đọc
   `.sdd/000-walking-skeleton/task-008-report.md` §chữ ký và dùng đúng nó. Nếu chữ ký đó mâu
   thuẫn với AD-23, **DỪNG và báo** — đừng tự sửa test của T008 để hợp với code của bạn.
3. **Đường ghi là MỘT câu `UPDATE` có điều kiện trên giá trị đang có**:
   ```sql
   UPDATE stock SET quantity = quantity - :n, updated_at = now()
   WHERE product_id = :id AND quantity >= :n
   ```
   **KHÔNG** `SELECT` rồi `UPDATE` theo giá trị vừa đọc, ở **bất kỳ** đường nào. Không
   `SELECT ... FOR UPDATE` rồi tính trong code. Không đọc `quantity` để "kiểm tra trước".
4. **Số dòng bị ảnh hưởng = 0 là giá trị trả về hợp lệ**, phải được xử lý **tường minh** —
   không phải exception, không phải `null` im lặng. Nó là một nhánh có tên trong kiểu trả về.
5. **Mỗi lần ghi thành công kèm đúng một dòng `stock_ledger`**, trong **cùng một đơn vị công
   việc** với `UPDATE`. `quantity_after` là giá trị sau thao tác. `reason` lấy từ enum ba giá
   trị; ở `000` đường duy nhất sinh ra là loại tương ứng với rút tồn kho — dùng đúng nhãn
   canonical, không thêm nhãn mới.
6. **AD-23 — đơn vị công việc**: service **nhận** đơn vị công việc làm tham số khi tham gia
   thao tác lớn hơn, và **không bao giờ tự mở cái nó đã nhận**. Ràng buộc này phải **đọc được
   ở chữ ký hàm**, không chỉ đúng ở hành vi. Không transaction lồng.
7. **`stock` không biết `ordering` tồn tại** (AD-24). `order_id` là giá trị trần, nhận vào và
   ghi xuống, **không** khoá ngoại, **không** import gì từ miền đơn hàng (miền đó chưa tồn tại —
   đừng tạo nó).
8. **Không** tạo `apps/api/src/usecases/` (plan §Structure Decision: không thao tác nào ở `000`
   chạm nhiều miền). Không tạo controller, không tạo route HTTP cho đường ghi — `plan.md`
   §Ghi chú 2: đường ghi tồn kho ở `000` **không có đường vào HTTP**.
9. **Không sửa file test của T008.** Nếu một test sai, DỪNG và báo controller — đó là tranh
   chấp giữa hai task, controller phân xử, không phải bạn.

## Architecture decisions ràng buộc task này

- **AD-1** — bất biến trung tâm: delta áp có điều kiện, không đọc-rồi-ghi, "0 dòng" là kết quả
  hợp lệ. `CHECK (quantity >= 0)` của T004 là hàng rào cuối, **không phải** lý do để bỏ điều
  kiện `quantity >= :n` trong `WHERE` — hai lớp phòng thủ, cả hai bắt buộc.
- **AD-2** — `stock` là chủ sở hữu duy nhất đường ghi. Không module nào khác `UPDATE` hai bảng này.
- **AD-4** — `stock_ledger` append-only: không bao giờ `UPDATE`, không bao giờ `DELETE`.
- **AD-5** — truy cập chéo chỉ qua `stock.public.ts`. Không export repository ra ngoài module.
- **AD-23** — đơn vị công việc do đường vào mở.

## Scope

**Allowed**
```text
apps/api/src/modules/stock/**   (mã hiện thực — KHÔNG sửa file *-spec.ts của T008)
.sdd/000-walking-skeleton/task-009-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/api/src/modules/stock/*-spec.ts   (T008 sở hữu)
apps/api/src/modules/catalog/**        apps/api/src/usecases/**  (không được tạo)
apps/storefront/**   packages/**   e2e/**   db/**   ops/**
docs/baseline/**   specs/**   scripts/**   tests/**   package.json (gốc)
```

## Acceptance criteria của task

- **Cả bốn test của T008 XANH**, chạy bằng `npm test`. Dán output xanh thật vào report, và
  **bằng chứng TDD**: output đỏ trước (từ T008) và xanh sau, cùng lệnh.
- Race test chạy lại **≥ 10 lần liên tiếp** trên cùng database cho kết quả giống hệt — chạy
  và dán output.
- `grep -rnE "SELECT.*quantity" apps/api/src/modules/stock` không cho thấy đường đọc-rồi-ghi
  nào trên đường ghi (đọc để **hiển thị** là chuyện khác và được phép — giải thích từng chỗ
  trong report).
- `grep -rn "FOR UPDATE\|BEGIN" apps/api/src/modules/stock` — nếu khớp, giải thích trong report
  vì sao nó không vi phạm AD-1/AD-23.
- Không có thư mục `apps/api/src/usecases/`.
- `npm run lint`, `npm run build` exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate
npm test
npm run lint && npm run build
```

## Dependencies

T004 (lược đồ + `CHECK`) · T008 (bốn test **đỏ**, và chữ ký hợp đồng).

## Previous task outputs

Đọc `.sdd/000-walking-skeleton/task-008-report.md`: nó chứa **chữ ký service nguyên văn** mà
bạn phải hiện thực, và mô tả cách bốn test nối vào database. Đọc
`.sdd/000-walking-skeleton/task-004-report.md` để biết tên module schema Drizzle.
