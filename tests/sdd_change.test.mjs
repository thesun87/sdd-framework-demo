import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { makeSandbox, runGlue } from "./helpers.mjs";

const TODAY = new Date().toISOString().slice(0, 10);

test("scaffolds a record at .sdd/direct/<date>-<ticket>/", () => {
  const sb = makeSandbox();
  try {
    const r = runGlue("sdd_change.py", ["--ticket", "BUG-4821", "--type", "bugfix"], sb.dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(sb.dir, ".sdd/direct", `${TODAY}-BUG-4821`, "change-record.yaml")));
  } finally { sb.cleanup(); }
});

test("refuses to overwrite an existing record", () => {
  const sb = makeSandbox();
  try {
    runGlue("sdd_change.py", ["--ticket", "BUG-1"], sb.dir);
    const r = runGlue("sdd_change.py", ["--ticket", "BUG-1"], sb.dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /refusing to overwrite/);
  } finally { sb.cleanup(); }
});

// ── regression test for SDD-001 ────────────────────────────────────────────
// A ticket id containing path separators must never place the record outside
// .sdd/direct/<change-id>/. Before the fix this wrote
//   .sdd/direct/escaped-BUG/change-record.yaml
// while change_id inside the file read "<date>-../../escaped-BUG".
test("rejects a ticket id that escapes .sdd/direct", () => {
  const sb = makeSandbox();
  try {
    const r = runGlue("sdd_change.py", ["--ticket", "../../escaped-BUG"], sb.dir);
    assert.equal(r.status, 1, `expected rejection, got:\n${r.stdout}`);
    assert.match(r.stderr + r.stdout, /invalid ticket/i);
    assert.ok(!existsSync(join(sb.dir, ".sdd/direct")),
      ".sdd/direct must not be created when the ticket is rejected");
    assert.ok(!existsSync(join(sb.dir, "escaped-BUG")));
  } finally { sb.cleanup(); }
});

test("rejects other unsafe ticket ids", () => {
  const sb = makeSandbox();
  try {
    for (const bad of ["a/b", ".", "..", "", "with space", "x\\y"]) {
      const r = runGlue("sdd_change.py", ["--ticket", bad], sb.dir);
      assert.equal(r.status, 1, `ticket ${JSON.stringify(bad)} should be rejected`);
    }
    assert.ok(!existsSync(join(sb.dir, ".sdd/direct")));
  } finally { sb.cleanup(); }
});
