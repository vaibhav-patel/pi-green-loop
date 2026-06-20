export type CheckKind = "typecheck" | "lint" | "test" | "build" | "custom";
export type CheckSource = "config" | "package.json" | "builtin" | "node" | "python" | "go" | "rust" | "makefile";
/** Test framework behind a `kind:"test"` check — drives affected-test scoping and failure parsing. */
export type TestFramework = "vitest" | "jest" | "pytest" | "go" | "cargo" | "make";
export interface Check {
    /** Stable identifier, unique within a run. */
    id: string;
    /** Human-readable label, e.g. "test". */
    name: string;
    kind: CheckKind;
    /** Shell command to execute, e.g. "npm run test". */
    command: string;
    /** Override working directory for this check. */
    cwd?: string;
    enabled: boolean;
    /** Where this check came from. */
    source: CheckSource;
    /** Test framework, when known. */
    framework?: TestFramework;
}
/** A single parsed test/check failure (presentational; never affects pass/fail). */
export interface ParsedFailure {
    name: string;
    message?: string;
    file?: string;
    line?: number;
}
export interface ParsedResult {
    failures: ParsedFailure[];
    failed?: number;
    total?: number;
}
export interface CheckResult {
    check: Check;
    ok: boolean;
    exitCode: number | null;
    durationMs: number;
    timedOut: boolean;
    /** Combined stdout+stderr, possibly truncated. */
    output: string;
    truncated: boolean;
    /** Structured failures extracted from machine-readable reporter output, when available. */
    parsed?: ParsedResult;
}
export interface Report {
    ok: boolean;
    results: CheckResult[];
    startedAt: string;
    durationMs: number;
    cwd: string;
}
export interface ConfigCheck {
    command: string;
    name?: string;
    kind?: CheckKind;
    id?: string;
    cwd?: string;
    enabled?: boolean;
}
export interface GreenloopConfig {
    checks?: ConfigCheck[];
    /** Per-check timeout in milliseconds. */
    timeoutMs?: number;
    /** Max bytes of captured output kept per check. */
    maxOutputBytes?: number;
    /** Ordering of check kinds when auto-detected. */
    order?: CheckKind[];
}
