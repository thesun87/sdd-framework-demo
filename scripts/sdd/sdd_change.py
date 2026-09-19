#!/usr/bin/env python3
"""Scaffold .sdd/direct/<change-id>/change-record.yaml for a Track C change.

Setup guide Part 3.6.  Usage:
    python3 scripts/sdd/sdd_change.py --ticket BUG-4821 --type bugfix
"""
from __future__ import annotations

import argparse
import datetime
import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sdd_lib import CONSTITUTION, ROOT, SDD, git_sha  # noqa: E402

CV = ["CV001_defect_against_documented_behaviour",
      "CV002_no_business_rule_change",
      "CV003_no_contract_change",
      "CV004_no_schema_change",
      "CV005_no_authz_change",
      "CV006_no_acceptance_criteria_change",
      "CV007_no_nfr_impact",
      "CV008_no_new_dependency",
      "CV009_reproducible_by_test",
      "CV010_single_module_scope"]

# A ticket id becomes a path segment under .sdd/direct/. Anything that is not
# a single safe segment (separators, "..", spaces) would place the record
# outside the audit tree while change_id still claims otherwise — SDD-001.
TICKET_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def validate_ticket(ticket: str) -> str:
    if not TICKET_RE.fullmatch(ticket) or ".." in ticket:
        raise SystemExit(
            f"invalid ticket id: {ticket!r}\n"
            "A ticket id must be a single path segment matching "
            "[A-Za-z0-9][A-Za-z0-9._-]* (e.g. BUG-4821)."
        )
    return ticket


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ticket", required=True)
    p.add_argument("--type", default="bugfix",
                   choices=["bugfix", "config", "docs",
                            "dependency-patch", "internal-refactor"])
    a = p.parse_args()

    ticket = validate_ticket(a.ticket)
    today = datetime.date.today().isoformat()
    change_id = f"{today}-{ticket}"
    d = SDD / "direct" / change_id
    d.mkdir(parents=True, exist_ok=True)

    out = d / "change-record.yaml"
    if out.exists():
        raise SystemExit(f"refusing to overwrite existing record: "
                         f"{out.relative_to(ROOT)}")

    record = {
        "change_id": change_id,
        "track": "C",
        "type": a.type,
        "ticket": ticket,
        "severity": "TODO",
        "created_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "constitution": {"path": ".specify/memory/constitution.md",
                         "git_sha": git_sha(CONSTITUTION)},
        "defect": {"observed": "TODO", "expected": "TODO",
                   "documented_behaviour_ref": "TODO",
                   "reproduction": "TODO: path to the failing test"},
        "entry_criteria": {k: "TODO" for k in CV},
        "root_cause": "TODO — must be filled before the fix is written",
        "scope": {"allowed": ["TODO"],
                  "forbidden": ["migrations/**", "**/openapi.yaml", "**/*.proto",
                                "docs/baseline/**",
                                ".specify/memory/constitution.md"]},
        "policy": {"require_regression_test": True, "require_tdd": True,
                   "require_code_quality_review": True,
                   "require_full_verification": True,
                   "require_spec_review": False,
                   "require_convergence": False,
                   "max_files_changed": 8},
        "verification": {"commands": {"test": "TODO", "lint": "TODO"}},
        "escalation": {"triggers": ["contract_change_required",
                                    "schema_change_required",
                                    "business_rule_ambiguity",
                                    "fix_requires_forbidden_scope",
                                    "root_cause_not_found"],
                       "action": "STOP_AND_ESCALATE_TO_TRACK_B"},
        "status": "in_progress",
    }
    out.write_text(yaml.safe_dump(record, sort_keys=False, allow_unicode=True),
                   encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")
    print("Fill in every TODO before writing any code.")


if __name__ == "__main__":
    main()
