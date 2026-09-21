---
name: "sdd-validate"
description: "Validate the SDD handoff contract and artifact freshness before execution."
---

## Purpose

Validate the handoff contract before Superpowers execution begins.

## Arguments

`$ARGUMENTS` (expected: feature ID, e.g. `000-walking-skeleton` or empty for active feature)

## Procedure

1. Run the validator script:
   ```bash
   python3 scripts/sdd/sdd_validate.py --feature $ARGUMENTS
   ```
2. If it exits non-zero:
   - Report every failed rule (FAIL) and STOP.
   - Do NOT start Superpowers execution.
   - Do NOT attempt to artificially alter artifacts just to pass the validator — fix the underlying root problem in the owning artifact, or return the feature to the owning planning phase.
3. Note: `WARN` lines inform; `FAIL` lines block execution. Never demote a failing rule to a warning.
