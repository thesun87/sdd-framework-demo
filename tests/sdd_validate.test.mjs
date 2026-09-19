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

/* ------------------------------------------------------------------ *
 * BV003 — "every spec FR traces to a PRD FR-xxx" (protocol §1907).
 *
 * The trace is the back-reference the spec carries, not an identical id:
 * .specify/templates/spec-template.md mandates spec-local FR-001 numbering
 * and is installer-managed, so spec ids and PRD ids never coincide by
 * construction. SDD-003.
 * ------------------------------------------------------------------ */

/** Seed the Track A baseline a handoff needs: a frozen record and a PRD. */
function seedTrackABaseline(sb, prdFrs) {
  const bl = join(sb.dir, "docs/baseline");
  writeFileSync(join(bl, "baseline-freeze.yaml"),
    "baseline_id: baseline-test-0001\nstatus: frozen\nfrozen_by: Test Human\n");
  writeFileSync(join(bl, "prd.md"),
    "# PRD\n\n## Functional requirements\n\n" +
    prdFrs.map((f) => `- **${f}**: the product does a thing.\n`).join(""));
  writeFileSync(join(bl, "architecture.md"),
    "# Architecture\n\nAD-1 one origin.\n");
}

/** Overwrite the seeded feature's spec with `requirements`, keeping it valid. */
function seedTrackAFeature(sb, requirements, feature = "001-demo") {
  const fdir = join(sb.dir, "specs", feature);
  mkdirSync(fdir, { recursive: true });
  writeFileSync(join(fdir, "spec.md"),
    "# Spec\n\n## Requirements\n\n### Functional Requirements\n\n" +
    requirements + "\n## Acceptance\n- AC-001 it can be read back.\n");
  writeFileSync(join(fdir, "plan.md"),
    "# Plan\n\nImplements FR-001 following the architecture baseline (ADR-0001).\n");
  writeFileSync(join(fdir, "tasks.md"),
    "# Tasks\n\n- T001 implement FR-001, satisfying AC-001.\n");
  return { feature, fdir };
}

/** Seed, commit, generate the Track A handoff, commit it, then validate. */
function validateTrackA(sb, requirements, prdFrs) {
  seedTrackABaseline(sb, prdFrs);
  const { feature } = seedTrackAFeature(sb, requirements);
  sb.git("add", "-A"); sb.git("commit", "-q", "-m", "track A inputs");
  handoffFor(sb, feature, "A");
  sb.git("add", "-A"); sb.git("commit", "-q", "-m", "handoff");
  return runGlue("sdd_validate.py", ["--feature", feature], sb.dir);
}

test("BV003 accepts a spec FR traced by a (← PRD FR-N) back-reference", () => {
  const sb = makeSandbox();
  try {
    const r = validateTrackA(sb,
      "- **FR-001** *(← PRD FR-12)*: System MUST store a record.\n",
      ["FR-11", "FR-12", "FR-13"]);
    assert.ok(!r.stdout.includes("BV003"),
      `the back-reference IS the trace; BV003 must not fire:\n${r.stdout}${r.stderr}`);
    assert.equal(r.status, 0, `expected PASS, got:\n${r.stdout}${r.stderr}`);
  } finally { sb.cleanup(); }
});

test("BV003 resolves a back-reference to a single-digit PRD FR", () => {
  const sb = makeSandbox();
  try {
    // The real 000-walking-skeleton case: every trace points at FR-4 / FR-5,
    // which the \d{2,4} id regex could not see at all.
    const r = validateTrackA(sb,
      "- **FR-001** *(← PRD FR-4)*: System MUST show a product.\n" +
      "- **FR-002** *(← PRD FR-5)*: System MUST show its stock status.\n",
      ["FR-4", "FR-5", "FR-14"]);
    assert.ok(!r.stdout.includes("BV003"),
      `single-digit PRD ids must be visible to the trace:\n${r.stdout}${r.stderr}`);
    assert.equal(r.status, 0, `expected PASS, got:\n${r.stdout}${r.stderr}`);
  } finally { sb.cleanup(); }
});

test("BV003 rejects a declared spec FR whose id merely collides with a PRD id", () => {
  const sb = makeSandbox();
  try {
    // An id collision is not a trace. Before SDD-003 this passed by accident,
    // which is how FR-14 — a requirement owned by another feature — was
    // credited as traced in the real 000 handoff.
    const r = validateTrackA(sb,
      "- **FR-012**: System MUST store a record.\n",
      ["FR-011", "FR-012", "FR-013"]);
    assert.equal(r.status, 1,
      `a declared FR with no back-reference must block:\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /FAIL\s+BV003/);
  } finally { sb.cleanup(); }
});

test("BV003 does not credit an FR mentioned only in prose", () => {
  const sb = makeSandbox();
  try {
    // Cross-feature mentions in out-of-scope notes are not this spec's
    // requirements, so they are neither checked nor counted as traced.
    const r = validateTrackA(sb,
      "- **FR-001** *(← PRD FR-12)*: System MUST store a record.\n\n" +
      "## Out of scope\n\nOrdering is FR-99 and belongs to another feature.\n",
      ["FR-11", "FR-12", "FR-13"]);
    assert.ok(!r.stdout.includes("BV003"),
      `prose mentions are not declared requirements:\n${r.stdout}${r.stderr}`);
    assert.equal(r.status, 0, `expected PASS, got:\n${r.stdout}${r.stderr}`);
  } finally { sb.cleanup(); }
});

test("BV003 blocks a back-reference pointing at an FR absent from the PRD", () => {
  const sb = makeSandbox();
  try {
    const r = validateTrackA(sb,
      "- **FR-001** *(← PRD FR-77)*: System MUST store a record.\n",
      ["FR-11", "FR-12", "FR-13"]);
    assert.equal(r.status, 1,
      `a dangling trace must block:\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /FAIL\s+BV003/);
  } finally { sb.cleanup(); }
});
