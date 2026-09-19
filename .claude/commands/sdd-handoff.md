---
description: Generate the handoff contract for the active feature
---

Arguments: $ARGUMENTS  (expected form: `<feature-id> <track A|B>`)

1. Confirm `specs/<feature-id>/{spec.md,plan.md,tasks.md}` all exist AND are
   committed — `handoff.yaml` records their git SHAs and HV013 fails on
   uncommitted artifacts.
2. Run: `python3 scripts/sdd/sdd_handoff.py --feature <feature-id> --track <A|B>`
   (omit `--feature` to use the active Spec Kit feature, i.e.
   `SPECIFY_FEATURE_DIRECTORY` or `.specify/feature.json`).
3. Show me the generated `.sdd/<feature-id>/handoff.yaml` and STOP.

Do not begin execution until `/sdd-validate` passes.
