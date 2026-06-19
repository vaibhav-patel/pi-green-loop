import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectChecks, formatReport, loadConfig, reportToAgentFeedback } from "../src/core/index.js";
import type { Report } from "../src/core/index.js";

function tempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "gl-test-"));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

test("detectChecks reads package.json scripts in kind order", () => {
  const dir = tempProject({
    "package.json": JSON.stringify({ scripts: { build: "tsc", test: "vitest", lint: "eslint ." } }),
  });
  try {
    const checks = detectChecks(dir, {});
    assert.deepEqual(
      checks.map((c) => c.kind),
      ["lint", "test", "build"],
    );
    assert.equal(checks[0].command, "npm run lint");
    for (const c of checks) assert.equal(c.source, "package.json");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("detectChecks picks pnpm when a pnpm lockfile exists", () => {
  const dir = tempProject({
    "package.json": JSON.stringify({ scripts: { test: "vitest" } }),
    "pnpm-lock.yaml": "",
  });
  try {
    const [check] = detectChecks(dir, {});
    assert.equal(check.command, "pnpm run test");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("config checks override detection", () => {
  const dir = tempProject({
    "package.json": JSON.stringify({ scripts: { test: "vitest" } }),
    "pi-green-loop.json": JSON.stringify({ checks: [{ name: "ci", command: "make ci" }] }),
  });
  try {
    const checks = detectChecks(dir, loadConfig(dir));
    assert.equal(checks.length, 1);
    assert.equal(checks[0].command, "make ci");
    assert.equal(checks[0].source, "config");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadConfig throws a helpful error on invalid JSON", () => {
  const dir = tempProject({ "pi-green-loop.json": "{ not json" });
  try {
    assert.throws(() => loadConfig(dir), /failed to parse/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const sampleReport = (ok: boolean): Report => ({
  ok,
  cwd: "/x",
  startedAt: "now",
  durationMs: 10,
  results: [
    {
      check: { id: "t", name: "test", kind: "test", command: "npm test", enabled: true, source: "package.json" },
      ok,
      exitCode: ok ? 0 : 1,
      durationMs: 5,
      timedOut: false,
      output: ok ? "ok" : "1 failing",
      truncated: false,
    },
  ],
});

test("formatReport summarizes pass/fail", () => {
  assert.match(formatReport(sampleReport(true)), /all checks passing/);
  assert.match(formatReport(sampleReport(false)), /FAILING/);
});

test("reportToAgentFeedback only includes failures", () => {
  assert.equal(reportToAgentFeedback(sampleReport(true)), "");
  const fb = reportToAgentFeedback(sampleReport(false));
  assert.match(fb, /1 failing check/);
  assert.match(fb, /1 failing/);
});
