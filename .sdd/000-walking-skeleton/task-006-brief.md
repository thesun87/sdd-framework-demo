# Task T006 — `packages/shared`: nguồn sự thật duy nhất của hợp đồng HTTP

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T006**, `tasks.md` §Phase 2 · chạy song song được với T007
- **Owns**: — (không sở hữu tiêu chí nghiệm thu; nhưng FR-006, FR-007, SC-005 của T010 đứng trên nó)
- Contract: `specs/000-walking-skeleton/contracts/storefront-http.md` (hình dạng nguyên văn)
- Architecture: `docs/baseline/architecture.md` **AD-10**, AD-19, AD-20, §Consistency (Cấu hình)

## Objective

Định nghĩa **một lần** mọi hình dạng đi qua biên HTTP của feature 000, kèm type **suy ra từ
schema**. Cả API lẫn SPA validate bằng **chính** schema này; không bên nào khai lại interface.

## Requirements

1. **Hai không gian tên**, đúng AD-10: **`storefront`** (feature này dùng) và **`backoffice`**
   (để trống ở `000`, feature `006` sẽ dùng). Tách bằng thư mục/module, export rõ ràng. Một
   type chỉ nằm ở không gian tên chung khi **cả hai** bề mặt cần nó ở **cùng** hình dạng — ở
   `000` gần như không có type nào như vậy trừ envelope lỗi.
2. **Schema + type suy ra từ schema** bằng **zod `4.6.5`** (đã pin ở T001, Ruling R6).
   **Không** khai tay `interface`/`type` cho bất cứ hình dạng nào đã có schema — type phải
   `infer` ra từ schema. Một `interface ProductSummary { ... }` viết tay là finding.
3. **Hình dạng bắt buộc**, nguyên văn theo `contracts/storefront-http.md`:

   **`ProductSummary`** (phần tử của `GET /api/products`)
   ```jsonc
   { "id": 1, "name": "…", "price": 149000, "imagePath": "/images/…" | null, "stockStatus": "in_stock" }
   ```
   **`ProductDetail`** (`GET /api/products/:id`)
   ```jsonc
   { "id": 1, "name": "…", "description": "…", "price": 149000,
     "images": [{ "path": "/images/…", "position": 0 }], "stockStatus": "in_stock" }
   ```
   - `price`: **số nguyên** (VND đã gồm VAT). Schema phải từ chối số thập phân và số âm.
   - `stockStatus`: enum **đúng hai giá trị** `in_stock` | `out_of_stock` (chốt 2026-09-19).
   - **TUYỆT ĐỐI KHÔNG** có trường `quantity` hay bất kỳ con số tồn kho nào ở bất kỳ schema
     nào trong package này (FR-007 + AD-19). Đây là ràng buộc đọc được ở review.
   - Response của danh sách là `{ "items": [ProductSummary] }`, không phải mảng trần.

4. **Một envelope lỗi duy nhất**, dùng chung cho mọi lỗi HTTP, có chỗ cho payload lỗi **có
   kiểu**. Không stack trace, không thông điệp nội bộ của framework. 404 của FR-004 dùng chính
   envelope này.
5. **Schema cấu hình triển khai** — validate **một lần lúc khởi động**, đúng
   `architecture.md` §Consistency: `DATABASE_URL`, `API_PORT`, `NODE_ENV`, `PRODUCT_IMAGE_PATH`
   (bốn tên đã chốt ở T002, Ruling R4 — không thêm, không đổi tên). Export một hàm nhận
   `process.env` (hoặc một `Record<string,string|undefined>`) và trả cấu hình đã validate, ném
   lỗi rõ ràng khi thiếu. **Không** đọc `process.env` rải rác trong package; package này không
   tự đọc môi trường, nó chỉ cung cấp schema + hàm validate.
6. **Test dưới Vitest** (`vitest run`, đã pin 5.0.1). Bỏ cờ `--passWithNoTests` khỏi script
   `test` của `packages/shared` khi bạn đã có test thật — đây là workspace đầu tiên có test.
   Test tối thiểu phải phủ: price thập phân bị từ chối · price âm bị từ chối ·
   `stockStatus` giá trị lạ bị từ chối · cấu hình thiếu biến thì ném lỗi ·
   một object có thêm trường `quantity` **không** lọt qua schema.
7. **Không** import gì từ `apps/**`. Package này là lá của đồ thị phụ thuộc.

## Architecture decisions ràng buộc task này

- **AD-10** — một nguồn sự thật cho hợp đồng HTTP, tách hai bề mặt. FE không khai lại
  interface cho response; BE không khai lại cho request.
- **AD-19 / FR-007** — con số tồn kho chính xác không bao giờ rời khỏi server.
- **AD-20** — `stockStatus` không được cache ở bất kỳ tầng nào. Ở package này nghĩa là: đừng
  thêm bất kỳ tiện ích cache, memoize hay "stale-while-revalidate" nào cho hình dạng có
  `stockStatus`.
- **Constitution §VI** — zod pin `4.6.5`.

## Glossary

`stock status` (hai giá trị `in_stock`/`out_of_stock`) là thuật ngữ đã được người quyết phê
duyệt 2026-09-19. Viết `stockStatus` ở JSON. **Không** dùng `inventory` — từ này nằm trong cột
*Do NOT use* của `docs/baseline/glossary.md`.

## Scope

**Allowed**
```text
packages/shared/**
.sdd/000-walking-skeleton/task-006-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/**   packages/ui/**  (T007 sở hữu)   e2e/**   db/**   ops/**
docs/baseline/**   specs/**   scripts/**   tests/**   package.json  (gốc)
```

## Acceptance criteria của task

- `npm test` exit 0 và **chạy tới** test của `packages/shared` (không còn passWithNoTests ở
  workspace này).
- `npm run lint` và `npm run build` exit 0.
- `grep -rniE "quantity|inventory" packages/shared/src` không khớp gì (trừ, nếu cần, một
  comment giải thích **vì sao** trường đó bị cấm — nói rõ trong report nếu bạn giữ comment đó).
- `grep -rnE "^\s*(export )?(interface|type) (ProductSummary|ProductDetail)" packages/shared/src`
  chỉ khớp dòng `type X = z.infer<...>`, không khớp khai báo tay.
- Report dán output test thật, không mô tả.

## Verification commands

```bash
npm test
npm run lint
npm run build
```

## Dependencies

T001 (workspace `packages/shared` + zod 4.6.5 đã pin) · T002 (bốn tên biến môi trường).
Không phụ thuộc T004/T005.

## Previous task outputs

- `ops/.env.example` là bản kê duy nhất của cấu hình: `DATABASE_URL`, `API_PORT`, `NODE_ENV`,
  `PRODUCT_IMAGE_PATH`.
- `packages/shared/src/index.ts` hiện là một file giữ chỗ do T001 tạo; thay nội dung nó là
  đúng phạm vi.
