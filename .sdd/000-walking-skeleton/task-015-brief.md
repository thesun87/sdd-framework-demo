# Task T015 — Chạy trọn quickstart trên một clone sạch

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T015**, `tasks.md` §Phase 6
- **Owns**: `SC-006` (bốn lệnh exit 0 **và** output cho thấy nửa sản phẩm ĐÃ CHẠY),
  `SC-007` (dựng lại toàn hệ thống từ kho mã sạch, không thao tác tay ngoài tài liệu, và đạt
  lại SC-001…SC-006)
- Quickstart: `specs/000-walking-skeleton/quickstart.md`
- Verification contract: `docs/baseline/verification.md`

## Objective

Chứng minh rằng người khác dựng lại được hệ thống này chỉ bằng những gì đã ghi. Đây là task
duy nhất kiểm **toàn bộ** feature từ bên ngoài.

## Lỗ hổng đã biết, PHẢI sửa ở task này (controller phát hiện, không phải finding chờ bạn tìm)

Sau khi T011c (Ruling R23) thêm bước ghi **tệp ảnh thật** ra `PRODUCT_IMAGE_PATH` lúc
`db:seed`, bước `npm run db:seed` **trần trên host** — đúng như `quickstart.md` ghi hôm nay —
**thất bại** (`EACCES`/`ENOENT` tại `/data`). Lý do: `PRODUCT_IMAGE_PATH=/data/product-images`
là **named volume**, chỉ có ý nghĩa BÊN TRONG container đã mount nó (`api`/`proxy`); host trần
không có `/data`. **Bạn PHẢI sửa `quickstart.md`** để bước `db:seed` chạy được thật trên clone
sạch — ví dụ đổi sang chạy trong một container nối đúng network compose + mount đúng named
volume (mẫu đã hoạt động, xem `.sdd/000-walking-skeleton/task-011c-report.md` §2.3), hoặc một
cách khác bạn xác minh chạy được. Đây chính xác là loại việc `quickstart.md` (T015 allowed
scope) tồn tại để bắt — không phải một task-riêng, không cần hỏi lại.

## Requirements

1. **Clone sạch**: `git clone` chính worktree/repo này sang một thư mục tạm **ngoài** cây làm
   việc (dùng thư mục tạm của hệ thống, không tạo rác trong repo), rồi chạy **nguyên văn** các
   bước của `quickstart.md`:
   ```
   docker compose -f ops/compose.yaml up -d postgres
   npm run db:migrate
   npm run db:seed
   docker compose -f ops/compose.yaml up -d
   ```
   Lưu ý: clone sạch **không có `node_modules`** — nếu quickstart thiếu bước cài phụ thuộc,
   **đó là một lỗi của quickstart** và bạn được phép sửa `quickstart.md` (nó nằm trong allowed
   scope của bạn).
2. **Bốn lệnh của hợp đồng, chạy nguyên văn**: `npm test`, `npm run lint`, `npm run build`,
   `npm run test:regression`. Khẳng định **cả bốn exit 0** **và** output cho thấy **nửa sản
   phẩm ĐÃ CHẠY** — không còn `SKIPPED — no product workspace exists yet` ở bất kỳ lệnh nào.
   Đây là lần đầu tiên điều đó đúng trong lịch sử repo; dán output thật của cả bốn.
3. **Đạt lại SC-001 → SC-006** trên bản dựng sạch. Đi qua **tám kịch bản nghiệm thu tay** của
   `quickstart.md` §Kịch bản nghiệm thu chạy tay và ghi kết quả từng dòng vào report:
   trang chủ · trang chi tiết · 404 · đổi giá ở database · `quantity = 0` → "Hết hàng" và vẫn
   hiện · đọc toàn bộ thân `/api/products` không có con số tồn kho · `curl -I /` và
   `curl -I /admin/` đủ header · `Cache-Control: no-store` trên `/api/products`.
4. **Chạy riêng test tải đồng thời** trên bản dựng sạch:
   `npm test -- stock-conditional-delta.race-spec.ts` — dán output.
5. **Nếu quickstart lệch thực tế, sửa `quickstart.md`** cho khớp những gì bạn thật sự phải làm.
   Cập nhật `README.md` nếu nó nói sai về cách chạy. Ghi rõ mọi chỗ đã sửa và **vì sao**.
   Đặc biệt: bảng "Điều kiện tiên quyết" của `quickstart.md` còn ghi Docker ❌ chưa dùng được —
   điều đó **đã lỗi thời** (Docker 29.1.2 chạy được, đo lại 2026-09-19); sửa dòng đó.
6. **`docs/baseline/verification.md` là ngoại lệ có điều kiện.** `tasks.md` cho phép sửa nó
   **chỉ khi** một bất biến cần test mà lệnh hiện tại không chạy tới (AD-21: sửa hợp đồng,
   đừng bỏ test) — và việc đó **cần người duyệt trên nhánh `baseline/*`**.
   **Bạn KHÔNG được sửa nó.** Nếu bạn kết luận là cần, **DỪNG và báo controller** với lý do cụ
   thể: đây là một trong số ít điều kiện dừng thật của quy trình.
7. Dọn sạch: gỡ clone tạm và mọi container bạn dựng riêng cho nó. **Không** gỡ dịch vụ
   `postgres` của cây làm việc chính nếu nó đang được dùng — nói rõ trong report bạn đã dựng
   và gỡ những gì.

## Scope

**Allowed**
```text
specs/000-walking-skeleton/quickstart.md   (chỉnh lệnh cho khớp thực tế)
README.md
.sdd/000-walking-skeleton/task-015-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
docs/baseline/**   — KỂ CẢ verification.md (xem #6: phải hỏi người trước)
specs/000-walking-skeleton/spec.md   plan.md   tasks.md
apps/**   packages/**   db/**   ops/**   e2e/**   scripts/**   tests/**   package.json (gốc)
```
Nếu bản dựng sạch thất bại vì một **lỗi mã nguồn**, bạn **không** sửa mã: báo lại controller
với chẩn đoán và bằng chứng. Task này là cổng nghiệm thu, không phải task sửa lỗi.

## Acceptance criteria của task

- Report chứa **output thật** của: bốn lệnh hợp đồng trên clone sạch · tám kịch bản tay ·
  race spec chạy riêng.
- Không chỗ nào trong output còn `SKIPPED — no product workspace exists yet`.
- Mọi chênh lệch giữa `quickstart.md` và thực tế đã được sửa trong `quickstart.md`, kèm lý do.
- Bảng điều kiện tiên quyết không còn nói Docker chưa dùng được.
- Nếu có bất kỳ SC nào **không** đạt: báo rõ SC nào, bằng chứng, và **đừng** che bằng cách
  đổi tài liệu.

## Verification commands

```bash
# trong clone sạch:
npm test && npm run lint && npm run build && npm run test:regression
npm test -- stock-conditional-delta.race-spec.ts
```

## Dependencies

Tất cả các task trước (T001…T014).

## Previous task outputs

Toàn bộ `.sdd/000-walking-skeleton/task-0*-report.md` — dùng khi cần biết một bước đã được
làm thế nào. Nhưng **bằng chứng của bạn phải đến từ clone sạch**, không từ báo cáo của người khác.
