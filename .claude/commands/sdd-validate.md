---
description: Validate the handoff contract before execution
---

Run: `python3 scripts/sdd/sdd_validate.py --feature $ARGUMENTS`

If it exits non-zero, report every failed rule and STOP.
Do not start Superpowers execution. Do not attempt to fix artifacts to make
the validator pass — fix the underlying problem in the owning artifact, or
return the feature to the owning phase.

WARN lines inform; FAIL lines block. Never demote a failing rule to a warning.
