import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeSandbox, seedFeature, runGlue } from "./helpers.mjs";

/**
 * Constitution §II ends with the project's ONLY TDD exemption:
 *
 *   "Miễn trừ duy nhất: feature `000-walking-skeleton` được chạy với
 *    require_tdd: false, lý do ghi rõ trong handoff của nó — bộ khung test
 *    chính là thứ đang được dựng."
 *
 * Protocol §A9 spells out the matching handoff policy (require_tdd: false,
 * tdd_exemption_reason, require_convergence: false).  The generator must emit
 * that, and must emit it for NO other feature — the exemption is single-use by
 * name and expires when feature 000 merges.
 */

function handoff(sb, feature, track) {
  const r = runGlue("sdd_handoff.py", ["--feature", feature, "--track", track], sb.dir);
  assert.equal(r.status, 0, `handoff generation failed: ${r.stderr}`);
  return readFileSync(join(sb.dir, ".sdd", feature, "handoff.yaml"), "utf8");
}

test("feature 000-walking-skeleton carries the constitution §II bootstrap exemption", () => {
  const sb = makeSandbox();
  try {
    seedFeature(sb, "000-walking-skeleton");
    const y = handoff(sb, "000-walking-skeleton", "A");

    assert.match(y, /require_tdd:\s*false/,
      "constitution §II exempts feature 000 from TDD — handoff says otherwise");
    assert.match(y, /tdd_exemption_reason:\s*\S+/,
      "§II requires the reason be written into the handoff, not assumed");
    assert.match(y, /require_convergence:\s*false/,
      "protocol §A9 sets require_convergence: false for the walking skeleton");
  } finally { sb.cleanup(); }
});

test("no feature other than 000-walking-skeleton carries the exemption", () => {
  const sb = makeSandbox();
  try {
    seedFeature(sb, "001-demo");
    const y = handoff(sb, "001-demo", "B");

    assert.match(y, /require_tdd:\s*true/,
      "the exemption is single-use — 001 must not inherit it");
    assert.doesNotMatch(y, /tdd_exemption_reason/,
      "only the bootstrap feature may carry an exemption reason");
    assert.match(y, /require_convergence:\s*true/,
      "convergence stays mandatory everywhere except the walking skeleton");
  } finally { sb.cleanup(); }
});

/* ------------------------------------------------------------------ *
 * ux_spec — protocol §"Handoff captures versions" (:1831): "Every handoff
 * records path + version + git_sha for each artifact it depends on". A spec
 * that cites docs/baseline/ux-spec.md depends on it, so its handoff must pin
 * it and route its sections into the task context. SDD-004.
 * ------------------------------------------------------------------ */

/** Seed a baseline ux-spec.md and make the feature's spec cite it. */
function seedUxDependency(sb, feature) {
  writeFileSync(join(sb.dir, "docs/baseline/ux-spec.md"),
    "# UX Spec\n\n## Design token\n\nbrand-primary: #0070CE\n");
  const spec = join(sb.dir, "specs", feature, "spec.md");
  writeFileSync(spec, readFileSync(spec, "utf8") +
    "\n## Baseline references\n- `docs/baseline/ux-spec.md`: product grid.\n");
  sb.git("add", "-A");
  sb.git("commit", "-q", "-m", "spec depends on ux-spec");
}

for (const track of ["A", "B"]) {
  test(`Track ${track} handoff pins ux_spec when spec.md depends on it`, () => {
    const sb = makeSandbox();
    try {
      seedFeature(sb, "001-demo");
      seedUxDependency(sb, "001-demo");
      const y = handoff(sb, "001-demo", track);

      assert.match(y, /ux_spec:\s*\n\s+path: docs\/baseline\/ux-spec\.md\s*\n\s+git_sha: [0-9a-f]{40}/,
        "spec.md cites ux-spec.md — the handoff must pin it with its git_sha");
      assert.match(y, /- referenced_ux_spec_sections/,
        "the task context must carry the referenced ux-spec sections");
    } finally { sb.cleanup(); }
  });
}

test("handoff does not pin ux_spec when spec.md does not cite it", () => {
  const sb = makeSandbox();
  try {
    seedFeature(sb, "001-demo");
    writeFileSync(join(sb.dir, "docs/baseline/ux-spec.md"), "# UX Spec\n");
    sb.git("add", "-A"); sb.git("commit", "-q", "-m", "ux-spec exists");
    const y = handoff(sb, "001-demo", "B");

    assert.doesNotMatch(y, /ux_spec/,
      "a feature with no ux-spec dependency must not go STALE on ux-spec edits");
  } finally { sb.cleanup(); }
});
