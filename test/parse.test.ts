import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFailures, reportToAgentFeedback } from "../src/core/index.js";
import type { Report } from "../src/core/index.js";

test("go: --- FAIL extracts test name + first error line", () => {
  const out = `=== RUN   TestFoo
--- FAIL: TestFoo (0.00s)
    foo_test.go:10: expected 3, got 4
FAIL
exit status 1
FAIL\tmod/pkg\t0.1s`;
  const p = parseFailures("go", out);
  assert.equal(p?.failures.length, 1);
  assert.equal(p?.failures[0].name, "TestFoo");
  assert.match(p?.failures[0].message ?? "", /expected 3, got 4/);
});

test("pytest: FAILED / ERROR summary lines (with messages)", () => {
  const out = `tests/test_x.py::test_add FAILED
=========== FAILURES ===========
FAILED tests/test_x.py::test_add - assert 4 == 3
ERROR tests/test_y.py::test_boom - ImportError`;
  const p = parseFailures("pytest", out);
  assert.deepEqual(p?.failures.map((f) => f.name), ["tests/test_x.py::test_add", "tests/test_y.py::test_boom"]);
  assert.equal(p?.failures[0].message, "assert 4 == 3");
});

test("cargo: 'test ... FAILED' lines", () => {
  const out = `test tests::adds ... ok
test tests::subtracts ... FAILED
failures:
    tests::subtracts`;
  const p = parseFailures("cargo", out);
  assert.deepEqual(p?.failures.map((f) => f.name), ["tests::subtracts"]);
});

test("jest: '●' failure headers", () => {
  const out = `FAIL src/a.test.js
  ● Math › adds
    expect(received).toBe(expected)
  ✕ adds (3 ms)`;
  const p = parseFailures("jest", out);
  assert.ok(p?.failures.some((f) => f.name === "Math › adds"));
});

test("vitest: 'FAIL file > suite > test'", () => {
  const out = ` FAIL  test/a.test.ts > suite > does thing
AssertionError: expected 1 to be 2`;
  const p = parseFailures("vitest", out);
  assert.ok(p?.failures.some((f) => f.name === "test/a.test.ts > suite > does thing"));
});

test("undefined for no-match, no framework, or 'make'", () => {
  assert.equal(parseFailures("go", "totally unrelated output"), undefined);
  assert.equal(parseFailures(undefined, "x"), undefined);
  assert.equal(parseFailures("make", "make: *** [test] Error 1"), undefined);
});

test("reportToAgentFeedback uses the parsed list, raw fallback otherwise", () => {
  const base = (parsed: boolean): Report => ({
    ok: false,
    cwd: "/x",
    startedAt: "now",
    durationMs: 1,
    results: [
      {
        check: { id: "t", name: "go test", kind: "test", command: "go test ./...", enabled: true, source: "go", framework: "go" },
        ok: false,
        exitCode: 1,
        durationMs: 1,
        timedOut: false,
        output: "--- FAIL: TestFoo (0s)\n    boom",
        truncated: false,
        ...(parsed ? { parsed: { failures: [{ name: "TestFoo", message: "boom" }], failed: 1 } } : {}),
      },
    ],
  });
  const withParsed = reportToAgentFeedback(base(true));
  assert.match(withParsed, /1 failing:/);
  assert.match(withParsed, /- TestFoo — boom/);
  assert.doesNotMatch(withParsed, /```/); // parsed path, no raw fence

  const rawOnly = reportToAgentFeedback(base(false));
  assert.match(rawOnly, /```/); // raw fallback fence
  assert.match(rawOnly, /--- FAIL: TestFoo/);
});
