# Task T007 — `packages/ui`: design token + primitive khả năng tiếp cận, mức tối thiểu

## Source
- Feature: `000-walking-skeleton` (Track A) · Task **T007**, `tasks.md` §Phase 2 · song song được với T006
- **Owns**: — (nhưng `SC-004`/WCAG của T013 và `FR-005` của T012 đứng trên nó)
- Spec: `spec.md` US2 kịch bản 1–2 (nhãn tồn kho bằng **chữ**, không bao giờ chỉ bằng màu)
- Architecture: `docs/baseline/architecture.md` §Cây nguồn (`packages/ui`), sàn **WCAG 2.1 AA**

## Objective

Đặt nền khả năng tiếp cận dùng chung cho hai bề mặt (`storefront` ở `000`, `backoffice` ở
`006`), ở mức **tối thiểu** cần cho feature này — không nhồi thêm component nào chưa có chỗ dùng.

## Requirements

1. **Design token**: bảng màu, khoảng cách, cỡ chữ, ở dạng dùng được từ React. Màu chữ trên
   nền phải đạt **tỉ lệ tương phản WCAG 2.1 AA** (4.5:1 cho chữ thường, 3:1 cho chữ lớn) —
   tính và **ghi số thật vào report**, đừng phỏng đoán.
2. **Primitive nhãn tình trạng tồn kho** — hiển thị **bằng chữ**, không bao giờ **chỉ** bằng
   màu (`spec.md` US2 kịch bản 1, UX §706). Nhận `stockStatus` hai giá trị
   `in_stock` | `out_of_stock` và hiện nhãn tiếng Việt **"Còn hàng"** / **"Hết hàng"**.
   - Nhãn tiếng Việt sống ở **tầng hiển thị**; giá trị canonical là `in_stock`/`out_of_stock`
     (`plan.md` §Quyết định đã chốt (B)).
   - **Không** import type từ `packages/shared` nếu việc đó tạo phụ thuộc vòng; nếu cần dùng
     kiểu, khai một union cục bộ hai giá trị và ghi rõ trong report. Đừng tự ý thêm
     `packages/shared` vào dependencies của `packages/ui` — nếu bạn tin là cần, DỪNG và hỏi.
3. **Cơ chế thông báo đổi route cho screen reader**: SPA không có ranh giới tải trang, nên
   không có gì tự báo "trang đã đổi". Cung cấp một primitive vùng `aria-live` (politeness
   phù hợp) mà `storefront` gọi khi route đổi. Đây là thứ T013 sẽ kiểm bằng axe + Playwright.
4. **Mức tối thiểu là một ràng buộc, không phải lời khuyên.** Chỉ hai primitive trên + token.
   **Không** thêm Button, Card, Modal, Grid hay bất cứ component nào `000` chưa dùng tới.
   Thêm là finding "Extra" ở review.
5. **Test dưới Vitest** (5.0.1) + môi trường `jsdom` + `@testing-library/react` (đã pin ở
   T001, Ruling R7). Bỏ `--passWithNoTests` khỏi script `test` của workspace này khi đã có
   test thật. Test tối thiểu: nhãn render đúng **chữ** cho cả hai giá trị · nhãn không truyền
   tải thông tin **chỉ** bằng màu (khẳng định có nội dung văn bản) · vùng `aria-live` có mặt
   và nhận nội dung thông báo.
6. **Không** import gì từ `apps/**`.

## Architecture decisions ràng buộc task này

- **WCAG 2.1 AA là sàn cứng** (`plan.md` §Constraints), không phải mục tiêu phấn đấu.
- **AD-9** — hai bundle riêng; `packages/ui` là thư viện dùng chung, **không** kéo theo
  cấu hình bundler của bề mặt nào.
- **Constitution §VI** — mọi dependency pin chính xác. Không thêm thư viện UI bên thứ ba.

## Scope

**Allowed**
```text
packages/ui/**
.sdd/000-walking-skeleton/task-007-report.md
```

**Forbidden** — chạm vào là DỪNG và báo xung đột
```text
apps/**   packages/shared/**  (T006 sở hữu)   e2e/**   db/**   ops/**
docs/baseline/**   specs/**   scripts/**   tests/**   package.json  (gốc)
```

## Acceptance criteria của task

- `npm test` exit 0 và **chạy tới** test của `packages/ui`.
- `npm run lint`, `npm run build` exit 0.
- Report ghi **số tương phản thật** của từng cặp màu chữ/nền đã dùng.
- `packages/ui/src` không chứa component nào ngoài hai primitive đã nêu + token
  (đếm và liệt kê trong report).
- Không có chuỗi "Còn hàng"/"Hết hàng" nào bị hardcode ngoài primitive nhãn.

## Verification commands

```bash
npm test
npm run lint
npm run build
```

## Dependencies

T001 (workspace `packages/ui`, Vitest + jsdom + @testing-library/react đã pin).
Không phụ thuộc T004/T005/T006.

## Previous task outputs

`packages/ui/src/index.ts` hiện là file giữ chỗ do T001 tạo; thay nội dung nó là đúng phạm vi.
T006 đang viết `packages/shared` song song — **không** đọc, không sửa, không phụ thuộc vào nó.
