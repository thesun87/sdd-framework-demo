# Implementation Plan — Setup Agentic SDD Workflow on Antigravity

Dựa trên tài liệu hướng dẫn `docs/agentic-sdd-setup-guide.md` và hiện trạng repository (vốn đang cấu hình chính cho Claude Code trong `.claude/`), chúng ta sẽ thiết lập đầy đủ môi trường, quy tắc (rules), kịch bản kỹ năng (skills) và tầng kết nối (glue layer) để **Antigravity** có thể chạy mượt mà và chuẩn hóa toàn bộ quy trình 3 track (Track A, B, C).

## Phân tích hiện trạng & Kiến trúc Antigravity

1. **Discovery Root**: Antigravity tự động quét các cấu hình trong thư mục `.agents/` ở gốc repository và các file luật `AGENTS.md` / `GEMINI.md`. Hiện tại repository chưa có thư mục `.agents/` và chưa có `AGENTS.md` / `GEMINI.md` (chỉ có `.claude/` và `CLAUDE.md`).
2. **Spec Kit**: Spec Kit v1.0.8 hỗ trợ native integration cho Antigravity thông qua `--integration agy`, sinh các skill `speckit-*` trực tiếp vào `.agents/skills/`.
3. **BMAD Method**: BMAD v6.12.0 hỗ trợ tool `antigravity-cli` (mục tiêu `.agents/skills/`), xuất các skill `bmad-*` phục vụ Track A (product-brief, prd, architecture, v.v.).
4. **Superpowers**: Superpowers cung cấp các kỹ năng thực thi nòng cốt (`subagent-driven-development`, `test-driven-development`, `using-git-worktrees`, `systematic-debugging`, `requesting-code-review`, `verification-before-completion`, v.v.). Chúng ta sẽ cài đặt bộ kỹ năng này vào `.agents/skills/`.
5. **Glue Layer (SDD Commands)**: Các slash command trước đây trong `.claude/commands/` (`sdd-track`, `sdd-handoff`, `sdd-validate`, `sdd-change`) sẽ được chuyển hóa thành Antigravity Skills đạt chuẩn trong `.agents/skills/` kèm hướng dẫn thực thi rõ ràng.
6. **Traffic Controller**: Tạo `AGENTS.md` và `GEMINI.md` kế thừa và đồng bộ các quy tắc traffic controller từ `CLAUDE.md`, ngăn chặn xung đột giữa BMAD, Spec Kit và Superpowers.
7. **Git Pre-commit Hook**: Bảo vệ `docs/baseline/` và `constitution.md`.

---

## Proposed Changes

### 1. Spec Kit & BMAD Integration for Antigravity

#### [NEW] Cài đặt / cập nhật Spec Kit cho Antigravity
- Chạy:
  ```bash
  specify init --here --force --integration agy --script sh
  ```
- Thao tác này sẽ thiết lập cấu hình `.specify/` và sinh các skill `speckit-*` vào `.agents/skills/`.

#### [MODIFY] Cập nhật BMAD cho Antigravity
- Chạy:
  ```bash
  npx -y bmad-method install --yes --action update --tools antigravity-cli --modules bmm --set core.output_folder=docs/baseline
  ```
- Thao tác này sẽ đồng bộ các skill BMAD vào `.agents/skills/` (giữ nguyên config output ở `docs/baseline`).

---

### 2. Superpowers Execution Skills for Antigravity

#### [NEW] Cài đặt bộ kỹ năng Superpowers vào `.agents/skills/`
- Chép các skill chính từ repo official `obra/superpowers` vào `.agents/skills/`:
  - `subagent-driven-development`
  - `test-driven-development`
  - `using-git-worktrees`
  - `systematic-debugging`
  - `requesting-code-review`
  - `receiving-code-review`
  - `verification-before-completion`
  - `finishing-a-development-branch`
  - `dispatching-parallel-agents`
  - `brainstorming` (được kiểm soát/suppress bởi traffic controller khi có handoff)
  - `writing-plans` (được kiểm soát/suppress bởi traffic controller)
  - `executing-plans` (được kiểm soát/suppress)

---

### 3. SDD Glue Skills

Tạo các skill trong `.agents/skills/` với frontmatter YAML chuẩn (`name`, `description`) để Antigravity nhận diện khi người dùng gọi hoặc kích hoạt theo ngữ cảnh:

#### [NEW] [sdd-track](file:///home/tuannguyen/projects/ai-learning/sdd-framework/.agents/skills/sdd-track/SKILL.md)
- Quyết định phân loại công việc vào Track A, B hay C dựa trên bộ tiêu chí CV001–CV010.

#### [NEW] [sdd-handoff](file:///home/tuannguyen/projects/ai-learning/sdd-framework/.agents/skills/sdd-handoff/SKILL.md)
- Tạo file `.sdd/<feature>/handoff.yaml` thông qua script `scripts/sdd/sdd_handoff.py`.

#### [NEW] [sdd-validate](file:///home/tuannguyen/projects/ai-learning/sdd-framework/.agents/skills/sdd-validate/SKILL.md)
- Kiểm tra tính hợp lệ và độ tươi mới (staleness) của handoff thông qua `scripts/sdd/sdd_validate.py`.

#### [NEW] [sdd-change](file:///home/tuannguyen/projects/ai-learning/sdd-framework/.agents/skills/sdd-change/SKILL.md)
- Khởi tạo `change-record.yaml` cho Track C thông qua `scripts/sdd/sdd_change.py`.

---

### 4. Traffic Controller & Rules

#### [NEW] [AGENTS.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework/AGENTS.md) & [GEMINI.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework/GEMINI.md)
- Định nghĩa rõ quy tắc điều phối của Antigravity tương tự `CLAUDE.md`:
  - Chọn track trước khi thực hiện bất kỳ việc gì.
  - Các lệnh / skill bị cấm (như `bmad-create-epics-and-stories`, `speckit-implement`, tạo plan trùng lặp khi đã có `handoff.yaml`).
  - Phạm vi bất khả xâm phạm (`docs/baseline/**`, `constitution.md`).
  - Hướng dẫn thực thi bằng subagents theo task brief trong `.sdd/<feature>/`.
  - Liên kết `GEMINI.md -> AGENTS.md` (hoặc symlink).

---

### 5. Git Pre-commit Hook & Tooling Documentation

#### [NEW] [.githooks/pre-commit](file:///home/tuannguyen/projects/ai-learning/sdd-framework/.githooks/pre-commit)
- Tạo pre-commit hook ngăn chặn commit vào `docs/baseline/` hoặc `.specify/memory/constitution.md` nếu không ở trên branch `baseline/*` hoặc `governance/*`.
- Cấu hình git: `git config core.hooksPath .githooks`.

#### [MODIFY] [docs/tooling-versions.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework/docs/tooling-versions.md)
- Bổ sung thông tin về Antigravity CLI / IDE, kênh cấu hình `.agents/skills`, mapping tích hợp.

#### [MODIFY] [docs/sdd-setup-status.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework/docs/sdd-setup-status.md)
- Cập nhật trạng thái setup sẵn sàng cho Antigravity.

---

## Verification Plan

### Automated Tests
- Chạy toàn bộ test suite hiện có:
  ```bash
  npm test
  npm run lint
  npm run test:regression
  npm run build
  ```
- Kiểm tra danh sách skills trong `.agents/skills`:
  - Các skill Spec Kit (`speckit-*`)
  - Các skill BMAD (`bmad-*`)
  - Các skill Superpowers (`subagent-driven-development`, v.v.)
  - Các skill SDD Glue (`sdd-track`, `sdd-handoff`, `sdd-validate`, `sdd-change`)

### Manual / Integration Verification
- Thử chạy `sdd-validate` đối với một test case handoff.
- Kiểm tra pre-commit hook bằng cách thử stage và phát hiện file baseline bị chặn trên non-baseline branch.
- Đảm bảo Antigravity nhận diện các rule trong `AGENTS.md`.
