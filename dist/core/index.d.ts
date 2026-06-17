import type { Check, CheckResult, GreenloopConfig, Report } from "./types.js";
export type { Check, CheckKind, CheckResult, Report, GreenloopConfig, ConfigCheck } from "./types.js";
export { detectChecks } from "./detect.js";
export { loadConfig, configPath } from "./config.js";
export { runCheck } from "./runner.js";
export interface RunChecksOptions {
    cwd?: string;
    config?: GreenloopConfig;
    /** Explicit checks to run; otherwise detected from the project. */
    checks?: Check[];
    signal?: AbortSignal;
    stopOnFirstFailure?: boolean;
    onCheckStart?: (check: Check) => void;
    onCheckResult?: (result: CheckResult) => void;
}
/** Run the project's checks in order and return an aggregate report. */
export declare function runChecks(options?: RunChecksOptions): Promise<Report>;
/** Human-readable one-line-per-check summary. */
export declare function formatReport(report: Report): string;
/**
 * Render only the failing checks as a fix-ready prompt for an agent. Returns an empty
 * string when everything passes.
 */
export declare function reportToAgentFeedback(report: Report): string;
