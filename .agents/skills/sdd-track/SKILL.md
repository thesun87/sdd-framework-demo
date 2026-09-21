---
name: "sdd-track"
description: "Decide which SDD track (Track A, B, or C) applies to the requested work."
---

## Purpose

Determine the correct SDD track for the requested task:
`$ARGUMENTS`

## Procedure

1. Check whether `docs/baseline/baseline-freeze.yaml` exists with status `frozen`.
2. Walk the Track C entry criteria CV001–CV010 from `docs/agentic-sdd-protocol-v2.md` explicitly, one by one, answering each true/false with a one-line reason:
   - CV001: Defect is reproducible with an automated test or is a trivial mechanical change.
   - CV002: Does not touch or modify public API contracts.
   - CV003: Does not alter database schema or data migrations.
   - CV004: Does not change authorization/authentication logic.
   - CV005: Does not add new user-visible capabilities or modify acceptance criteria.
   - CV006: Does not touch or modify architecture baseline docs (`docs/baseline/**`).
   - CV007: Does not alter non-functional requirements (performance, compliance, SLA).
   - CV008: Scope affects fewer than 8 files and fewer than 200 LOC changed.
   - CV009: No ambiguity in expected behavior or requirement clarification needed.
   - CV010: Fix is isolated and low risk for unintended regressions.
3. Recommend a track and state the first command to run:
   - **Track A (greenfield)**: no frozen baseline exists → BMAD (`bmad-product-brief`...) → Spec Kit → Superpowers
   - **Track B (feature)**: baseline exists AND the change touches business rules, contracts, schema, authz, acceptance criteria, NFRs, or adds a capability → Spec Kit (`speckit-specify`...) → Superpowers
   - **Track C (direct)**: reproducible defect or trivial change meeting all CV001–CV010 criteria → Superpowers only (`sdd-change`...)
4. If you cannot justify Track C against ALL ten CV criteria, it is Track B.
5. **CRITICAL**: Do NOT start any work. This skill ONLY decides and stops.
