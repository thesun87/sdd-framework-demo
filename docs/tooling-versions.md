# Toolchain Versions — Agentic SDD

| Tool | Channel | Version | Pinned on | Upgrade owner |
|---|---|---|---|---|
| specify-cli (Spec Kit) | `uv tool install specify-cli` | 1.0.8 | 2026-09-18 | Tuan Nguyen |
| BMAD (core + bmm) | `npx bmad-method` stable | 6.12.0 | 2026-09-18 | Tuan Nguyen |
| Superpowers | `superpowers@claude-plugins-official` | 6.3.0 | 2026-09-18 | Tuan Nguyen |
| Claude Code | stable | 2.1.276 | 2026-09-18 | Tuan Nguyen |
| Python | system | 3.12.3 | 2026-09-18 | Tuan Nguyen |
| Node | system | 24.13.0 | 2026-09-18 | Tuan Nguyen |
| PyYAML | system | 6.0.1 | 2026-09-18 | Tuan Nguyen |

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
