# Task T014 — Đo và ghi lại ba ngưỡng p95

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T014**, `tasks.md` §Phase 6
- **Owns**: `SC-003` — trang chủ ≤ **1,5 s** p95; đường đọc API ≤ **400 ms** p95 (`prd.md` §8)
- Spec: `spec.md` SC-003 · Plan: `plan.md` §Technical Context (Performance Goals)
- Architecture: `docs/baseline/architecture.md` §Quan sát và sự cố

## Objective

Biến ba câu hứa hiệu năng của PRD thành số đo được. Không có tầng đo, ba NFR đó là ba câu
không kiểm chứng được.

## Requirements

1. **Thời lượng mỗi request ghi vào log có cấu trúc** — mở rộng middleware log mà **T011 đã
   sở hữu** (Ruling R8): thêm trường thời lượng, giữ nguyên `request_id` và định dạng có cấu
   trúc hiện có. **Không viết lại** tầng log, **không** dựng đường log thứ hai song song.
2. **Một endpoint tổng hợp nội bộ** trả lời "p95 hôm nay bao nhiêu", đặt tại
   **`/api/internal/metrics`** (Ruling R9). Nó **không** được liên kết từ storefront và
   **không** chứa con số tồn kho hay dữ liệu khách hàng — chỉ số đo thời lượng.
   Việc chặn đường dẫn này ở reverse proxy **hoãn sang feature sau** và đã ghi ở ledger;
   **không** sửa `ops/Caddyfile` (T003 sở hữu).
3. **Khẳng định hai ngưỡng** bằng test trong `e2e/`:
   - trang chủ hiển thị xong ≤ **1,5 s** ở p95;
   - đường đọc API trả lời ≤ **400 ms** ở p95.
   Số mẫu phải đủ để "p95" có nghĩa — nói rõ trong report bạn lấy bao nhiêu mẫu và vì sao
   con số đó đủ. Một test đo **một** request rồi gọi nó là p95 là test giả.
4. **Chỉ thêm file mới trong `e2e/`** (Ruling R8b): `performance.e2e-spec.ts`. **Không** sửa
   `security-headers.e2e-spec.ts` và `storefront-journey.e2e-spec.ts` — T013 sở hữu chúng và
   sở hữu SC-004.
5. **Ngưỡng là ngưỡng của PRD**, không phải ngưỡng bạn chọn cho vừa kết quả. Nếu hệ thống
   không đạt, **báo lại** — đừng nới ngưỡng, đừng bỏ khẳng định, đừng đo thứ dễ hơn.
6. Test chạy dưới lệnh hợp đồng (`npm run test:regression`), không lệnh riêng.

## Architecture decisions ràng buộc task này

- **§Quan sát và sự cố** — log có cấu trúc ra stdout là cơ chế quan sát của hệ thống; không
  thêm dịch vụ giám sát (AD-16: phụ thuộc runtime chỉ PostgreSQL + hệ tệp).
- **Ruling R8** — T011 sở hữu middleware log; bạn **mở rộng**.
- **Ruling R8b** — trong `e2e/` bạn chỉ thêm file mới.
- **Ruling R9** — endpoint p95 ở `/api/internal/metrics`, không lộ dữ liệu nhạy cảm, không
  chặn ở proxy trong feature này.

## Scope

**Allowed**
```text
apps/api/src/**   (CHỈ tầng quan sát: mở rộng middleware log + endpoint metrics)
e2e/performance.e2e-spec.ts   (file MỚI)
.sdd/000-walking-skeleton/task-014-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
e2e/security-headers.e2e-spec.ts   e2e/storefront-journey.e2e-spec.ts   (T013 sở hữu)
ops/Caddyfile   ops/compose.yaml   apps/storefront/**   packages/**   db/**
apps/api/src/modules/stock/**  và  apps/api/src/modules/catalog/**  về mặt NGHIỆP VỤ
  (chỉ được chèn tầng quan sát, không đổi hành vi nghiệp vụ, không đổi hình dạng response)
docs/baseline/**   specs/**   scripts/**   tests/**   package.json (gốc)
```

## Acceptance criteria của task

- Log của một request thật chứa `request_id` **và** thời lượng — dán một dòng log thật.
- `GET /api/internal/metrics` trả p95 — dán output thật.
- `npm run test:regression` chạy `performance.e2e-spec.ts` và **xanh**, với số mẫu đã nêu.
- Hai spec của T013 **không đổi một ký tự** (`git diff` chứng minh).
- `grep -rn "quantity" apps/api/src/<đường dẫn metrics>` không khớp gì.
- Hình dạng response của `/api/products` và `/api/products/:id` **không đổi** — test của T010
  vẫn xanh.
- `npm test`, `npm run lint`, `npm run build` exit 0.

## Verification commands

```bash
docker compose -f ops/compose.yaml up -d
npm run build
npm test && npm run lint
npm run test:regression
```

## Dependencies

T012 (trang chủ tồn tại để đo) · T011 (middleware log để mở rộng) · T013 (hạ tầng Playwright).

## Previous task outputs

- Cấu trúc middleware log và tên trường: `.sdd/000-walking-skeleton/task-011-report.md`.
- Cấu hình Playwright và `baseURL` trỏ qua proxy: `.sdd/000-walking-skeleton/task-013-report.md`.
