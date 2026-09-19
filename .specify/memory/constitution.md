# Shop Online Constitution

## Core Principles

### I. Baseline tối thượng (NON-NEGOTIABLE)

Baseline đã đóng băng (`docs/baseline/**` tại `baseline_id: baseline-0001-ecommerce`)
là nguồn sự thật duy nhất về *sản phẩm phải làm gì* và *kiến trúc cho phép làm thế nào*.

- `spec.md` là artifact **dẫn xuất**: nó được phép tinh chỉnh và phân rã một `FR-xxx`
  đã có; nó **KHÔNG BAO GIỜ** được phát minh một yêu cầu mới.
- Một nhu cầu không có trong PRD là **PRODUCT_CONFLICT** → DỪNG → sửa PRD trên nhánh
  `baseline/*` → đóng băng lại → sinh handoff mới. Nó không bao giờ được gỡ trong `spec.md`.
- Một nhu cầu kiến trúc không được spine phủ là **ARCHITECTURE_CONFLICT** → DỪNG →
  sửa `architecture.md` + ADR mới → đóng băng lại. Nó không bao giờ được gỡ trong `plan.md`.
- Bất đồng về yêu cầu hoặc kiến trúc **không được giải bằng cách sửa code hay sửa tài liệu**
  đang thực thi.

*Lý do:* baseline mất hiệu lực ngay lần đầu một agent được phép "quyết định luôn cho nhanh".
Sau đó không artifact hạ nguồn nào còn kiểm chứng được, vì không còn gì để đối chiếu.

### II. Test-First, và bất biến chỉ có thật khi có test mang tên nó (NON-NEGOTIABLE)

- TDD bắt buộc: test đỏ → được duyệt → mới viết code. Không có đường tắt "viết code trước,
  bổ test sau".
- Mỗi bất biến cắt ngang ở `prd.md` §8 và mỗi `AD-xx` được đánh dấu kiểm chứng được
  **PHẢI** có một test mang tên nó (AD-21). Một bản build đạt 95% line coverage mà thiếu
  test tranh chấp tồn kho thì **chưa** chứng minh được tuyên bố trung tâm của sản phẩm.
- Test tranh chấp chạy trên PostgreSQL 18 thật (AD-27) và cô lập bằng `TRUNCATE` trên state
  đã commit qua các kết nối độc lập (AD-28). Cấm cô lập bằng transaction-rollback: nó gộp
  N tiến trình thành một transaction và làm test xanh một cách vô nghĩa.
- Hậu tố tên file quyết định luật cô lập: `*.spec.ts` (đơn vị), `*.int-spec.ts` (chạm DB),
  `*.race-spec.ts` (tranh chấp), `e2e/*.e2e-spec.ts` (Playwright).
- **Miễn trừ duy nhất:** feature `000-walking-skeleton` được chạy với `require_tdd: false`,
  lý do ghi rõ trong handoff của nó — bộ khung test chính là thứ đang được dựng. Miễn trừ
  này hết hiệu lực ngay khi feature 000 merge, và không được viện dẫn lại.

### III. Hợp đồng kiểm chứng là cổng duy nhất

`docs/baseline/verification.md` là định nghĩa duy nhất của "xong".

- **Đúng bốn khoá, cố định:** `test`, `lint`, `regression`, `build`. Không có khoá thứ năm
  (`HV009` bắt buộc `test` + `lint`; `BF003` bắt buộc `regression`). Playwright treo vào
  `regression`, không được cấp khoá riêng.
- Agent chạy bốn lệnh đó **nguyên văn**. Một task **KHÔNG** được tự đặt lệnh test riêng để
  báo xanh.
- Khi một bất biến cần test mà lệnh hiện tại không chạy tới, **sửa `verification.md`**
  (trên nhánh `baseline/*`, do người) — không bỏ test, không viết lệnh cục bộ.
- Mỗi lệnh có hai nửa: nửa **glue** (`scripts/`, `tests/`) luôn chạy; nửa **sản phẩm**
  (`apps/*`, `packages/*`, `e2e/`) chạy theo workspace thật sự tồn tại. Kể từ khi feature 000
  merge, một lần chạy báo `SKIPPED` ở nửa sản phẩm là **thất bại**, không phải thành công —
  output luôn nói rõ nó chạy gì và bỏ qua gì, và người review phải đọc dòng đó.
- Ngưỡng: 80% line coverage trên `apps/api/src/modules/**`. Không đặt ngưỡng cho code UI,
  nơi coverage đo sai thứ cần đo.

### IV. Phạm vi là hợp đồng

- Mỗi task brief (`.sdd/<feature>/task-<NNN>-brief.md`) khai báo *allowed scope* và
  *forbidden scope*. Đó là toàn bộ bối cảnh mà subagent thực thi nhận được — không phải cả
  repository, cũng không phải cả spec.
- Không chạm file ngoài allowed scope, **kể cả để cải thiện nó**. Thay đổi kiểu
  "tiện tay sửa luôn" bị từ chối ở review, không thương lượng.
- Ranh giới thư mục module (`apps/api/src/modules/<domain>/`) trùng ranh giới allowed scope.
  Chiều phụ thuộc giữa các module là **luật** (đồ thị ở `architecture.md` § Design Paradigm);
  thêm một mũi tên tạo chu trình là một thay đổi kiến trúc, không phải một task.
- Bảng sở hữu artifact được ép, không phải gợi ý: `docs/baseline/**` chỉ sửa trên `baseline/*`
  bởi người; file này chỉ sửa trên `governance/*`; `specs/<feature>/spec.md` và `plan.md` chỉ do
  lệnh Spec Kit ghi.

### V. Từ vựng đóng

- Mọi artifact, mọi định danh trong code, mọi commit message dùng cột *Canonical term (EN)*
  của `docs/baseline/glossary.md`. Từ ở cột *Do NOT use* bị cấm, kể cả làm tên module hay
  tên thư mục — đó là lý do module tồn kho tên `stock`, không phải `inventory`.
- Cần một thuật ngữ chưa có trong glossary → **DỪNG và hỏi người**. Không đặt từ đồng nghĩa.
- Quy ước kèm theo: `snake_case` cho bảng/cột, `PascalCase` cho type, API công khai của một
  miền ở `<domain>.public.ts`.

*Lý do, và vì sao nó nằm ở đây thay vì trong tài liệu kiến trúc:* trôi tên là chế độ hỏng duy
nhất mà review theo phạm vi task **không thể** phát hiện — mỗi task đọc đúng, chỉ toàn cục
mới sai. Lưu ý giới hạn đã biết: constitution được `/speckit-plan` và `/speckit-analyze` đọc,
**không được `/speckit-specify` đọc**. Vì vậy `glossary.md` phải được trỏ tới trực tiếp từ
`CLAUDE.md` §4, và nguyên tắc này không thay thế việc đó.

### VI. Phiên bản được pin, không dist-tag

- Mọi thành phần trong bảng *Stack* của `architecture.md` được pin ở phiên bản chính xác.
  Cấm `latest`, cấm `@alpha`, cấm chỉ pin major — kể cả tag ảnh container (Caddy pin
  `2.11.4`, không phải `2`).
- Đổi một phiên bản đã pin là sửa baseline: nhánh `baseline/*`, người quyết định, đóng băng lại.
  Nó không bao giờ là một dòng trong `package.json` của một feature branch.
- Nâng cấp được đánh giá theo **release và cơ sở dữ liệu lỗ hổng**, không theo dist-tag.
  `@nestjs/schedule` là ví dụ tại sao: dist-tag `latest` của nó trỏ sang dòng 12, lệch dòng
  Nest 11 mà hệ này chạy.
- Migration: `drizzle-kit generate` + `migrate`. **`push` bị cấm** (AD-25), không có ngoại lệ
  cho môi trường local.

## Ràng buộc kỹ thuật

Các ràng buộc dưới đây là ràng buộc **cứng**. Chúng dẫn xuất từ baseline; khi câu chữ ở đây
và ở `docs/baseline/architecture.md` lệch nhau, **architecture.md thắng** và file này phải
được sửa lại.

**Nền tảng.** Node.js ≥ 24.15 LTS (sàn do `@nestjs/schematics` đặt, không phải runtime) ·
TypeScript 5.9.x · NestJS 11.2.5 · PostgreSQL 18.6 · React 19.3.0 · Vite 8.3.0 ·
Drizzle ORM 0.45.2 / Drizzle Kit 0.31.10 · Caddy 2.11.4.

**Runner theo thư mục — không trộn trong một thư mục.** `apps/api` → Jest 30.4.2.
`apps/storefront`, `apps/backoffice`, `packages/*` → Vitest 5.0.1. `e2e/` → Playwright 1.62.1
kèm `@axe-core/playwright`.

**Sàn bảo mật và khả năng tiếp cận — không tuỳ chọn.**

- `Content-Security-Policy` chặt trên Trang bán hàng là **bắt buộc** (AD-29). Nó là lớp phòng
  thủ duy nhất còn lại cho một rủi ro đã được người quyết định chấp nhận có ý thức: AD-8 đặt
  hai bề mặt sau một origin, nên một lỗ XSS ở Trang bán hàng có thể điều khiển quyền chủ shop
  khi chủ shop đang đăng nhập. Gỡ hay nới CSP là một thay đổi baseline.
- Bundle Trang quản trị **không bao giờ** tới trình duyệt khách (AD-9) — hai bản Vite build
  riêng, kiểm chứng ở `regression`.
- Con số tồn kho chính xác không rời Trang quản trị (AD-19); tình trạng còn/hết không được
  cache ở bất kỳ tầng nào (AD-20).
- Sàn **WCAG 2.1 AA** là ràng buộc cứng do UX đặt. Vì đây là SPA định tuyến phía client, mỗi
  lần đổi route phải thông báo được cho screen reader — không có ranh giới tải trang làm việc
  đó thay. Primitive dùng chung ở `packages/ui`.
- Rò rỉ dữ liệu xuyên khách hàng trả **404**, không phải 403 (AD-13). Không stack trace ra client.

**Biểu diễn dữ liệu.** Tiền là **số nguyên VND**, đã gồm VAT, không thập phân, không dấu phẩy
động. Thời gian lưu `timestamptz` UTC, hiển thị `Asia/Ho_Chi_Minh`; không cột nào lưu giờ địa
phương. Trạng thái đơn đúng năm giá trị của glossary; phương thức thanh toán đúng hai.

**Cấu hình.** Cấu hình triển khai đọc từ biến môi trường và validate **một lần lúc khởi động**
bằng schema trong `packages/shared`; cấm rải `process.env` khắp code. Cấu hình do chủ shop sửa
(thông tin ngân hàng, FR-23) nằm trong bảng của `settings`, **không bao giờ** trong biến môi trường.

**Điều kiện tiên quyết — đã đóng ngày 2026-09-19.** Bản 1.0.0 của file này ghi máy phát
triển chạy Node 24.13.0, dưới sàn 24.15, và chặn feature `000-walking-skeleton` cho tới khi
điều đó được đóng. Máy đã ở **24.21.0** (commit `93d0844`) và Docker đã dùng được
(`docs/tooling-versions.md`, đo lại 2026-09-19), nên **cả hai điều kiện tiên quyết đều đã
đạt** và câu chặn không còn hiệu lực.

Luật đằng sau nó **không đổi** và vẫn áp cho mọi feature sau: sàn Node ≥ 24.15 là do
`@nestjs/schematics` đặt cho việc **scaffold**, không phải runtime; agent có scaffold nên sàn
cao hơn thắng. Một máy dưới sàn vẫn là điều kiện tiên quyết chưa đóng, và feature vẫn không
được bắt đầu. Thứ hết hạn ở đây là **quan sát về một máy cụ thể tại một thời điểm**, không
phải quy tắc. Con số đo được thuộc về `docs/tooling-versions.md`; file này chỉ nên nói luật.

## Quy trình phát triển và cổng chất lượng

**Chọn track trước, luôn luôn.** Mọi đơn vị thay đổi bắt đầu bằng một tuyên bố track kèm lý do
(`CLAUDE.md` §0). Không chứng minh được Track C trước cả mười tiêu chí CV thì đó là Track B.
**Không bao giờ hạ track.** Leo thang nghĩa là bỏ đơn vị thay đổi hiện tại và bắt đầu lại ở
track cao hơn — không phải vá tiếp cái đang dở.

**Ranh giới công cụ, ép bằng `CLAUDE.md` §1.** BMAD dừng ở cuối Phase 3. Spec Kit sở hữu
`spec.md` → `plan.md` → `tasks.md` và **dừng ở `tasks.md`**. Superpowers sở hữu thực thi và
review. Các lệnh bị cấm liệt kê ở `CLAUDE.md` §1 là cấm tuyệt đối; tin rằng cần một trong số
đó thì **dừng và hỏi người**, không tự quyết.

**Quy ước nhánh.**

| Tiền tố | Dùng cho | Ai được ghi |
| --- | --- | --- |
| `baseline/*` | `docs/baseline/**` | Người (+ BMAD trên nhánh này) |
| `governance/*` | `.specify/memory/constitution.md` | Người |
| `NNN-slug` | Một feature — khớp tên thư mục `specs/<feature>/` | Spec Kit + Superpowers |
| `chore/*` | Nâng cấp bộ công cụ, cấu hình repo | Bất kỳ |

Thực thi feature chạy trong **git worktree riêng** (`superpowers:using-git-worktrees`). Trong
worktree, `export SPECIFY_FEATURE_DIRECTORY=specs/<feature>` trước mọi lệnh `speckit-*` hoặc
`sdd_*`, hoặc truyền `--feature <id>` tường minh.

**Cổng bắt buộc, theo thứ tự.** Không cổng nào được bỏ qua, và không cổng nào được tự báo cáo
là đạt mà không có output lệnh kèm theo:

1. `/sdd-validate <id>` xanh — handoff hợp lệ, `baseline_id` khớp freeze hiện hành. Handoff có
   `baseline_id` lệch là **stale** và **KHÔNG ĐƯỢC** thực thi.
2. Working tree sạch (`HV014`) trước khi bắt đầu.
3. Mỗi tiêu chí nghiệm thu trong `spec.md` có một task sở hữu nó trong `tasks.md` (`HV007b`),
   và task đó báo xong.
4. Bốn lệnh của hợp đồng kiểm chứng exit 0, và output cho thấy nửa sản phẩm **đã chạy**.
5. Code quality review đạt (`superpowers:requesting-code-review`).
6. Final verification đạt (`superpowers:verification-before-completion`).
7. Track A/B: `/speckit-converge` đã chạy và không để lại task chưa xử lý.

**Chính sách review.** Review chấm theo brief của chính task đó, không theo khẩu vị của người
review. Ba thứ bị từ chối mặc định: thay đổi ngoài allowed scope; tên không có trong glossary;
test xanh mà không chứng minh được bất biến nó mang tên. Nhận feedback review là việc phải kiểm
chứng kỹ thuật, không phải gật cho xong (`superpowers:receiving-code-review`).

**Merge request.** Mỗi MR mang một dòng truy vết đầy đủ:

```text
PRD FR-012 → spec FR-003 → plan §transaction-boundary → T005
  → task-005-brief.md → commit abc123 → cancel-order.spec.ts
  → review-005.md → MR !123
```

Không dựng được chuỗi này nghĩa là có mắt xích chưa tồn tại — đó là lý do chặn merge, không
phải chi tiết hình thức.

## Governance

**Thứ tự ưu tiên khi xung đột.** `docs/baseline/**` (baseline đã đóng băng) → file này →
`CLAUDE.md` → mô tả skill và hành vi mặc định của công cụ. Một skill tự mô tả mình là
"You MUST use this before any creative work" vẫn bị `CLAUDE.md` §2 ghi đè khi đã có handoff
hợp lệ. Khi file này mâu thuẫn với baseline, **baseline thắng** — và mâu thuẫn đó là một lỗi
của file này, phải sửa bằng một bản tu chính.

**Thủ tục tu chính.**

1. Đề xuất nêu rõ: nguyên tắc nào đổi, vì sao, và điều gì hỏng nếu giữ nguyên.
2. Thực hiện trên nhánh `governance/*`. Không bao giờ trên feature branch.
3. Người có tên phê duyệt. Không phải "the team", không phải một agent.
4. Nếu bản tu chính làm lệch một artifact baseline, sửa baseline **trước** và đóng băng lại;
   file này bám theo baseline, không kéo baseline theo nó.
5. Merge kèm Sync Impact Report trong mô tả MR.

**Chính sách đánh phiên bản** (semver, áp cho chính file này):

- **MAJOR** — gỡ hoặc định nghĩa lại một nguyên tắc theo hướng không tương thích ngược.
- **MINOR** — thêm một nguyên tắc/mục mới, hoặc mở rộng hướng dẫn một cách thực chất.
- **PATCH** — làm rõ câu chữ, sửa lỗi chính tả, tinh chỉnh không đổi ngữ nghĩa.

**Kiểm tra tuân thủ.** `/speckit-plan` và `/speckit-analyze` đọc file này; mọi phát hiện
"vi phạm constitution" từ `/speckit-analyze` là **chặn**, không phải cảnh báo. Độ phức tạp
vượt mức phải được biện minh tại chỗ trong `plan.md`, nêu rõ phương án đơn giản hơn đã bị loại
và vì sao. Hướng dẫn vận hành lúc chạy nằm ở `CLAUDE.md`; nó diễn giải file này và không được
mâu thuẫn với nó.

**Version**: 1.0.1 | **Ratified**: 2026-09-19 | **Last Amended**: 2026-09-19
