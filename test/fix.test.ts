import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectFormatters } from "../src/core/index.js";
import type { Formatter } from "../src/core/index.js";

function tempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "gl-fix-"));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

function withProject(files: Record<string, string>, fn: (formatters: Formatter[]) => void): void {
  const dir = tempProject(files);
  try {
    fn(detectFormatters(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const cmds = (fs: Formatter[]): string[] => fs.map((f) => f.command);

test("node: prettier + eslint devDeps -> npx --no-install commands", () => {
  withProject(
    { "package.json": JSON.stringify({ devDependencies: { prettier: "^3", eslint: "^9" } }) },
    (formatters) => {
      assert.deepEqual(cmds(formatters), ["npx --no-install prettier --write .", "npx --no-install eslint --fix ."]);
      for (const f of formatters) assert.equal(f.ecosystem, "node");
    },
  );
});

test("node: prettier config file alone is enough to detect it", () => {
  withProject({ "package.json": "{}", ".prettierrc.json": "{}" }, (formatters) => {
    assert.deepEqual(cmds(formatters), ["npx --no-install prettier --write ."]);
  });
});

test("node: pnpm lockfile -> pnpm exec prefix", () => {
  withProject(
    { "package.json": JSON.stringify({ devDependencies: { prettier: "^3" } }), "pnpm-lock.yaml": "" },
    (formatters) => {
      assert.deepEqual(cmds(formatters), ["pnpm exec prettier --write ."]);
    },
  );
});

test("node: no formatter deps or config -> nothing", () => {
  withProject({ "package.json": JSON.stringify({ dependencies: { left_pad: "1" } }) }, (formatters) => {
    assert.deepEqual(formatters, []);
  });
});

test("python: [tool.ruff] -> ruff format then ruff check --fix", () => {
  withProject({ "pyproject.toml": "[tool.ruff]\nline-length = 100\n" }, (formatters) => {
    assert.deepEqual(cmds(formatters), ["ruff format .", "ruff check --fix ."]);
    for (const f of formatters) assert.equal(f.ecosystem, "python");
  });
});

test("python: [tool.black] -> black", () => {
  withProject({ "pyproject.toml": "[tool.black]\n" }, (formatters) => {
    assert.deepEqual(cmds(formatters), ["black ."]);
  });
});

test("go: go.mod -> gofmt -w .", () => {
  withProject({ "go.mod": "module x\n" }, (formatters) => {
    assert.deepEqual(cmds(formatters), ["gofmt -w ."]);
  });
});

test("rust: Cargo.toml -> cargo fmt", () => {
  withProject({ "Cargo.toml": "[package]\nname = 'x'\n" }, (formatters) => {
    assert.deepEqual(cmds(formatters), ["cargo fmt"]);
  });
});

test("polyglot: every applicable ecosystem contributes (additive)", () => {
  withProject(
    { "package.json": JSON.stringify({ devDependencies: { prettier: "^3" } }), "go.mod": "module x\n" },
    (formatters) => {
      assert.deepEqual(cmds(formatters), ["npx --no-install prettier --write .", "gofmt -w ."]);
    },
  );
});

test("empty project -> no formatters", () => {
  withProject({ "README.md": "# hi" }, (formatters) => assert.deepEqual(formatters, []));
});
