# Agentic SDD — Operating Rules (Antigravity / Gemini)

This file references the primary operating rules defined in [AGENTS.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework-demo/AGENTS.md).
Antigravity and Gemini agents in this repository MUST strictly adhere to the rules in [AGENTS.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework-demo/AGENTS.md).

## Summary of Core Directives

1. **Always Choose Track First**: Track A (greenfield), Track B (feature), Track C (direct defect/trivial). Run `sdd-track` when in doubt.
2. **Forbidden Skills**:
   - `bmad-create-epics-and-stories` (Spec Kit owns the task list)
   - BMAD phase 4 / build skills (Superpowers owns execution)
   - `speckit-implement` (Superpowers owns execution)
   - `writing-plans`, `brainstorming`, `executing-plans` when validated `handoff.yaml` exists (`tasks.md` IS the plan)
3. **Protected Files**:
   - `docs/baseline/**` (human + BMAD on `baseline/*` branches only)
   - `.specify/memory/constitution.md` (governance branch only)
   - `specs/<feature>/spec.md`, `plan.md`, `tasks.md` (Spec Kit only)
4. **Execution by Subagents**:
   - Tasks in `specs/<feature>/tasks.md` executed using `subagent-driven-development` and scoped to `.sdd/<feature>/task-<NNN>-brief.md`.

For full protocol details, see [AGENTS.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework-demo/AGENTS.md) and [docs/agentic-sdd-protocol-v2.md](file:///home/tuannguyen/projects/ai-learning/sdd-framework-demo/docs/agentic-sdd-protocol-v2.md).
