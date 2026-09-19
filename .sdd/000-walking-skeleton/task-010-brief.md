# Task T010 — Contract test cho đường đọc, phải ĐỎ trước T011

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T010**, `tasks.md` §Phase 4 (US1)
- **Owns**: `FR-006`, `FR-007`, `SC-005`
- Spec: `spec.md` FR-006 (tình trạng tồn kho không cache ở **bất kỳ** tầng nào), FR-007 (không
  lộ con số tồn kho cho `Khách chưa đăng ký`/`Khách hàng`), SC-005 (kiểm bằng cách đọc **toàn
  bộ** thân phản hồi, không chỉ nhìn màn hình)
- Contract: `specs/000-walking-skeleton/contracts/storefront-http.md`
- Architecture: `docs/baseline/architecture.md` AD-19, AD-20, AD-27

## Objective

Khoá hợp đồng HTTP của đường đọc **trước khi** nó tồn tại, và biến hai lời hứa dễ trôi nhất
của sản phẩm thành test: **con số tồn kho không bao giờ rời server**, và **`stockStatus`
không được cache ở tầng nào**.

Test phải **ĐỎ** khi bạn giao nộp. T011 là task làm chúng xanh.

## Requirements

### Test phải phủ, trong `apps/api/src/modules/catalog/` (Jest + supertest)

1. **Hình dạng đúng schema của `packages/shared`** — `GET /api/products` và
   `GET /api/products/:id` trả đúng `ProductSummary` / `ProductDetail`. Validate bằng **chính
   schema của `packages/shared`** (AD-10), **không** khai lại hình dạng trong test.
2. **`Cache-Control: no-store`** trên **mọi** response chứa `stockStatus` — cả danh sách lẫn
   chi tiết. Khẳng định header, không chỉ khẳng định body.
3. **Không con số tồn kho ở bất cứ đâu** — đọc **TOÀN BỘ** thân response dưới dạng chuỗi thô
   và khẳng định không xuất hiện giá trị `quantity` thật, không có khoá `quantity`, không có
   biến thể tên nào mang con số đó. Đây là SC-005 và nó nói rõ: kiểm bằng cách đọc toàn bộ nội
   dung, **không** chỉ kiểm vài trường đã biết. Test phải fail nếu ai đó thêm `quantity` vào
   một trường lồng sâu.
4. **Không tầng nào cache `stockStatus`** — đổi `quantity` trực tiếp trong database rồi gọi
   lại **ngay lập tức**; giá trị `stockStatus` trả về phải đổi theo. Đây là bằng chứng chạy
   được cho AD-20, và là test dễ bị viết giả nhất: phải đi qua HTTP thật, không gọi service
   trực tiếp.
5. **404 cho Sản phẩm không tồn tại** — dùng **envelope lỗi dùng chung** của `packages/shared`,
   và khẳng định **không có stack trace** trong thân phản hồi (FR-004 do T011 sở hữu; ở đây
   bạn chỉ khẳng định hình dạng lỗi của hợp đồng — không trùng chủ sở hữu).
6. **`GET /api/health`** trả 200 khi hệ thống lành mạnh (hình dạng tối thiểu theo contract).

### Luật chạy

- **Database thật** (AD-27). Test tự tạo dữ liệu nó cần, dọn bằng `TRUNCATE`, chạy lại được
  nhiều lần trên cùng database mà không dựng lại nó (AD-28). Không `pg-mem`, không mock
  repository cho đường chạm dữ liệu.
- Lược đồ dựng bằng `npm run db:migrate` của T004 — không `CREATE TABLE` trong helper.
- Nếu không nối được database, test **thất bại rõ ràng** với thông điệp hướng dẫn, **không**
  tự skip.
- Không sửa test của T008 và không đụng `apps/api/src/modules/stock/**`.

## Architecture decisions ràng buộc task này

- **AD-19 / FR-007** — con số tồn kho chính xác không rời server. Vai trò `Khách chưa đăng ký`
  và `Khách hàng` chỉ thấy còn/hết.
- **AD-20** — `stockStatus` không cache ở **bất kỳ** tầng nào, kể cả khi phần còn lại của
  trang có cache. `Cache-Control: no-store` là biểu hiện ở tầng HTTP.
- **AD-10** — hình dạng lấy từ `packages/shared`, không khai lại.
- **AD-27/AD-28** — database thật, cô lập bằng TRUNCATE trên trạng thái đã commit.

## Scope

**Allowed**
```text
apps/api/src/modules/catalog/**   (CHỈ file test)
apps/api/test/**
.sdd/000-walking-skeleton/task-010-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
Mọi file KHÔNG PHẢI test trong apps/api/src/modules/catalog/   ← T011 sở hữu
apps/api/src/modules/stock/**   apps/api/src/main.ts   apps/api/src/app.module.ts
apps/storefront/**   packages/**   e2e/**   db/**   ops/**
docs/baseline/**   specs/**   scripts/**   tests/**   package.json (gốc)
```

## Acceptance criteria của task

- Test tồn tại, `npm test` chạy tới chúng và **tất cả ĐỎ** vì thiếu hiện thực (không phải vì
  lỗi cú pháp, không phải vì không nối được database). Dán output đỏ thật.
- Test "không lộ tồn kho" đọc **thân thô** (chuỗi/JSON đầy đủ), chỉ ra đúng dòng trong report.
- Test "không cache" đổi dữ liệu ở database rồi gọi lại qua HTTP — chỉ ra đúng dòng.
- Hình dạng được validate bằng schema import từ `packages/shared`, không khai lại — chỉ ra
  import trong report.
- `npm run lint`, `npm run build` exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d postgres
npm run db:migrate
npm test            # phải ĐỎ ở đúng các test này
npm run lint && npm run build
```

## Dependencies

T006 (`packages/shared` — schema hợp đồng) · T004 (lược đồ) · T002 (`postgres`, `DATABASE_URL`).
Chạy được song song với T008/T009 về mặt file, nhưng **đọc** `packages/shared` nên cần T006 xong.

## Previous task outputs

- `packages/shared` export schema `ProductSummary`, `ProductDetail`, `stockStatus` và envelope
  lỗi dùng chung — đọc `.sdd/000-walking-skeleton/task-006-report.md` để biết tên export thật.
- T008 đã cấu hình Jest cho `apps/api` (kể cả cách nối database và dọn bằng TRUNCATE); tái sử
  dụng helper của nó thay vì viết lại — đọc `.sdd/000-walking-skeleton/task-008-report.md`.
