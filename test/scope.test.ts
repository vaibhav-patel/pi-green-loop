import { test } from "node:test";
import assert from "node:assert/strict";
import { goPackagesForFiles, scopeTestCommand } from "../src/core/index.js";
import type { Check } from "../src/core/index.js";

const testCheck = (framework: Check["framework"], command: string): Check => ({
  id: "t",
  name: "test",
  kind: "test",
  command,
  enabled: true,
  source: "node",
  framework,
});

test("jest: affected files -> --findRelatedTests (through -- for npm scripts)", () => {
  const out = scopeTestCommand(testCheck("jest", "npm run test"), { affectedFiles: ["src/a.ts", "src/b.ts"], cwd: "/p" });
  assert.equal(out.command, "npm run test -- --findRelatedTests src/a.ts src/b.ts");
});

test("jest: since -> --changedSince", () => {
  const out = scopeTestCommand(testCheck("jest", "npm run test"), { affectedFiles: [], cwd: "/p", since: "main" });
  assert.equal(out.command, "npm run test -- --changedSince main");
});

test("vitest: since -> --changed (flag works for script or `vitest run`)", () => {
  const out = scopeTestCommand(testCheck("vitest", "npm run test"), { affectedFiles: ["src/a.ts"], cwd: "/p", since: "HEAD~1" });
  assert.equal(out.command, "npm run test -- --changed HEAD~1");
});

test("vitest: files only + npm script -> unchanged (safe fallback)", () => {
  const check = testCheck("vitest", "npm run test");
  const out = scopeTestCommand(check, { affectedFiles: ["src/a.ts"], cwd: "/p" });
  assert.equal(out.command, check.command);
});

test("vitest: files only + direct vitest -> related --run", () => {
  const out = scopeTestCommand(testCheck("vitest", "vitest"), { affectedFiles: ["src/a.test.ts"], cwd: "/p" });
  assert.equal(out.command, "vitest related --run src/a.test.ts");
});

test("pytest: only test files appended; non-test files ignored", () => {
  const out = scopeTestCommand(testCheck("pytest", "pytest"), {
    affectedFiles: ["src/app.py", "tests/test_app.py", "tests/util_test.py"],
    cwd: "/p",
  });
  assert.equal(out.command, "pytest tests/test_app.py tests/util_test.py");
});

test("pytest: no changed test files -> unchanged (safe fallback)", () => {
  const check = testCheck("pytest", "pytest");
  assert.equal(scopeTestCommand(check, { affectedFiles: ["src/app.py"], cwd: "/p" }).command, check.command);
});

test("go: changed .go files -> ./... replaced with package dirs", () => {
  const out = scopeTestCommand(testCheck("go", "go test ./..."), {
    affectedFiles: ["pkg/a/a.go", "pkg/a/a_test.go", "cmd/main.go", "README.md"],
    cwd: "/p",
  });
  assert.equal(out.command, "go test ./pkg/a ./cmd");
});

test("goPackagesForFiles dedupes and handles root", () => {
  assert.deepEqual(goPackagesForFiles(["main.go", "pkg/x/y.go", "pkg/x/z.go"]), ["./", "./pkg/x"]);
});

test("absolute affected files are made cwd-relative", () => {
  const out = scopeTestCommand(testCheck("go", "go test ./..."), { affectedFiles: ["/p/pkg/a/a.go"], cwd: "/p" });
  assert.equal(out.command, "go test ./pkg/a");
});

test("non-test checks and cargo/make are never scoped", () => {
  const lint: Check = { id: "l", name: "lint", kind: "lint", command: "eslint .", enabled: true, source: "node" };
  assert.equal(scopeTestCommand(lint, { affectedFiles: ["a.ts"], cwd: "/p" }).command, "eslint .");
  const cargo = testCheck("cargo", "cargo test");
  assert.equal(scopeTestCommand(cargo, { affectedFiles: ["src/lib.rs"], cwd: "/p" }).command, "cargo test");
});
