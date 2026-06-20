import { test } from "node:test";
import assert from "node:assert/strict";
import { CI_WORKFLOW_PATH, ciWorkflowYaml } from "../src/core/index.js";

test("CI workflow path is the conventional GitHub Actions location", () => {
  assert.equal(CI_WORKFLOW_PATH, ".github/workflows/green.yml");
});

test("CI workflow runs pi-green-loop check on push and pull_request", () => {
  const yaml = ciWorkflowYaml();
  assert.match(yaml, /^name: green$/m);
  assert.match(yaml, /^\s*push:$/m);
  assert.match(yaml, /^\s*pull_request:$/m);
  assert.match(yaml, /npx pi-green-loop check/);
  assert.match(yaml, /actions\/checkout@v4/);
  assert.match(yaml, /actions\/setup-node@v4/);
  assert.ok(yaml.endsWith("\n"), "ends with a trailing newline");
});
