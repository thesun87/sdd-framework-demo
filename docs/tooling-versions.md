# Toolchain Versions — Agentic SDD

| Tool | Channel | Version | Pinned on | Upgrade owner |
|---|---|---|---|---|
| specify-cli (Spec Kit) | `uv tool install specify-cli` | 1.0.8 | 2026-09-18 | Tuan Nguyen |
| BMAD (core + bmm) | `npx bmad-method` stable | 6.12.0 | 2026-09-18 | Tuan Nguyen |
| Superpowers | `superpowers@claude-plugins-official` | 6.3.0 | 2026-09-18 | Tuan Nguyen |
| Claude Code | stable | 2.1.276 | 2026-09-18 | Tuan Nguyen |
| Python | system | 3.12.3 | 2026-09-18 | Tuan Nguyen |
| Node | nvm | **24.21.0** (sàn `>=24.15`) | 2026-09-19 | Tuan Nguyen |
| PostgreSQL | docker | 18.6 | 2026-09-19 | Tuan Nguyen |
| PyYAML | system | 6.0.1 | 2026-09-18 | Tuan Nguyen |
| Antigravity (AGY / IDE) | Google | 2.0 | 2026-09-21 | Tuan Nguyen |

> **Node đã nâng 24.13.0 → 24.21.0 ngày 2026-09-19.** `EBADENGINE` đã hết.
> Sàn `>=24.15` không do runtime đặt (NestJS 11 chạy được từ 20.19) mà do
> `@nestjs/schematics` đặt cho việc scaffold; agent có scaffold, nên sàn cao hơn
> là sàn có hiệu lực.
>
> **Vì sao 24.21.0 chứ không phải đúng 24.15.0.** Dòng 24.15 không có bản vá nào
> — `24.15.0` (15/04/2026) là bản duy nhất, và nó nằm dưới hai đợt vá bảo mật:
> **24.17.0** (18/06/2026, 9 CVE, 2 High) và **24.18.1** (29/07/2026, 11 CVE,
> 3 High). `architecture.md` § Stack ghi Node là **sàn** (`24.15+`), không phải
> pin, nên nâng lên bản LTS mới nhất của dòng 24 không phải một thay đổi baseline
> (constitution §VI chỉ chặn việc đổi phiên bản đã pin).
>
> ⚠️ **Phiên Claude Code mở trước lúc nâng vẫn thấy 24.13.0** — `PATH` được kế
> thừa lúc khởi động và nvm không viết đè entry đã có. `nvm alias default` đã
> trỏ đúng `v24.21.0`; khởi động lại phiên là đủ.
>
> Node 24 rời Active LTS ngày **20/10/2026** và sang Maintenance tới 30/04/2028;
> Node 26 thành Active LTS ngày 28/10/2026. Mốc đó rơi khoảng một tháng sau thời
> điểm freeze — xem mục Deferred của `docs/baseline/architecture.md`.
>
> ✅ **Docker đã dùng được — chặn này đã gỡ, đo lại ngày 2026-09-19.**
> `docker -v` → **29.1.2** (build 890dcca); `docker compose version` →
> **v2.40.3-desktop.1**; `docker info` trả lời bình thường (Docker Desktop,
> 20 container, 24 image), nên daemon sống chứ không chỉ có binary trên `PATH`.
> `docker pull postgres:18.6` thành công, nên **PostgreSQL 18.6 giờ là phiên bản
> chạy được thật**, không còn chỉ là phiên bản đã chốt — AD-27 thoả được.
> Việc pull thành công cũng chứng minh có mạng, nên `npx playwright install`
> (bước chuẩn bị có mạng của `regression`) không còn là ẩn số.
>
> Bản ghi cũ ở chỗ này nói `docker: command not found` và gọi đây là điều kiện
> tiên quyết của cổng nghiệm thu feature 000. Câu đó **hết hiệu lực**. Giữ lại
> dấu vết vì nó giải thích vì sao `specs/000-walking-skeleton/plan.md` và
> `tasks.md` vẫn mang ghi chú chặn Docker: hai file đó do Spec Kit sở hữu
> (`CLAUDE.md` §3) và sẽ được `/speckit-analyze` đối chiếu, không sửa tay ở đây.

Upgrade policy: one tool at a time, on a branch, validated against the
pilot feature before adoption. Never upgrade mid-feature.

---

## Reinstall commands (reproducible)

```bash
uv tool install specify-cli
specify init --here --force --non-interactive --integration claude --script sh

npx --yes bmad-method@latest install --yes \
  --directory "$(pwd)" --modules bmm --tools claude-code \
  --set core.output_folder=docs/baseline
```

Superpowers is a Claude Code plugin and must be installed interactively from
inside Claude Code, per project:

```text
/plugin install superpowers@claude-plugins-official
```

For Antigravity (AGY / IDE):

```bash
specify init --here --force --non-interactive --integration agy --script sh

npx --yes bmad-method@latest install --yes \
  --directory "$(pwd)" --modules bmm --tools antigravity-cli \
  --set core.output_folder=docs/baseline

# Superpowers skills: placed into .agents/skills/
# SDD Glue skills: .agents/skills/sdd-{track,handoff,validate,change}/
```

---

## Version-specific deviations from the setup guide

The guide was written against earlier releases. These are the differences that
actually affect the glue, confirmed on the versions above:

| Guide says | Reality on installed version | Where it is handled |
|---|---|---|
| `/speckit.specify` (dot) | `/speckit-specify` (hyphen) | `CLAUDE.md` §6 |
| `/bmad:bmm:workflows:create-prd` | skill `bmad-prd` | `CLAUDE.md` §1, §6 |
| `create-epics-and-stories` workflow | skill `bmad-create-epics-and-stories` | `CLAUDE.md` §1 |
| `document-project`, `generate-project-context` | `bmad-walkthrough`, `bmad-deep-recon`, `bmad-project-context` | `CLAUDE.md` §6 |
| `.specify/feature.json` always present | created on first `/speckit-specify`, and **gitignored** by `.specify/.gitignore` | `sdd_lib.active_feature()` also reads `SPECIFY_FEATURE_DIRECTORY` / `SPECIFY_FEATURE` |
| `/superpowers:write-plan`, `/superpowers:brainstorm` | skills `superpowers:writing-plans`, `superpowers:brainstorming` (v6 renamed them; `executing-plans` is a third competing executor) | `CLAUDE.md` §1, §2, §6 |
| `_bmad/bmm/config.yaml` holds output folder | also `_bmad/config.toml` (`[core] output_folder`); installer-managed, override in `_bmad/custom/config.toml` | — |
| BMAD writes straight to `output_folder` | writes to `docs/baseline/planning-artifacts/` | curate by hand at freeze time |

Part 7 (CI enforcement) of the setup guide was deliberately **not** installed —
no CI platform is wired to this repository yet. The four guard jobs
(baseline-guard, handoff-guard, track-c-guard, traceability-guard) remain
specified in `docs/agentic-sdd-setup-guide.md` §7 and should be added when a
CI platform is chosen.
