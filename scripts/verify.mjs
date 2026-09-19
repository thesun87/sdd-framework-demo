#!/usr/bin/env node
/**
 * Verification orchestrator for this repository.
 *
 *   node scripts/verify.mjs <phase>      phase = test | lint | build | e2e
 *
 * Every phase has two halves:
 *
 *   1. the GLUE half — scripts/ and tests/, the SDD machinery. Always runs.
 *   2. the PRODUCT half — apps/*, packages/*, e2e/. Runs per directory that
 *      exists AND declares the matching npm script.
 *
 * The product half is absent on purpose until feature 000 creates it: Track A
 * freezes the baseline BEFORE any product code exists, and
 * docs/baseline/verification.md requires every command to be green on a fresh
 * clone at freeze time. A missing product directory is therefore NOT a failure.
 * A product directory that exists and fails IS one.
 *
 * This is the only mechanism that lets one command line stay honest on both
 * sides of feature 000. Do not "simplify" it by hardcoding paths that do not
 * exist yet — that makes the freeze gate unpassable.
 *
 * Zero dependencies, same house style as scripts/lint.mjs.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Directories that may hold a product workspace, in the order spine AD-5 names them. */
const WORKSPACE_GLOBS = ["apps", "packages"];
const STANDALONE = ["e2e"];

/** Which npm script each phase looks for inside a product workspace. */
const SCRIPT_FOR_PHASE = { test: "test", lint: "lint", build: "build", e2e: "test:e2e" };

function run(label, cmd, args, cwd = ROOT) {
  process.stdout.write(`\n▸ ${label}\n  ${cmd} ${args.join(" ")}\n`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: false });
  if (r.error) return { label, ok: false, reason: r.error.message };
  return { label, ok: r.status === 0, reason: `exit ${r.status}` };
}

/** Product workspaces present on disk right now. */
function discoverWorkspaces() {
  const found = [];
  for (const parent of WORKSPACE_GLOBS) {
    const dir = join(ROOT, parent);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (existsSync(join(p, "package.json"))) found.push({ id: `${parent}/${name}`, path: p });
    }
  }
  for (const name of STANDALONE) {
    const p = join(ROOT, name);
    if (existsSync(join(p, "package.json"))) found.push({ id: name, path: p });
  }
  return found;
}

function declaresScript(wsPath, script) {
  try {
    const pkg = JSON.parse(readFileSync(join(wsPath, "package.json"), "utf8"));
    return Boolean(pkg.scripts && pkg.scripts[script]);
  } catch { return false; }
}

const phase = process.argv[2];
if (!Object.hasOwn(SCRIPT_FOR_PHASE, phase)) {
  console.error(`usage: node scripts/verify.mjs <${Object.keys(SCRIPT_FOR_PHASE).join("|")}>`);
  process.exit(2);
}

const results = [];

// ── 1. glue half ────────────────────────────────────────────────────────────
if (phase === "test") {
  results.push(run("glue · unit tests", "node", ["--test", "tests/**/*.test.mjs"]));
} else if (phase === "lint") {
  results.push(run("glue · lint", "node", ["scripts/lint.mjs"]));
}
// build and e2e have no glue half — the glue layer is interpreted and headless.

// ── 2. product half ─────────────────────────────────────────────────────────
const script = SCRIPT_FOR_PHASE[phase];
const workspaces = discoverWorkspaces();
const applicable = workspaces.filter((w) => declaresScript(w.path, script));

if (workspaces.length === 0) {
  process.stdout.write(
    `\n▸ product · ${phase}\n  SKIPPED — no product workspace exists yet.\n` +
    `  Expected once feature 000-walking-skeleton lands (docs/baseline/feature-map.md).\n`,
  );
} else if (applicable.length === 0) {
  process.stdout.write(
    `\n▸ product · ${phase}\n  SKIPPED — ${workspaces.length} workspace(s) found, none declares "${script}".\n`,
  );
} else {
  for (const w of applicable) {
    results.push(run(`${w.id} · ${script}`, "npm", ["run", "--silent", script], w.path));
  }
}

// ── report ──────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
process.stdout.write(`\n${"─".repeat(60)}\n`);
for (const r of results) process.stdout.write(`${r.ok ? "PASS" : "FAIL"}  ${r.label}\n`);
if (results.length === 0) process.stdout.write(`(nothing to run for phase "${phase}")\n`);
process.stdout.write(`${"─".repeat(60)}\n`);

if (failed.length) {
  process.stderr.write(`\n${failed.length} step(s) failed: ${failed.map((r) => r.label).join(", ")}\n`);
  process.exit(1);
}
