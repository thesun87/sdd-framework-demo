#!/usr/bin/env python3
"""Validate a handoff contract. Exit 0 = PASS, 1 = BLOCKED.

Setup guide Part 3.5.  This script NEVER repairs an artifact — it only reports.
Fix the owning artifact and regenerate the handoff.
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sdd_lib import (  # noqa: E402
    BASELINE, CONSTITUTION, ROOT, SDD, SPECS,
    active_feature, find_ids, git_sha, has_unresolved_clarifications,
    read, working_tree_clean,
)

CODEBASE_CONTEXT_MAX_BYTES = 8_000   # ~one page


class Result:
    def __init__(self) -> None:
        self.failures: list[tuple[str, str]] = []
        self.warnings: list[tuple[str, str]] = []

    def check(self, rule: str, ok: bool, msg: str) -> None:
        if not ok:
            self.failures.append((rule, msg))

    def warn(self, rule: str, ok: bool, msg: str) -> None:
        if not ok:
            self.warnings.append((rule, msg))


def artifact(h: dict, key: str) -> Path | None:
    node = h.get(key) or {}
    return ROOT / node["path"] if node.get("path") else None


def validate(feature: str) -> Result:
    r = Result()
    hp = SDD / feature / "handoff.yaml"
    if not hp.exists():
        r.check("HV000", False, f"handoff not found: {hp}")
        return r
    h = yaml.safe_load(hp.read_text(encoding="utf-8")) or {}
    track = h.get("track")
    fdir = SPECS / feature

    spec_txt = read(fdir / "spec.md")
    plan_txt = read(fdir / "plan.md")
    tasks_txt = read(fdir / "tasks.md")

    # ---------- common rules ----------
    r.check("HV001", CONSTITUTION.exists(), "constitution.md missing")
    r.check("HV002", bool(spec_txt), "spec.md missing or empty")
    r.check("HV003", bool(plan_txt), "plan.md missing or empty")
    r.check("HV004", bool(tasks_txt), "tasks.md missing or empty")
    r.check("HV005", not has_unresolved_clarifications(spec_txt),
            "spec.md still contains [NEEDS CLARIFICATION]")

    spec_frs = find_ids(spec_txt, "FR")
    r.check("HV006", bool(spec_frs) and any(f in plan_txt for f in spec_frs),
            "plan.md references no requirement ID from spec.md")
    r.check("HV007", bool(spec_frs) and any(f in tasks_txt for f in spec_frs),
            "tasks.md references no requirement ID from spec.md")

    acs = find_ids(spec_txt, "AC")
    uncovered = sorted(a for a in acs if a not in tasks_txt)
    r.warn("HV007b", not uncovered,
           f"acceptance criteria with no owning task: {', '.join(uncovered)}")

    r.check("HV008", not (SDD / feature / "plan.md").exists(),
            "a competing plan exists under .sdd/ — tasks.md is the only plan")

    cmds = (h.get("verification") or {}).get("commands") or {}
    r.check("HV009", bool(cmds.get("test")) and bool(cmds.get("lint")),
            "verification commands missing (need at least test + lint)")
    for name, cmd in cmds.items():
        exe = cmd.split()[0] if cmd else ""
        r.warn("HV009b", bool(exe) and shutil.which(exe) is not None,
               f"verification command '{name}' -> '{exe}' not on PATH")

    pol = h.get("policy") or {}
    r.check("HV010", "require_tdd" in pol, "TDD policy not defined")
    r.check("HV011", pol.get("require_task_review") is not None
            and pol.get("require_code_quality_review") is not None,
            "review policy not defined")
    r.check("HV012", pol.get("require_convergence") is True,
            "convergence is not enabled")

    for key in ("spec", "plan", "tasks"):
        node = h.get(key) or {}
        r.check("HV013", bool(node.get("git_sha")),
                f"{key}: git_sha not captured (commit the artifact first)")
        p = artifact(h, key)
        if p and node.get("git_sha"):
            r.check("HV013b", git_sha(p) == node["git_sha"],
                    f"{key} changed since the handoff was generated — STALE")

    r.check("HV014", working_tree_clean(),
            "working tree is dirty — commit or stash before execution")

    glossary = BASELINE / "glossary.md"
    r.check("HV015", glossary.exists() and len(read(glossary)) > 500,
            "glossary.md missing or too thin")

    # ---------- Track A ----------
    if track == "A":
        freeze = yaml.safe_load(read(BASELINE / "baseline-freeze.yaml") or "{}") or {}
        r.check("BV001", freeze.get("status") == "frozen",
                "baseline-freeze.yaml missing or not frozen")
        r.check("BV002",
                (h.get("baseline") or {}).get("baseline_id") == freeze.get("baseline_id"),
                "handoff baseline_id does not match the current freeze — STALE")

        prd_txt = read(BASELINE / "prd.md") + "".join(
            read(p) for p in sorted((BASELINE / "prd").glob("*.md")))
        prd_frs = find_ids(prd_txt, "FR")
        untraced = sorted(f for f in spec_frs if f not in prd_frs)
        r.check("BV003", not untraced,
                f"spec FRs with no PRD origin: {', '.join(untraced)}")

        r.warn("BV004", "architecture" in plan_txt.lower() or "ADR" in plan_txt,
               "plan.md cites no architecture decision — verify it follows the baseline")

        inc = (h.get("context") or {}).get("include") or []
        r.check("BV005", "full_prd" not in inc and "prd" not in inc,
                "context.include pulls the whole PRD — use sharded sections")

    # ---------- Track B ----------
    if track == "B":
        ia = fdir / "impact-analysis.md"
        r.check("BF001", ia.exists() and len(read(ia)) > 800,
                "impact-analysis.md missing or trivial")
        r.warn("BF002", "## Affected contracts" in read(ia),
               "impact analysis has no 'Affected contracts' section")
        reg = ((h.get("verification") or {}).get("commands") or {}).get("regression")
        r.check("BF003", bool(reg), "no regression command defined")
        cc_rel = (h.get("codebase_context") or {}).get("path", "")
        cc = ROOT / cc_rel if cc_rel else None
        r.check("BF004",
                bool(cc) and cc.exists()
                and cc.stat().st_size <= CODEBASE_CONTEXT_MAX_BYTES,
                f"codebase-context.md missing or larger than "
                f"{CODEBASE_CONTEXT_MAX_BYTES} bytes")

    return r


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--feature", default=None,
                   help="feature id; defaults to the active Spec Kit feature")
    a = p.parse_args()

    feature = a.feature or active_feature()
    if not feature:
        raise SystemExit(
            "no feature given and no active feature found.\n"
            "Pass --feature <id>, or export SPECIFY_FEATURE_DIRECTORY=specs/<id>."
        )

    r = validate(feature)

    for rule, msg in r.warnings:
        print(f"WARN  {rule}  {msg}")
    for rule, msg in r.failures:
        print(f"FAIL  {rule}  {msg}")

    if r.failures:
        print("\nBLOCKED — DO NOT START SUPERPOWERS.")
        print("Fix the owning artifact and regenerate the handoff.")
        sys.exit(1)
    print("\nPASS — handoff validated. Superpowers execution may begin.")


if __name__ == "__main__":
    main()
