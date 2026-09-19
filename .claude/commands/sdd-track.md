---
description: Decide which SDD track applies to the requested work
---

Determine the correct track for: $ARGUMENTS

1. Check whether `docs/baseline/baseline-freeze.yaml` exists with status `frozen`.
2. Walk the Track C entry criteria CV001–CV010 from
   `docs/agentic-sdd-protocol-v2.md` explicitly, one by one, answering each
   true/false with a one-line reason.
3. Recommend a track and state the first command to run.
4. Do NOT start any work. This command only decides.

Reference:
- Track A (greenfield): no frozen baseline → BMAD → Spec Kit → Superpowers
- Track B (feature): baseline exists AND the change touches business rules,
  contracts, schema, authz, acceptance criteria, NFRs, or adds a capability
  → Spec Kit → Superpowers
- Track C (direct): reproducible defect or trivial change, none of the above
  → Superpowers only
If you cannot justify Track C against ALL ten CV criteria, it is Track B.
