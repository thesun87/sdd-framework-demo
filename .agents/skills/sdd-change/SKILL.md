---
name: "sdd-change"
description: "Start a Track C direct change and initialize change-record.yaml."
---

## Purpose

Start a Track C direct change for a defect or trivial change.

## Arguments

`$ARGUMENTS` (description of the defect or ticket info)

## Procedure

1. Walk CV001–CV010 explicitly (see `docs/agentic-sdd-protocol-v2.md`).
   - If ANY criterion evaluates to false, STOP and declare that the work belongs in Track B. Never downgrade a track.
2. Run:
   ```bash
   python3 scripts/sdd/sdd_change.py --ticket <ID> --type <bugfix|config|docs|dependency-patch|internal-refactor>
   ```
3. Fill in the generated `.sdd/direct/<date>-<ID>/change-record.yaml`:
   - Fill in defect description, allowed and forbidden scope, verification commands.
   - Leave `root_cause` as TODO until the root cause is verified through systematic debugging.
4. Then, and only then, write the failing regression test.
5. Execute using Superpowers skills:
   - `systematic-debugging`
   - `test-driven-development`
   - `requesting-code-review`
   - `verification-before-completion`
6. Skip brainstorming and planning skills entirely.
