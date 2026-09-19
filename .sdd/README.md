# `.sdd/` — the glue layer's artifacts

Owned by `scripts/sdd/*.py` and by Superpowers during execution.
Everything here is **committed**; the audit trail is the point.

```text
.sdd/
├── <feature-id>/                 # Track A and B
│   ├── handoff.yaml              # generated — /sdd-handoff, validated by /sdd-validate
│   ├── codebase-context.md       # Track B, hand-curated, ≤ 8 KB (BF004)
│   ├── progress.md
│   ├── rulings.md                # decisions taken during execution
│   ├── task-<NNN>-brief.md       # the ONLY context a task subagent receives
│   ├── task-<NNN>-report.md
│   ├── task-<NNN>-review.md
│   └── runs/<run-id>/
└── direct/<YYYY-MM-DD>-<TICKET>/ # Track C
    ├── change-record.yaml        # generated — /sdd-change
    ├── analysis.md
    ├── report.md
    └── review.md
```

Rules:
- **Never** put a `plan.md` in `.sdd/<feature>/` — `specs/<feature>/tasks.md` is
  the only plan. HV008 blocks it.
- `handoff.yaml` is generated, never hand-edited. If it is wrong, fix the owning
  artifact and regenerate.
- `.sdd/*/runs/*/*.snapshot.md` is gitignored; manifests are not.
