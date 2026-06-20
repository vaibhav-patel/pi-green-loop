import { test } from "node:test";
import assert from "node:assert/strict";
import { GREEN_ENTRY, editedPath, failingKeys, lastGreenSha, sameSet } from "../src/pi/loop.js";
import type { CheckResult, Report } from "../src/core/index.js";

function res(id: string, ok: boolean, parsedNames?: string[]): CheckResult {
  return {
    check: { id, name: id, kind: "test", command: "x", enabled: true, source: "node" },
    ok,
    exitCode: ok ? 0 : 1,
    durationMs: 1,
    timedOut: false,
    output: "",
    truncated: false,
    ...(parsedNames ? { parsed: { failures: parsedNames.map((n) => ({ name: n })), failed: parsedNames.length } } : {}),
  };
}

function report(results: CheckResult[]): Report {
  return { ok: results.every((r) => r.ok), results, cwd: "/x", startedAt: "now", durationMs: 1 };
}

test("failingKeys uses parsed test names when present", () => {
  const keys = failingKeys(report([res("t", false, ["TestA", "TestB"]), res("lint", true)]));
  assert.deepEqual([...keys].sort(), ["t:TestA", "t:TestB"]);
});

test("failingKeys falls back to the check id with no parsed failures", () => {
  assert.deepEqual([...failingKeys(report([res("lint", false)]))], ["lint"]);
});

test("failingKeys ignores passing checks", () => {
  assert.equal(failingKeys(report([res("a", true), res("b", true)])).size, 0);
});

test("sameSet compares membership regardless of order", () => {
  assert.ok(sameSet(new Set(["a", "b"]), new Set(["b", "a"])));
  assert.ok(!sameSet(new Set(["a"]), new Set(["a", "b"])));
  assert.ok(!sameSet(new Set(["a"]), new Set(["b"])));
});

test("lastGreenSha returns the most recent matching entry", () => {
  const entries = [
    { type: "custom", customType: GREEN_ENTRY, data: { sha: "old" } },
    { type: "custom", customType: "something:else", data: { sha: "ignored" } },
    { type: "message", data: { sha: "ignored" } },
    { type: "custom", customType: GREEN_ENTRY, data: { sha: "new" } },
  ];
  assert.equal(lastGreenSha(entries), "new");
});

test("lastGreenSha returns undefined when no green entry exists", () => {
  assert.equal(lastGreenSha([]), undefined);
  assert.equal(lastGreenSha([{ type: "custom", customType: "x", data: { sha: "z" } }]), undefined);
});

test("editedPath extracts the path from edit/write tool results", () => {
  assert.equal(editedPath({ tool: "edit", input: { path: "src/a.ts" } }), "src/a.ts");
  assert.equal(editedPath({ toolName: "Write", input: { file_path: "src/b.ts" } }), "src/b.ts");
  assert.equal(editedPath({ tool: "str_replace_editor", input: { path: "c.ts" } }), "c.ts");
});

test("editedPath ignores non-edit tools and pathless inputs", () => {
  assert.equal(editedPath({ tool: "bash", input: { command: "ls" } }), undefined);
  assert.equal(editedPath({ tool: "edit", input: {} }), undefined);
  assert.equal(editedPath({}), undefined);
  assert.equal(editedPath(null), undefined);
});
