import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { detectChecks } from "../src/core/index.js";
import type { Check, CheckKind } from "../src/core/index.js";

function tempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "gl-detect-"));
  for (const [name, content] of Object.entries(files)) {
    const p = join(dir, name);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return dir;
}

const byKind = (checks: Check[], kind: CheckKind): Check | undefined => checks.find((c) => c.kind === kind);

function withProject(files: Record<string, string>, fn: (checks: Check[]) => void): void {
  const dir = tempProject(files);
  try {
    fn(detectChecks(dir, {}));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("python: pyproject with ruff + mypy -> pytest / ruff / mypy (source python)", () => {
  withProject({ "pyproject.toml": "[tool.pytest.ini_options]\n[tool.ruff]\n[tool.mypy]\n" }, (checks) => {
    assert.equal(byKind(checks, "test")?.command, "pytest");
    assert.equal(byKind(checks, "test")?.framework, "pytest");
    assert.equal(byKind(checks, "lint")?.command, "ruff check .");
    assert.equal(byKind(checks, "typecheck")?.command, "mypy .");
    for (const c of checks) assert.equal(c.source, "python");
  });
});

test("python: bare pyproject still emits pytest, but no ruff/mypy", () => {
  withProject({ "pyproject.toml": "[project]\nname = 'x'\n" }, (checks) => {
    assert.equal(byKind(checks, "test")?.command, "pytest");
    assert.equal(byKind(checks, "lint"), undefined);
    assert.equal(byKind(checks, "typecheck"), undefined);
  });
});

test("go: go.mod -> vet / test / build; no golangci without config", () => {
  withProject({ "go.mod": "module x\n", "main.go": "package main\n" }, (checks) => {
    assert.equal(byKind(checks, "typecheck")?.command, "go vet ./...");
    assert.equal(byKind(checks, "test")?.command, "go test ./...");
    assert.equal(byKind(checks, "test")?.framework, "go");
    assert.equal(byKind(checks, "build")?.command, "go build ./...");
    assert.equal(byKind(checks, "lint"), undefined);
  });
});

test("go: .golangci.yml adds golangci-lint", () => {
  withProject({ "go.mod": "module x\n", ".golangci.yml": "" }, (checks) => {
    assert.equal(byKind(checks, "lint")?.command, "golangci-lint run");
  });
});

test("rust: Cargo.toml -> check / clippy / test / build", () => {
  withProject({ "Cargo.toml": "[package]\nname = 'x'\n" }, (checks) => {
    assert.equal(byKind(checks, "typecheck")?.command, "cargo check");
    assert.equal(byKind(checks, "lint")?.command, "cargo clippy");
    assert.equal(byKind(checks, "test")?.command, "cargo test");
    assert.equal(byKind(checks, "test")?.framework, "cargo");
    assert.equal(byKind(checks, "build")?.command, "cargo build");
  });
});

test("makefile: targets -> make <target>; ignores variable assignments", () => {
  withProject({ Makefile: "FLAGS := -x\ntest:\n\tpytest\nlint:\n\truff check .\nbuild:\n\techo build\n" }, (checks) => {
    assert.equal(byKind(checks, "test")?.command, "make test");
    assert.equal(byKind(checks, "test")?.framework, "make");
    assert.equal(byKind(checks, "lint")?.command, "make lint");
    assert.equal(byKind(checks, "build")?.command, "make build");
  });
});

test("polyglot: node wins per kind over go (dedupe by detector priority)", () => {
  withProject(
    { "package.json": JSON.stringify({ scripts: { test: "vitest", build: "tsc" } }), "go.mod": "module x\n" },
    (checks) => {
      assert.equal(byKind(checks, "test")?.command, "npm run test");
      assert.equal(byKind(checks, "test")?.source, "package.json");
      assert.equal(byKind(checks, "test")?.framework, "vitest");
      // go-only kind survives (node has no typecheck script here)
      assert.equal(byKind(checks, "typecheck")?.command, "go vet ./...");
    },
  );
});
