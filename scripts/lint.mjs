#!/usr/bin/env node
/**
 * Zero-dependency lint for this repository.
 *
 *   1. every .mjs/.js under scripts/ and tests/ must parse  (node --check)
 *   2. every .py under scripts/sdd/ must compile            (python3 -m py_compile)
 *   3. every .yaml under docs/baseline/ and .sdd/ must parse (PyYAML)
 *
 * Exits non-zero on the first category that fails, listing every failure in it.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SKIP = new Set(["node_modules", ".git", "_bmad", ".specify", "__pycache__"]);

function walk(dir, exts, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

function run(label, files, fn) {
  const failures = [];
  for (const f of files) {
    try { fn(f); } catch (e) {
      failures.push(`${f}\n    ${String(e.stderr || e.message).trim().split("\n").slice(0, 3).join("\n    ")}`);
    }
  }
  console.log(`${failures.length === 0 ? "ok  " : "FAIL"} ${label} (${files.length} file${files.length === 1 ? "" : "s"})`);
  for (const f of failures) console.log(`  - ${f}`);
  return failures.length;
}

let bad = 0;

bad += run(
  "javascript syntax",
  [...walk(join(ROOT, "scripts"), [".mjs", ".js"]), ...walk(join(ROOT, "tests"), [".mjs", ".js"])],
  (f) => execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }),
);

bad += run(
  "python compile",
  walk(join(ROOT, "scripts"), [".py"]),
  (f) => execFileSync("python3", ["-m", "py_compile", f], { stdio: "pipe" }),
);

bad += run(
  "yaml parse",
  [...walk(join(ROOT, "docs"), [".yaml", ".yml"]), ...walk(join(ROOT, ".sdd"), [".yaml", ".yml"])],
  (f) => execFileSync("python3", ["-c", "import sys,yaml; yaml.safe_load(open(sys.argv[1]))", f], { stdio: "pipe" }),
);

if (bad > 0) {
  console.error(`\nlint failed: ${bad} file(s)`);
  process.exit(1);
}
console.log("\nlint passed");
