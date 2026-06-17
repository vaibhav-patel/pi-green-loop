import { loadConfig } from "./config.js";
import { detectChecks } from "./detect.js";
import { runCheck } from "./runner.js";
export { detectChecks } from "./detect.js";
export { loadConfig, configPath } from "./config.js";
export { runCheck } from "./runner.js";
const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 100_000;
/** Run the project's checks in order and return an aggregate report. */
export async function runChecks(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const config = options.config ?? loadConfig(cwd);
    const checks = (options.checks ?? detectChecks(cwd, config)).filter((c) => c.enabled);
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxOutputBytes = config.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    const startedAt = new Date().toISOString();
    const start = Date.now();
    const results = [];
    for (const check of checks) {
        if (options.signal?.aborted)
            break;
        options.onCheckStart?.(check);
        const result = await runCheck(check, { cwd, timeoutMs, maxOutputBytes, signal: options.signal });
        results.push(result);
        options.onCheckResult?.(result);
        if (!result.ok && options.stopOnFirstFailure)
            break;
    }
    return {
        ok: results.length > 0 && results.every((r) => r.ok),
        results,
        startedAt,
        durationMs: Date.now() - start,
        cwd,
    };
}
/** Human-readable one-line-per-check summary. */
export function formatReport(report) {
    if (report.results.length === 0) {
        return "greenloop: no checks detected (add a greenloop.json or package.json scripts).";
    }
    const lines = report.results.map((r) => {
        const mark = r.ok ? "PASS" : r.timedOut ? "TIMEOUT" : "FAIL";
        return `  [${mark}] ${r.check.name} (${r.check.kind}) — ${Math.round(r.durationMs)}ms`;
    });
    const header = report.ok ? "greenloop: all checks passing" : "greenloop: checks FAILING";
    return `${header}\n${lines.join("\n")}`;
}
/**
 * Render only the failing checks as a fix-ready prompt for an agent. Returns an empty
 * string when everything passes.
 */
export function reportToAgentFeedback(report) {
    const failing = report.results.filter((r) => !r.ok);
    if (failing.length === 0)
        return "";
    const blocks = failing.map((r) => {
        const reason = r.timedOut ? "timed out" : `exited with code ${r.exitCode}`;
        return [
            `### ${r.check.name} (${r.check.kind}) ${reason}`,
            "```",
            r.output || "(no output)",
            "```",
        ].join("\n");
    });
    return [
        `greenloop detected ${failing.length} failing check(s). Fix the underlying issues, then re-run the checks. Do not silence or skip checks.`,
        "",
        ...blocks,
    ].join("\n");
}
//# sourceMappingURL=index.js.map