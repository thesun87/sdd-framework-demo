---
description: Start a Track C direct change
---

For the defect described in: $ARGUMENTS

1. Walk CV001–CV010 explicitly (see `docs/agentic-sdd-protocol-v2.md`).
   If ANY is false, STOP and tell me it is Track B. Never downgrade a track.
2. Run `python3 scripts/sdd/sdd_change.py --ticket <ID> --type <bugfix|config|docs|dependency-patch|internal-refactor>`
3. Fill in the generated `change-record.yaml`: defect, allowed/forbidden scope,
   verification commands. Leave `root_cause` as TODO until it is actually found.
4. Then, and only then, write the failing regression test.

Use the Superpowers skills `systematic-debugging`, `test-driven-development`,
`requesting-code-review`, `verification-before-completion`.
Skip brainstorming and planning skills entirely.
