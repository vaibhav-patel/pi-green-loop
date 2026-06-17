import type { Check, CheckResult } from "./types.js";
export interface RunOptions {
    cwd: string;
    timeoutMs: number;
    maxOutputBytes: number;
    signal?: AbortSignal;
    /** Receives output chunks as they stream in. */
    onData?: (chunk: string) => void;
}
/**
 * Execute a single check in a shell, capturing combined stdout/stderr up to a byte cap,
 * enforcing a timeout and honoring an optional AbortSignal.
 */
export declare function runCheck(check: Check, opts: RunOptions): Promise<CheckResult>;
