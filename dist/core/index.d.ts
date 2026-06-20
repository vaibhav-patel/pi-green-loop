import type { Check, CheckResult, GreenloopConfig, Report } from "./types.js";
export type { Check, CheckKind, CheckResult, Report, GreenloopConfig, ConfigCheck, CheckSource, TestFramework, ParsedFailure, ParsedResult, } from "./types.js";
export { detectChecks, makeDetectContext } from "./detect.js";
export { loadConfig, configPath } from "./config.js";
export { runCheck } from "./runner.js";
export { parseFailures } from "./parse.js";
export { scopeTestCommand, changedFilesSince, goPackagesForFiles, headSha } from "./scope.js";
export type { ScopeOptions } from "./scope.js";
export { detectFormatters } from "./fix.js";
export type { Formatter } from "./fix.js";
export { ciWorkflowYaml, CI_WORKFLOW_PATH } from "./ci.js";
export interface RunChecksOptions {
    cwd?: string;
    config?: GreenloopConfig;
    /** Explicit checks to run; otherwise detected from the project. */
    checks?: Check[];
    signal?: AbortSignal;
    stopOnFirstFailure?: boolean;
    /** Changed files to scope test checks to (only impacted tests run). */
    affectedFiles?: string[];
    /** Git ref for since-based scoping (resolves changed files via git when affectedFiles is absent). */
    since?: string;
    /** Extract structured failures from failing output (default true). */
    parse?: boolean;
    onCheckStart?: (check: Check) => void;
    onCheckResult?: (result: CheckResult) => void;
}
/** Run the project's checks in order and return an aggregate report. */
export declare function runChecks(options?: RunChecksOptions): Promise<Report>;
/** Human-readable one-line-per-check summary. */
export declare function formatReport(report: Report): string;
/**
 * Render only the failing checks as a fix-ready prompt for an agent. Prefers a parsed list of
 * failing test names (compact, less context bloat); falls back to the raw output block when no
 * structured failures were extracted. Returns an empty string when everything passes.
 */
export declare function reportToAgentFeedback(report: Report): string;
