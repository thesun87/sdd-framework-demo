# Feature Map

**Human-owned.** Agents read this; they never write it.

Each entry is a vertical slice stated as an *outcome*, not a solution.
Rules (setup guide Appendix B #4):
- ≤ 15 tasks per feature. Larger features must be split.
- Dependency-ordered. `000-walking-skeleton` comes first in Track A.
- One row = one `specs/NNN-slug/` directory.

| ID | Outcome (what the user can do afterwards) | Depends on | Track | Status |
|---|---|---|---|---|
| 000-walking-skeleton | _TODO: thinnest end-to-end slice that exercises the whole stack_ | — | A | planned |

## Intake queue (Track B)

New requests land here as outcomes. Nothing moves to the table above until a
human has confirmed it fits inside the current architecture baseline. If it does
not, escalate to a baseline revision on a `baseline/*` branch first.

| Date | Requested outcome | Fits current architecture? | Decision |
|---|---|---|---|
