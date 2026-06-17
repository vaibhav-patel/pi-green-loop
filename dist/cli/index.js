#!/usr/bin/env node
import { existsSync, watch, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { configPath, detectChecks, formatReport, loadConfig, reportToAgentFeedback, runChecks, } from "../core/index.js";
const VERSION = "0.1.0";
const HELP = `greenloop ${VERSION} — keep the build green

Usage: greenloop <command> [options]

Commands:
  detect            Show the checks greenloop would run
  check             Run all checks once (exit 1 if any fail)
  watch             Re-run checks on file changes
  init              Write a greenloop.json from detected checks
  mcp               Start the MCP server (stdio)
  help, version

Options:
  --feedback        With 'check': print agent-ready failure text instead of a summary
  --no-color        Disable colored output
`;
function main(argv) {
    const args = argv.slice(2);
    const command = args[0];
    const rest = args.slice(1);
    switch (command) {
        case undefined:
        case "help":
        case "-h":
        case "--help":
            process.stdout.write(HELP);
            return 0;
        case "version":
        case "-v":
        case "--version":
            process.stdout.write(`${VERSION}\n`);
            return 0;
        case "detect":
            return cmdDetect();
        case "check":
            return cmdCheck(rest);
        case "watch":
            return cmdWatch();
        case "init":
            return cmdInit();
        case "mcp":
            return cmdMcp();
        default:
            process.stderr.write(`greenloop: unknown command '${command}'\n\n${HELP}`);
            return 1;
    }
}
function cmdDetect() {
    const cwd = process.cwd();
    const checks = detectChecks(cwd, loadConfig(cwd));
    if (checks.length === 0) {
        process.stdout.write("greenloop: no checks detected.\n");
        return 0;
    }
    process.stdout.write(`greenloop: ${checks.length} check(s) in ${cwd}\n`);
    for (const c of checks) {
        process.stdout.write(`  - ${c.name} (${c.kind}) [${c.source}]: ${c.command}\n`);
    }
    return 0;
}
async function cmdCheck(rest) {
    const feedback = rest.includes("--feedback");
    const report = await runChecks({
        onCheckStart: feedback ? undefined : (c) => process.stderr.write(`  running ${c.name}...\n`),
        onCheckResult: feedback ? undefined : (r) => process.stderr.write(line(r)),
    });
    if (feedback) {
        process.stdout.write(report.ok ? "greenloop: all checks passing\n" : `${reportToAgentFeedback(report)}\n`);
    }
    else {
        process.stdout.write(`${formatReport(report)}\n`);
    }
    return report.ok ? 0 : 1;
}
async function cmdWatch() {
    const cwd = process.cwd();
    const ignore = /(^|\/)(node_modules|\.git|dist|coverage|\.greenloop\.cache)(\/|$)/;
    let running = false;
    let rerun = false;
    const run = async () => {
        if (running) {
            rerun = true;
            return;
        }
        running = true;
        process.stdout.write("\ngreenloop: running checks...\n");
        const report = await runChecks({ onCheckResult: (r) => process.stderr.write(line(r)) });
        process.stdout.write(`${formatReport(report)}\n`);
        running = false;
        if (rerun) {
            rerun = false;
            void run();
        }
    };
    process.stdout.write(`greenloop: watching ${cwd} (Ctrl+C to stop)\n`);
    await run();
    let timer;
    watch(cwd, { recursive: true }, (_event, filename) => {
        if (filename && ignore.test(filename.toString()))
            return;
        clearTimeout(timer);
        timer = setTimeout(() => void run(), 300);
    });
    // Keep the process alive until interrupted.
    return new Promise((resolve) => {
        process.on("SIGINT", () => {
            process.stdout.write("\ngreenloop: stopped\n");
            resolve(0);
        });
    });
}
function cmdInit() {
    const cwd = process.cwd();
    const path = configPath(cwd);
    if (existsSync(path)) {
        process.stderr.write(`greenloop: ${basename(path)} already exists; not overwriting.\n`);
        return 1;
    }
    const detected = detectChecks(cwd, {});
    const config = {
        timeoutMs: 300_000,
        checks: detected.length > 0
            ? detected.map((c) => ({ name: c.name, kind: c.kind, command: c.command }))
            : [{ name: "test", kind: "test", command: "npm test" }],
    };
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
    process.stdout.write(`greenloop: wrote ${basename(path)} with ${config.checks?.length ?? 0} check(s).\n`);
    return 0;
}
async function cmdMcp() {
    try {
        const mod = await import("../mcp/server.js");
        await mod.startServer();
        return 0;
    }
    catch (err) {
        const message = err.message;
        process.stderr.write(`greenloop: failed to start MCP server: ${message}\n` +
            "Install the MCP dependencies first:\n  npm install @modelcontextprotocol/sdk zod\n");
        return 1;
    }
}
function line(r) {
    const mark = r.ok ? "ok" : r.timedOut ? "timeout" : "fail";
    return `  [${mark}] ${r.check.name} (${Math.round(r.durationMs)}ms)\n`;
}
// Support both sync and async return from main without unhandled rejections.
Promise.resolve(main(process.argv)).then((code) => {
    process.exitCode = code;
}, (err) => {
    process.stderr.write(`greenloop: ${err.stack ?? err}\n`);
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map