import { spawn } from "node:child_process";
/**
 * Execute a single check in a shell, capturing combined stdout/stderr up to a byte cap,
 * enforcing a timeout and honoring an optional AbortSignal.
 */
export function runCheck(check, opts) {
    const start = Date.now();
    const cwd = check.cwd ?? opts.cwd;
    return new Promise((resolve) => {
        const child = spawn(check.command, { cwd, shell: true, env: process.env });
        let output = "";
        let bytes = 0;
        let truncated = false;
        let timedOut = false;
        const append = (data) => {
            const text = data.toString("utf8");
            opts.onData?.(text);
            if (truncated)
                return;
            const incoming = Buffer.byteLength(text);
            if (bytes + incoming > opts.maxOutputBytes) {
                const remaining = Math.max(0, opts.maxOutputBytes - bytes);
                output += text.slice(0, remaining);
                output += `\n... [output truncated at ${opts.maxOutputBytes} bytes]`;
                truncated = true;
            }
            else {
                output += text;
            }
            bytes += incoming;
        };
        child.stdout?.on("data", append);
        child.stderr?.on("data", append);
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, opts.timeoutMs);
        const onAbort = () => child.kill("SIGKILL");
        opts.signal?.addEventListener("abort", onAbort, { once: true });
        const finish = (exitCode, spawnError) => {
            clearTimeout(timer);
            opts.signal?.removeEventListener("abort", onAbort);
            resolve({
                check,
                ok: !timedOut && !spawnError && exitCode === 0,
                exitCode,
                durationMs: Date.now() - start,
                timedOut,
                output: spawnError ? `Failed to start: ${spawnError}` : output.trimEnd(),
                truncated,
            });
        };
        child.on("close", (code) => finish(code));
        child.on("error", (err) => finish(null, err.message));
    });
}
//# sourceMappingURL=runner.js.map