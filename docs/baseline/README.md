# Product Baseline — PROTECTED

Everything in this directory is the frozen product baseline.

**Rules**
- May only be modified on a `baseline/*` branch, by a human.
- A feature branch that touches `docs/baseline/**` is rejected at review.
- BMAD writes drafts to `docs/baseline/planning-artifacts/`. Those are *drafts*.
  A human curates them into the canonical files below, then freezes.

**Canonical files** (protocol v2 path mapping, setup guide §2.1)

| File | Owner | Required for |
|---|---|---|
| `product-brief.md` | BMAD + human | Track A |
| `prd.md` + `prd/` (sharded) | BMAD + human | Track A (BV003 traces spec FRs to PRD FRs) |
| `architecture.md` + `architecture/` (sharded) | BMAD + human | Track A, B |
| `ux-spec.md` | BMAD + human | Track A (if UI) |
| `glossary.md` | **human only** | all tracks (HV015) |
| `feature-map.md` | **human only** | Track A, B intake |
| `verification.md` | **human only** | all tracks (HV009) |
| `adr/` | human + BMAD | Track A, B |
| `baseline-freeze.yaml` | human | Track A (BV001, BV002) |

Sharded `architecture/` should contain at minimum: `tech-stack.md`,
`source-tree.md`, `coding-standards.md`, `data-model.md`,
`integration-contracts.md`.
