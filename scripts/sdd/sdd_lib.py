"""Shared helpers for the Agentic SDD glue scripts.

Setup guide Part 3.3, adapted to the versions actually installed in this repo:
  * Spec Kit 1.0.8 creates `.specify/feature.json` only on the first
    /speckit-specify run, and `.specify/.gitignore` excludes it from git.
    So the active feature is resolved from, in order:
      1. SPECIFY_FEATURE_DIRECTORY   (per-shell override — use this in worktrees)
      2. SPECIFY_FEATURE             (branch/feature name)
      3. .specify/feature.json       (persisted by the Spec Kit scripts)
  * Feature artifacts live in `specs/<id>/`, NOT `.specify/specs/<id>/`.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BASELINE = ROOT / "docs" / "baseline"
SPECS = ROOT / "specs"
SDD = ROOT / ".sdd"
CONSTITUTION = ROOT / ".specify" / "memory" / "constitution.md"
FEATURE_JSON = ROOT / ".specify" / "feature.json"

# ---------------------------------------------------------------------------
# The single bootstrap exemption.
#
# Constitution §II: "Miễn trừ duy nhất: feature `000-walking-skeleton` được chạy
# với require_tdd: false, lý do ghi rõ trong handoff của nó — bộ khung test chính
# là thứ đang được dựng. Miễn trừ này hết hiệu lực ngay khi feature 000 merge,
# và không được viện dẫn lại."
#
# Protocol §A9 spells out the matching handoff policy, including
# require_convergence: false — there is no prior codebase to converge against.
#
# It is keyed by literal feature id ON PURPOSE. A --bootstrap flag or a policy
# key would let any later feature claim the same exemption; a name cannot be
# reused, and it stops meaning anything the moment feature 000 is merged and
# deleted.
# ---------------------------------------------------------------------------
BOOTSTRAP_FEATURE = "000-walking-skeleton"
BOOTSTRAP_TDD_REASON = "Bootstrap: test harness does not yet exist."


def is_bootstrap(feature: str | None) -> bool:
    """True only for the one feature constitution §II names."""
    return feature == BOOTSTRAP_FEATURE


def git_sha(path: Path) -> str | None:
    """Last commit SHA that touched `path`. None if untracked/uncommitted."""
    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        return None
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%H", "--", str(rel)],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def working_tree_clean() -> bool:
    out = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                         capture_output=True, text=True).stdout
    return out.strip() == ""


def active_feature() -> str | None:
    """Resolve the active Spec Kit feature id (the directory name under specs/)."""
    for env in ("SPECIFY_FEATURE_DIRECTORY", "SPECIFY_FEATURE"):
        val = os.environ.get(env)
        if val:
            return Path(val).name
    if not FEATURE_JSON.exists():
        return None
    try:
        data = json.loads(FEATURE_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    d = data.get("feature_directory") or data.get("featureDirectory") or ""
    return Path(d).name or None


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def find_ids(text: str, prefix: str) -> set[str]:
    """Extract requirement-style IDs, e.g. FR-001, NFR-012, AC-003, T005.

    One digit is enough: a baseline PRD numbers its requirements FR-1 … FR-35,
    and a two-digit floor made the first nine invisible to every rule that
    reads them — SDD-003.
    """
    return set(re.findall(rf"\b{prefix}-?\d{{1,4}}\b", text))


# A spec declares its requirements as template bullets — "- **FR-001**: ..." —
# and numbers them locally (.specify/templates/spec-template.md), so a spec id
# never equals the PRD id it comes from. The trace is the back-reference the
# bullet carries: "- **FR-001** *(← PRD FR-4)*: ...". An FR id appearing
# anywhere else is prose — a cross-feature mention in an out-of-scope note is
# not this spec's requirement and must not be read as one.
DECLARED_FR_RE = re.compile(r"^\s*[-*]\s*\*\*(FR-?\d{1,4})\*\*(.*)$", re.MULTILINE)
PRD_ORIGIN_RE = re.compile(r"←\s*PRD\s+(FR-?\d{1,4})")


def declared_requirements(text: str) -> dict[str, str | None]:
    """Map each FR a spec declares to the PRD FR it cites, or None if it cites
    nothing. Order follows the document."""
    out: dict[str, str | None] = {}
    for m in DECLARED_FR_RE.finditer(text):
        origin = PRD_ORIGIN_RE.search(m.group(2))
        out[m.group(1)] = origin.group(1) if origin else None
    return out


def has_unresolved_clarifications(text: str) -> bool:
    return "[NEEDS CLARIFICATION" in text.upper()
