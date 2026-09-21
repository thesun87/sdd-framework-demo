---
name: "sdd-handoff"
description: "Generate the handoff contract (.sdd/<feature>/handoff.yaml) for the active feature."
---

## Purpose

Generate the handoff contract for the active feature before transitioning to execution.

## Arguments

`$ARGUMENTS` (expected format: `<feature-id> <track A|B>`)

## Procedure

1. Confirm `specs/<feature-id>/{spec.md,plan.md,tasks.md}` all exist AND are committed:
   - `handoff.yaml` records git SHAs of these artifacts. Rule HV013 will fail if any artifact has uncommitted changes.
2. Run:
   ```bash
   python3 scripts/sdd/sdd_handoff.py --feature <feature-id> --track <A|B>
   ```
   *(Omit `--feature` if resolving the active Spec Kit feature from `SPECIFY_FEATURE_DIRECTORY` or `.specify/feature.json`).*
3. Display the generated `.sdd/<feature-id>/handoff.yaml` and STOP.
4. Do NOT begin execution until `sdd-validate` passes.
