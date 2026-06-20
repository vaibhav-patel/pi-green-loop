import type { ParsedResult, TestFramework } from "./types.js";
/**
 * Extract failing test names (and a representative error line) from a check's raw output.
 *
 * Parses the framework's *default human output* — no JSON-reporter flags, plugins, or command
 * rewriting required (so it can't trip vitest's watch mode or conflict with a project's reporter
 * config). Returns `undefined` when nothing can be extracted, so callers fall back to raw output.
 * Purely presentational: it never affects pass/fail.
 */
export declare function parseFailures(framework: TestFramework | undefined, output: string): ParsedResult | undefined;
