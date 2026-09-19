#!/usr/bin/env python3
"""Generate .sdd/<feature>/handoff.yaml from the real artifacts on disk.

Setup guide Part 3.4.  Usage:
    python3 scripts/sdd/sdd_handoff.py --track B [--feature 001-slug]
"""
from __future__ import annotations

import argparse
import datetime
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sdd_lib import (  # noqa: E402
    BASELINE, CONSTITUTION, ROOT, SDD, SPECS,
    active_feature, git_sha, read,
)


def ref(path: Path) -> dict | None:
    if not path.exists():
        return None
    return {"path": str(path.relative_to(ROOT)), "git_sha": git_sha(path)}


def parse_verification(text: str) -> dict:
    """Read 'key: command' lines out of the fenced ```commands block."""
    fence = "`" * 3
    cmds: dict[str, str] = {}
    inside = False
    for line in text.splitlines():
        stripped = line.strip()
        if not inside and stripped.startswith(fence) and "commands" in stripped:
            inside = True
            continue
        if inside and stripped.startswith(fence):
            break
        if inside and ":" in line and not stripped.startswith("#"):
            k, v = line.split(":", 1)
            cmds[k.strip()] = v.strip()
    return cmds


def build(feature: str, track: str) -> dict:
    fdir = SPECS / feature
    if not fdir.exists():
        raise SystemExit(f"feature directory not found: {fdir}")

    verification = read(BASELINE / "verification.md")

    h: dict = {
        "feature_id": feature,
        "track": track,
        "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "constitution": ref(CONSTITUTION),
        "spec": ref(fdir / "spec.md"),
        "plan": ref(fdir / "plan.md"),
        "tasks": ref(fdir / "tasks.md"),
        "execution": {"engine": "superpowers",
                      "mode": "subagent-driven-development"},
        "policy": {
            "allow_replan": False,
            "allow_spec_change": False,
            "allow_architecture_change": False,
            "require_tdd": True,
            "require_task_review": True,
            "require_code_quality_review": True,
            "require_final_verification": True,
            "require_convergence": True,
        },
        "verification": {
            "source": "docs/baseline/verification.md",
            "commands": parse_verification(verification),
        },
        "context": {
            "include": ["constitution", "glossary", "feature_spec",
                        "implementation_plan", "current_task",
                        "relevant_dependencies"],
            "exclude": ["full_prd", "full_architecture_document",
                        "unrelated_tasks", "unrelated_features",
                        "full_chat_history", "unrelated_repository_context"],
        },
    }

    if track == "A":
        freeze = yaml.safe_load(read(BASELINE / "baseline-freeze.yaml") or "{}") or {}
        h["baseline"] = {
            "baseline_id": freeze.get("baseline_id"),
            "prd": ref(BASELINE / "prd.md"),
            "architecture": ref(BASELINE / "architecture.md"),
            "glossary": ref(BASELINE / "glossary.md"),
        }
        h["policy"]["allow_baseline_change"] = False
        h["context"]["include"] += ["referenced_prd_sections",
                                    "referenced_architecture_sections"]

    if track == "B":
        h["baseline"] = {
            "architecture": ref(BASELINE / "architecture.md"),
            "glossary": ref(BASELINE / "glossary.md"),
            "prd": ref(BASELINE / "prd.md"),   # may be None on legacy systems
        }
        h["impact_analysis"] = ref(fdir / "impact-analysis.md")
        h["codebase_context"] = {"path": f".sdd/{feature}/codebase-context.md"}
        h["policy"]["require_characterization_tests"] = True
        h["policy"]["require_regression_suite"] = True
        h["context"]["include"] += ["codebase_context",
                                    "impact_analysis_relevant_sections"]
        h["context"]["exclude"] += ["full_repository", "unrelated_modules"]

    return h


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--feature", default=None,
                   help="feature id (directory name under specs/); "
                        "defaults to the active Spec Kit feature")
    p.add_argument("--track", choices=["A", "B"], required=True)
    a = p.parse_args()

    feature = a.feature or active_feature()
    if not feature:
        raise SystemExit(
            "no feature given and no active feature found.\n"
            "Pass --feature <id>, or export SPECIFY_FEATURE_DIRECTORY=specs/<id>."
        )

    out_dir = SDD / feature
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "handoff.yaml"
    out.write_text(yaml.safe_dump(build(feature, a.track), sort_keys=False),
                   encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
