# Implementation Plan: Walking Skeleton

**Branch**: `feature/000-walking-skeleton` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/000-walking-skeleton/spec.md`

**Baseline**: `baseline-0001-ecommerce` — mọi quyết định dưới đây **dẫn xuất** từ
`docs/baseline/architecture.md`. Plan này không tạo quyết định kiến trúc mới; hai chỗ
kiến trúc chưa phủ đã được người quyết đóng lại ở [§Quyết định đã chốt](#quyết-định-đã-chốt-2026-09-19-người-quyết-tuan-nguyen).

## Summary

Dựng lát cắt dọc mỏng nhất xuyên toàn bộ spine: reverse proxy → SPA bán hàng → API NestJS →
PostgreSQL thật, cộng migration và bộ test chứng minh bất biến trung tâm. Kết quả người dùng
thấy được là trang chủ có **một Sản phẩm thật** và trang chi tiết của nó, với nhãn còn/hết
đọc trực tiếp từ `stock`. Kết quả kỹ thuật quan trọng hơn: **test tải đồng thời thật** chứng
minh AD-1 trên PostgreSQL thật, và **header an toàn** của AD-29 hạ cánh trước mọi bề mặt.

Hai miền được chạm: `catalog` (đọc) và `stock` (đọc + một đường ghi có điều kiện). Mũi tên
`catalog → stock` đã có sẵn trong đồ thị phụ thuộc, nên **không cần tầng `usecases`** ở
feature này — một lời gọi service công khai là đủ.

## Technical Context

Toàn bộ mục này **không có NEEDS CLARIFICATION**: mọi giá trị đều đã bị baseline pin.

**Language/Version**: TypeScript 5.9.x trên Node.js 24.21.0 (sàn `>=24.15` do `@nestjs/schematics` đặt)

**Primary Dependencies**: NestJS 11.2.5 · React 19.3.0 · Vite 8.3.0 · `@vitejs/plugin-react` 6.1.1 · Drizzle ORM 0.45.2 / Drizzle Kit 0.31.10 · Caddy 2.11.4

**Storage**: PostgreSQL 18.6 — dịch vụ `postgres` trong `ops/compose.yaml`, dùng chung cho cả chạy thật lẫn test (AD-27)

**Testing**: Jest 30.4.2 (`apps/api`) · Vitest 5.0.1 (`apps/storefront`, `packages/*`) · Playwright 1.62.1 + `@axe-core/playwright` (`e2e/`). **Không trộn runner trong một thư mục.**

**Target Platform**: một VPS, một Docker Compose, một origin. Hai môi trường: `local dev` và `prod`. Không staging.

**Project Type**: modular monolith + hai SPA (ở feature này **chỉ một** SPA — xem §Structure Decision)

**Performance Goals**: p95 tải trang chủ ≤ 1,5 s · p95 đường đọc API ≤ 400 ms (PRD §8)

**Constraints**: phụ thuộc runtime **chỉ** PostgreSQL + hệ tệp cục bộ (AD-16) · tiền là số nguyên VND (không dấu phẩy động) · `timestamptz` UTC · WCAG 2.1 AA là sàn cứng

**Scale/Scope**: feature này cần **một** Sản phẩm để chứng minh; mục tiêu hệ thống là 2.000 sản phẩm Y1 / 20.000 Y3

## Constitution Check

*GATE: phải đạt trước Phase 0. Đã tái kiểm sau Phase 1 — kết quả ở cuối mục.*

| Nguyên tắc | Cổng | Kết quả |
|---|---|---|
| **§I Baseline tối thượng** | Mọi FR truy về PRD; không phát minh yêu cầu | ✅ FR-001…008 đều có cột truy vết. Hai chỗ baseline chưa phủ **không tự gỡ trong plan** — đẩy lên người quyết, đã đóng 2026-09-19 |
| **§II Test-First** | Test đỏ trước code; bất biến có test mang tên nó | ✅ Bắt buộc `stock-conditional-delta.race-spec.ts`. Plan đặt test tải đồng thời là **cổng của feature**, không phải phần thêm cuối |
| **§III Hợp đồng kiểm chứng là cổng duy nhất** | Chạy đúng 4 lệnh của `verification.md`, không đặt lệnh riêng | ✅ `test`/`lint`/`regression`/`build` giữ nguyên. Feature này là lần đầu **nửa sản phẩm chạy thật** thay vì SKIPPED |
| **§IV Phạm vi là hợp đồng** | Allowed/forbidden scope rõ theo ranh giới thư mục | ✅ Ranh giới module = ranh giới `allowed scope` (AD-5). `docs/baseline/**` là forbidden scope tuyệt đối |
| **§V Từ vựng đóng** | Chỉ dùng canonical term | ✅ `stock status` do người quyết phê duyệt 2026-09-19; nợ một dòng trong `glossary.md` trên nhánh `baseline/*` |
| **§VI Phiên bản được pin** | Không dist-tag, không `latest` | ✅ Mọi phiên bản trong Technical Context lấy nguyên từ bảng Stack. Caddy pin theo tag ảnh, không `2` hay `latest` |

**Điều kiện tiên quyết của constitution — đã đóng.** Constitution §"Ràng buộc kỹ thuật" viết
*"Máy phát triển hiện chạy Node 24.13.0, dưới sàn 24.15 … feature 000 không được bắt đầu
trước khi nó được đóng."* Máy hiện chạy **24.21.0** (commit `93d0844`), nên cổng này **đã
đạt**. Câu chữ trong `constitution.md` giờ lỗi thời; sửa nó là việc của nhánh `governance/*`,
**không phải của plan này**.

**Điều kiện tiên quyết còn hở — Docker.** `verification.md` §Prerequisites đòi Docker +
Compose + dịch vụ `postgres` cho mọi test chạm dữ liệu. `docs/tooling-versions.md` ghi Docker
chưa dùng được trong distro WSL hiện tại. Plan **không đổi kiến trúc vì chuyện này** (AD-27
cấm thay thế bằng database trong bộ nhớ); đây là chặn môi trường phải gỡ trước cổng nghiệm thu.

### Tái kiểm sau Phase 1

Không phát sinh vi phạm mới. Bảng Complexity Tracking rỗng: thiết kế không thêm tầng, thêm
dịch vụ, hay thêm pattern nào ngoài những gì `architecture.md` đã quy định.

## Project Structure

### Documentation (this feature)

```text
specs/000-walking-skeleton/
├── plan.md              # File này
├── spec.md
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   └── storefront-http.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks — CHƯA tồn tại
```

### Source Code (repository root)

Gốc là gốc repository, cạnh `specs/`, `.sdd/`, `docs/` — không có thư mục bọc riêng
(`architecture.md` §Cây nguồn). Dấu ✎ là thứ feature `000` tạo ra.

```text
apps/
  api/                        # ✎ NestJS 11
    src/
      modules/
        catalog/              # ✎ product, category, product_image
        stock/                # ✎ stock, stock_ledger — CHỦ SỞ HỮU DUY NHẤT đường ghi tồn kho
      usecases/               #   KHÔNG tạo ở 000 — không thao tác nào chạm nhiều miền
packages/
  shared/                     # ✎ schema hợp đồng HTTP, chỉ không gian tên `storefront`
  ui/                         # ✎ design token + primitive khả năng tiếp cận (tối thiểu)
apps/
  storefront/                 # ✎ React 19 + Vite 8 — trang chủ + trang chi tiết
  backoffice/                 #   KHÔNG tạo ở 000 — hoãn tới 006 (quyết định 2026-09-19)
e2e/                          # ✎ Playwright — luồng người dùng + header AD-29 + axe WCAG
db/
  migrations/                 # ✎ drizzle-kit generate; áp bằng migrate trước khi khởi động
ops/
  compose.yaml                # ✎ proxy + api + postgres (dùng cho cả test)
  Caddyfile                   # ✎ một origin + SPA fallback + header AD-29 cho CẢ HAI đường dẫn
  backup/                     #   KHÔNG tạo ở 000 — AD-15 chưa có ảnh để sao lưu
```

**Structure Decision**: giữ nguyên cây nguồn của baseline, **bỏ bớt** `apps/backoffice`,
`apps/api/src/usecases/`, `ops/backup/` và ba module `identity`/`ordering`/`settings` vì
không yêu cầu nào của feature này chạm tới chúng. Đây là *tập con*, không phải *biến thể* —
cấu trúc không bị đổi hình, chỉ chưa mọc hết. Mọi thư mục bỏ bớt đều có feature sở hữu nó
trong `feature-map.md`, nên không cái nào mồ côi.

## Ghi chú áp dụng (không phải quyết định mới)

1. **`catalog → stock` không cần `usecases`.** Đồ thị phụ thuộc đã cho phép mũi tên này. Tầng
   `usecases` tồn tại cho FR-24/25/27 — không FR nào trong đó thuộc `000`. Tạo nó ở đây là
   thêm tầng không ai dùng.
2. **Đường ghi tồn kho ở `000` không có đường vào HTTP.** Đặt đơn là FR-14 (feature `004`).
   Delta có điều kiện của AD-1 sống trong service công khai của `stock`; **test tải đồng thời
   đóng vai đường vào** và tự mở đơn vị công việc, đúng như AD-23 quy định cho đường vào.
   Không có transaction lồng, và `stock` không tự mở cái nó đã nhận.
3. **AD-9 chưa kiểm chứng được ở `000`** vì chỉ có một bundle. Nghĩa vụ "bundle quản trị không
   bao giờ tới trình duyệt khách" chuyển sang `006` **cùng với** bundle đó. Ghi ra đây để
   `/speckit-converge` không đánh rơi nó.
4. **`packages/ui` chỉ có một người dùng ở `000`.** Vẫn tạo, ở mức tối thiểu (design token +
   primitive cho sàn WCAG), vì `006` sẽ là người dùng thứ hai. Không nhồi thêm component nào
   chưa có chỗ dùng.

## Quyết định đã chốt (2026-09-19, người quyết: Tuan Nguyen)

Hai chỗ `architecture.md` và `glossary.md` không phủ, đã được người quyết đóng lại.

**(A) Nạp Sản phẩm mẫu bằng script seed riêng — KHÔNG bằng migration.**
`db/seed.ts`, chạy bằng một lệnh đã ghi trong `quickstart.md`, tách hẳn khỏi
`db/migrations/`. Lý do: AD-25 phủ *migration lược đồ*; nhét dữ liệu mẫu vào đó làm bẩn
ranh giới ấy và biến mỗi lần đổi dữ liệu demo thành một migration chỉ-tiến không gỡ được.
Seed là **idempotent** và **không bao giờ chạy ở prod**. `SC-007` (dựng lại từ kho sạch)
tính seed là một bước trong quy trình, nên nó phải nằm trong repo, không phải trong đầu ai đó.

**(B) Thuật ngữ `stock status`, hai giá trị `in_stock` / `out_of_stock`.**
Viết `stockStatus` ở JSON (lối mòn TS), `stock_status` nếu sau này thành cột. Lý do: ghép
từ canonical term `Stock` đã có, không phát minh từ mới. Nhãn tiếng Việt "Còn hàng"/"Hết hàng"
vẫn **chỉ ở tầng hiển thị**, đúng §Consistency Conventions.

> **Nợ còn lại, không chặn feature này:** `glossary.md` vẫn chưa có dòng cho `stock status`.
> `docs/baseline/**` chỉ được ghi bởi người trên nhánh `baseline/*` (CLAUDE.md §3), nên
> feature này **không** tự thêm. Việc cần làm: một nhánh `baseline/*` thêm dòng đó rồi đóng
> băng lại. Cho tới lúc đó, thuật ngữ đã được người quyết phê duyệt bằng miệng ở đây, và
> `/speckit-analyze` sẽ thấy nó hợp lệ qua file này.

## Dự báo số task (trần 15)

Ước lượng **14–15 task** — sát trần, đúng như `feature-map.md` cảnh báo. Thứ `feature-map.md`
chỉ định cắt (bundle quản trị) **đã cắt rồi**. Nếu `/speckit-tasks` vẫn vượt:

| Ứng viên cắt tiếp | Được phép? | Lý do |
|---|---|---|
| Gộp `packages/ui` vào `apps/storefront` | ⚠️ Cân nhắc | Một người dùng duy nhất ở `000`; `006` phải tách ra lại |
| Trang chi tiết Sản phẩm | ⚠️ Người đã chốt là CÓ | Cắt = đảo quyết định 2026-09-19, phải hỏi lại |
| Test tải đồng thời AD-21 | ❌ **Không** | Bỏ nó là bỏ đúng thứ `000` tồn tại để chứng minh |
| CSP / header AD-29 | ❌ **Không** | Bề mặt tồn tại trước lớp phòng thủ = cửa sổ không ai đóng |

## Complexity Tracking

Rỗng — Constitution Check không có vi phạm cần biện minh.
