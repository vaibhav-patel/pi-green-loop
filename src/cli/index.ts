#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, watch, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  CI_WORKFLOW_PATH,
  ciWorkflowYaml,
  configPath,
  detectChecks,
  detectFormatters,
  formatReport,
  loadConfig,
  reportToAgentFeedback,
  runChecks,
} from "../core/index.js";
import type { Check, CheckResult, GreenloopConfig } from "../core/index.js";

const VERSION = "0.2.0";

const HELP = `pi-green-loop ${VERSION} — keep the build green

Usage: pi-green-loop <command> [options]

Commands:
  detect            Show the checks pi-green-loop would run
  check             Run all checks once (exit 1 if any fail)
  fix               Run detected formatters/autofixers, then re-check
  watch             Re-run checks on file changes (scoped to what changed)
  init [--ci]       Write a pi-green-loop.json (and, with --ci, a GitHub Actions workflow)
  mcp               Start the MCP server (stdio)
  help, version

Options:
  --feedback        With 'check': print agent-ready failure text instead of a summary
  --since <ref>     With 'check': scope tests to files changed since a git ref
  --affected <a,b>  With 'check': scope tests to a comma-separated list of changed files
  --ci              With 'init': also write ${CI_WORKFLOW_PATH}
`;

function main(argv: string[]): Promise<number> | number {
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
    case "fix":
      return cmdFix();
    case "watch":
      return cmdWatch();
    case "init":
      return cmdInit(rest);
    case "mcp":
      return cmdMcp();
    default:
      process.stderr.write(`pi-green-loop: unknown command '${command}'\n\n${HELP}`);
      return 1;
  }
}

function cmdDetect(): number {
  const cwd = process.cwd();
  const checks = detectChecks(cwd, loadConfig(cwd));
  if (checks.length === 0) {
    process.stdout.write("pi-green-loop: no checks detected.\n");
    return 0;
  }
  process.stdout.write(`pi-green-loop: ${checks.length} check(s) in ${cwd}\n`);
  for (const c of checks) {
    process.stdout.write(`  - ${c.name} (${c.kind}) [${c.source}]: ${c.command}\n`);
  }
  return 0;
}

async function cmdCheck(rest: string[]): Promise<number> {
  const feedback = rest.includes("--feedback");
  const since = flagValue(rest, "--since");
  const affectedArg = flagValue(rest, "--affected");
  const affectedFiles = affectedArg
    ? affectedArg.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const report = await runChecks({
    since,
    affectedFiles,
    onCheckStart: feedback ? undefined : (c) => process.stderr.write(`  running ${c.name}...\n`),
    onCheckResult: feedback ? undefined : (r) => process.stderr.write(line(r)),
  });
  if (feedback) {
    process.stdout.write(report.ok ? "pi-green-loop: all checks passing\n" : `${reportToAgentFeedback(report)}\n`);
  } else {
    process.stdout.write(`${formatReport(report)}\n`);
  }
  return report.ok ? 0 : 1;
}

async function cmdFix(): Promise<number> {
  const cwd = process.cwd();
  const formatters = detectFormatters(cwd);
  if (formatters.length === 0) {
    process.stdout.write("pi-green-loop: no formatters detected (nothing to fix).\n");
  } else {
    process.stdout.write(`pi-green-loop: running ${formatters.length} formatter(s)...\n`);
    for (const f of formatters) {
      process.stdout.write(`  ${f.name}: ${f.command}\n`);
      const r = spawnSync(f.command, { cwd, shell: true, stdio: "inherit" });
      if (r.status !== 0) {
        process.stderr.write(`  pi-green-loop: ${f.name} exited with code ${r.status ?? "signal"} (continuing)\n`);
      }
    }
  }
  process.stdout.write("\npi-green-loop: re-checking...\n");
  const report = await runChecks({ cwd, onCheckResult: (r) => process.stderr.write(line(r)) });
  process.stdout.write(`${formatReport(report)}\n`);
  return report.ok ? 0 : 1;
}

async function cmdWatch(): Promise<number> {
  const cwd = process.cwd();
  const ignore = /(^|\/)(node_modules|\.git|dist|coverage|\.pi-green-loop\.cache)(\/|$)/;
  let running = false;
  let rerun = false;
  // Files touched since the last run; the next run is scoped to just these (full run when empty).
  const changed = new Set<string>();

  const run = async () => {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    const affectedFiles = [...changed];
    changed.clear();
    process.stdout.write(
      affectedFiles.length > 0
        ? `\npi-green-loop: running checks (scoped to ${affectedFiles.length} changed file(s))...\n`
        : "\npi-green-loop: running checks...\n",
    );
    const report = await runChecks({ cwd, affectedFiles, onCheckResult: (r) => process.stderr.write(line(r)) });
    process.stdout.write(`${formatReport(report)}\n`);
    running = false;
    if (rerun) {
      rerun = false;
      void run();
    }
  };

  process.stdout.write(`pi-green-loop: watching ${cwd} (Ctrl+C to stop)\n`);
  await run();

  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(cwd, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const name = filename.toString();
    if (ignore.test(name)) return;
    changed.add(name);
    clearTimeout(timer);
    timer = setTimeout(() => void run(), 300);
  });

  // Keep the process alive until interrupted.
  return new Promise<number>((resolve) => {
    process.on("SIGINT", () => {
      process.stdout.write("\npi-green-loop: stopped\n");
      resolve(0);
    });
  });
}

function cmdInit(rest: string[]): number {
  const cwd = process.cwd();
  const path = configPath(cwd);
  let wroteSomething = false;
  let failed = false;

  if (existsSync(path)) {
    process.stderr.write(`pi-green-loop: ${basename(path)} already exists; not overwriting.\n`);
  } else {
    const detected = detectChecks(cwd, {});
    const config: GreenloopConfig = {
      timeoutMs: 300_000,
      checks:
        detected.length > 0
          ? detected.map((c) => ({ name: c.name, kind: c.kind, command: c.command }))
          : [{ name: "test", kind: "test", command: "npm test" }],
    };
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
    process.stdout.write(`pi-green-loop: wrote ${basename(path)} with ${config.checks?.length ?? 0} check(s).\n`);
    wroteSomething = true;
  }

  if (rest.includes("--ci")) {
    const ciPath = join(cwd, CI_WORKFLOW_PATH);
    if (existsSync(ciPath)) {
      process.stderr.write(`pi-green-loop: ${CI_WORKFLOW_PATH} already exists; not overwriting.\n`);
      failed = true;
    } else {
      mkdirSync(dirname(ciPath), { recursive: true });
      writeFileSync(ciPath, ciWorkflowYaml());
      process.stdout.write(`pi-green-loop: wrote ${CI_WORKFLOW_PATH}.\n`);
      wroteSomething = true;
    }
  }

  return wroteSomething && !failed ? 0 : 1;
}

async function cmdMcp(): Promise<number> {
  try {
    const mod = await import("../mcp/server.js");
    await mod.startServer();
    return 0;
  } catch (err) {
    const message = (err as Error).message;
    process.stderr.write(
      `pi-green-loop: failed to start MCP server: ${message}\n` +
        "Install the MCP dependencies first:\n  npm install @modelcontextprotocol/sdk zod\n",
    );
    return 1;
  }
}

function line(r: CheckResult): string {
  const mark = r.ok ? "ok" : r.timedOut ? "timeout" : "fail";
  return `  [${mark}] ${r.check.name} (${Math.round(r.durationMs)}ms)\n`;
}

/** Read the value following a `--flag` in an argv slice. */
function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

// Support both sync and async return from main without unhandled rejections.
Promise.resolve(main(process.argv)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    process.stderr.write(`pi-green-loop: ${(err as Error).stack ?? err}\n`);
    process.exitCode = 1;
  },
);
