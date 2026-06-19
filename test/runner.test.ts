import { test } from "node:test";
import assert from "node:assert/strict";
import { runCheck } from "../src/core/index.js";
import type { Check } from "../src/core/index.js";

const mk = (command: string): Check => ({ id: "c", name: "c", kind: "custom", command, enabled: true, source: "config" });
const opts = (over: Partial<{ timeoutMs: number; maxOutputBytes: number }> = {}) => ({
  cwd: process.cwd(),
  timeoutMs: 5000,
  maxOutputBytes: 10_000,
  ...over,
});

test("passing command -> ok with exit code 0", async () => {
  const r = await runCheck(mk("exit 0"), opts());
  assert.equal(r.ok, true);
  assert.equal(r.exitCode, 0);
});

test("failing command -> not ok with its exit code", async () => {
  const r = await runCheck(mk("exit 3"), opts());
  assert.equal(r.ok, false);
  assert.equal(r.exitCode, 3);
});

test("captures stdout output", async () => {
  const r = await runCheck(mk("echo hello-pi-green-loop"), opts());
  assert.match(r.output, /hello-pi-green-loop/);
});

test("kills and flags commands that exceed the timeout", async () => {
  const r = await runCheck(mk('node -e "setTimeout(() => {}, 3000)"'), opts({ timeoutMs: 250 }));
  assert.equal(r.timedOut, true);
  assert.equal(r.ok, false);
});

test("truncates output beyond the byte cap", async () => {
  const r = await runCheck(mk("node -e \"process.stdout.write('x'.repeat(5000))\""), opts({ maxOutputBytes: 200 }));
  assert.equal(r.truncated, true);
  assert.ok(r.output.length < 1000);
});
