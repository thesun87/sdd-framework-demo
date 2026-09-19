import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

/** Run a glue script inside `cwd`. Returns {status, stdout, stderr}. */
export function runGlue(script, args, cwd) {
  try {
    const stdout = execFileSync("python3", [join(cwd, "scripts/sdd", script), ...args], {
      cwd, encoding: "utf8", stdio: "pipe",
      env: { ...process.env, SPECIFY_FEATURE: "", SPECIFY_FEATURE_DIRECTORY: "" },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    return { status: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

/**
 * Build a disposable git repository that mirrors the real layout, so tests can
 * commit artifacts and exercise the git_sha / staleness rules for real.
 */
export function makeSandbox() {
  const dir = mkdtempSync(join(tmpdir(), "sdd-test-"));
  for (const rel of ["scripts/sdd", ".specify/memory", "docs/baseline", "specs", ".sdd"]) {
    mkdirSync(join(dir, rel), { recursive: true });
  }
  for (const f of ["sdd_lib.py", "sdd_handoff.py", "sdd_validate.py", "sdd_change.py"]) {
    cpSync(join(ROOT, "scripts/sdd", f), join(dir, "scripts/sdd", f));
  }
  cpSync(join(ROOT, "docs/baseline/glossary.md"), join(dir, "docs/baseline/glossary.md"));
  cpSync(join(ROOT, "docs/baseline/verification.md"), join(dir, "docs/baseline/verification.md"));
  writeFileSync(join(dir, ".specify/memory/constitution.md"), "# Constitution\n\nPrinciple I: tests first.\n");

  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  git("add", "-A");
  git("commit", "-q", "-m", "sandbox");
  return { dir, git, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Write a well-formed feature (spec/plan/tasks) into a sandbox and commit it. */
export function seedFeature(sb, feature = "001-demo") {
  const fdir = join(sb.dir, "specs", feature);
  mkdirSync(fdir, { recursive: true });
  writeFileSync(join(fdir, "spec.md"),
    "# Spec\n\n## Requirements\n- FR-001 the system stores a record.\n\n## Acceptance\n- AC-001 a stored record can be read back.\n");
  writeFileSync(join(fdir, "plan.md"),
    "# Plan\n\nImplements FR-001 following the architecture baseline (ADR-0001).\n");
  writeFileSync(join(fdir, "tasks.md"),
    "# Tasks\n\n- T001 implement FR-001, satisfying AC-001.\n");
  sb.git("add", "-A");
  sb.git("commit", "-q", "-m", `feat: ${feature} artifacts`);
  return { feature, fdir };
}

export { dirname };
