import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { makeSandbox, seedFeature, runGlue } from "./helpers.mjs";

/**
 * Setup guide, Appendix A / EXECUTION READINESS:
 *   "validator run once against a deliberately broken handoff — it blocked"
 * These tests are that check, automated.
 */

function handoffFor(sb, feature, track = "B") {
  const r = runGlue("sdd_handoff.py", ["--feature", feature, "--track", track], sb.dir);
  assert.equal(r.status, 0, `handoff generation failed: ${r.stderr}`);
  return join(sb.dir, ".sdd", feature, "handoff.yaml");
}

function seedTrackBExtras(sb, feature) {
  writeFileSync(join(sb.dir, "specs", feature, "impact-analysis.md"),
    "# Impact analysis\n\n## Affected contracts\nNone.\n\n" + "Detail. ".repeat(200));
  mkdirSync(join(sb.dir, ".sdd", feature), { recursive: true });
  writeFileSync(join(sb.dir, ".sdd", feature, "codebase-context.md"),
    "# Codebase context\n\nOne page, hand curated.\n");
}

test("valid Track B handoff passes", () => {
  const sb = makeSandbox();
  try {
    const { feature } = seedFeature(sb);
    seedTrackBExtras(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "track B inputs");
    handoffFor(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 0, `expected PASS, got:\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /PASS — handoff validated/);
  } finally { sb.cleanup(); }
});

test("HV000 blocks when the handoff does not exist", () => {
  const sb = makeSandbox();
  try {
    seedFeature(sb);
    const r = runGlue("sdd_validate.py", ["--feature", "001-demo"], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}HV000/);
    assert.match(r.stdout, /BLOCKED — DO NOT START SUPERPOWERS/);
  } finally { sb.cleanup(); }
});

test("HV005 blocks a spec with unresolved clarifications", () => {
  const sb = makeSandbox();
  try {
    const { feature, fdir } = seedFeature(sb);
    seedTrackBExtras(sb, feature);
    writeFileSync(join(fdir, "spec.md"),
      readFileSync(join(fdir, "spec.md"), "utf8") + "\n[NEEDS CLARIFICATION: retention period?]\n");
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "wip spec");
    handoffFor(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}HV005/);
  } finally { sb.cleanup(); }
});

test("HV013b blocks a STALE handoff when spec.md changes afterwards", () => {
  const sb = makeSandbox();
  try {
    const { feature, fdir } = seedFeature(sb);
    seedTrackBExtras(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "track B inputs");
    handoffFor(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");

    // someone edits the spec while execution is pending
    writeFileSync(join(fdir, "spec.md"),
      readFileSync(join(fdir, "spec.md"), "utf8") + "\n- FR-002 sneaked in later.\n");
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "sneaky spec edit");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}HV013b.*STALE/s);
  } finally { sb.cleanup(); }
});

test("HV014 blocks a dirty working tree", () => {
  const sb = makeSandbox();
  try {
    const { feature } = seedFeature(sb);
    seedTrackBExtras(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "track B inputs");
    handoffFor(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");

    writeFileSync(join(sb.dir, "specs", feature, "scratch.txt"), "uncommitted\n");
    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}HV014/);
  } finally { sb.cleanup(); }
});

test("HV008 blocks a competing plan under .sdd/", () => {
  const sb = makeSandbox();
  try {
    const { feature } = seedFeature(sb);
    seedTrackBExtras(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "track B inputs");
    handoffFor(sb, feature);
    writeFileSync(join(sb.dir, ".sdd", feature, "plan.md"), "# A second plan\n");
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff + rogue plan");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}HV008/);
  } finally { sb.cleanup(); }
});

test("BF001 and BF004 block a Track B feature missing its brownfield inputs", () => {
  const sb = makeSandbox();
  try {
    const { feature } = seedFeature(sb);
    handoffFor(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff only");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}BF001/);
    assert.match(r.stdout, /FAIL {2}BF004/);
  } finally { sb.cleanup(); }
});

test("HV015 blocks a missing or thin glossary", () => {
  const sb = makeSandbox();
  try {
    const { feature } = seedFeature(sb);
    seedTrackBExtras(sb, feature);
    rmSync(join(sb.dir, "docs/baseline/glossary.md"));
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "drop glossary");
    handoffFor(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL {2}HV015/);
  } finally { sb.cleanup(); }
});

/**
 * HV012 vs protocol §A9.  The protocol sets `require_convergence: false` for the
 * walking skeleton — there is no prior codebase to converge against — while
 * HV012 blocks any handoff whose require_convergence is not `true`.  Both cannot
 * be right.  The exemption wins, but ONLY when the handoff proves it is the
 * bootstrap feature carrying constitution §II's written reason; every other
 * handoff is still blocked, so the gate is not loosened in general.
 */

function patchPolicy(path, edit) {
  const y = readFileSync(path, "utf8");
  writeFileSync(path, edit(y));
}

/** policy: keys are emitted by yaml.safe_dump at exactly two spaces. */
const EXEMPT = "require_convergence: false\n  require_tdd: false\n" +
  '  tdd_exemption_reason: "Bootstrap: test harness does not yet exist."';

test("HV012 accepts require_convergence:false for the bootstrap feature", () => {
  const sb = makeSandbox();
  try {
    const feature = "000-walking-skeleton";
    seedFeature(sb, feature);
    const hp = handoffFor(sb, feature, "A");
    patchPolicy(hp, (y) => y.replace(/require_convergence: true/, EXEMPT));
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.ok(!r.stdout.includes("HV012"),
      `HV012 must stand down for the bootstrap feature, got:\n${r.stdout}${r.stderr}`);
  } finally { sb.cleanup(); }
});

test("HV012 still blocks require_convergence:false for any other feature", () => {
  const sb = makeSandbox();
  try {
    const { feature } = seedFeature(sb);
    seedTrackBExtras(sb, feature);
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "track B inputs");
    const hp = handoffFor(sb, feature);
    patchPolicy(hp, (y) => y.replace(/require_convergence: true/, EXEMPT));
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");

    const r = runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
    assert.equal(r.status, 1, "a non-bootstrap feature must not escape convergence");
    assert.match(r.stdout, /FAIL\s+HV012/,
      "the exemption is by feature id — claiming a reason must not be enough");
  } finally { sb.cleanup(); }
});
