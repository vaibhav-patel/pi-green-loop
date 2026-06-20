import type { Check } from "../types.js";
import type { DetectContext, Detector } from "./types.js";

/**
 * Python detection. We only need to know which tools the project uses, so a cheap text scan of
 * pyproject.toml / setup.cfg is enough (no TOML dependency). pytest is emitted by default since it
 * is the de-facto runner and discovers unittest-style tests too; ruff/mypy are emitted when present.
 */
export const pythonDetector: Detector = {
  id: "python",
  matches: (ctx) =>
    ctx.exists("pyproject.toml") || ctx.exists("setup.cfg") || ctx.exists("pytest.ini") || ctx.exists("tox.ini"),
  detect: (ctx) => {
    const pyproject = ctx.readText("pyproject.toml") ?? "";
    const all = `${pyproject}\n${ctx.readText("setup.cfg") ?? ""}`;
    const checks: Check[] = [
      { id: "py-test", name: "pytest", kind: "test", command: "pytest", enabled: true, source: "python", framework: "pytest" },
    ];
    if (/\[tool\.ruff/.test(pyproject) || /\bruff\b/.test(all)) {
      checks.push({ id: "py-lint", name: "ruff", kind: "lint", command: "ruff check .", enabled: true, source: "python" });
    }
    if (/\[tool\.mypy/.test(pyproject) || /\bmypy\b/.test(all)) {
      checks.push({ id: "py-typecheck", name: "mypy", kind: "typecheck", command: "mypy .", enabled: true, source: "python" });
    }
    return checks;
  },
};
