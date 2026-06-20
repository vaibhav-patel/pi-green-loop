import { execFileSync } from "node:child_process";
import { isAbsolute, relative } from "node:path";
import type { Check } from "./types.js";

export interface ScopeOptions {
  /** Changed files (absolute or cwd-relative). */
  affectedFiles: string[];
  cwd: string;
  /** Git ref for since-based scoping (vitest --changed, jest --changedSince). */
  since?: string;
}

/**
 * Return a copy of a TEST check whose command runs only impacted tests — or the check unchanged
 * when scoping is impossible/unsafe (the safe fallback that guarantees we never run "0 tests").
 */
export function scopeTestCommand(check: Check, opts: ScopeOptions): Check {
  if (check.kind !== "test" || !check.framework) return check;
  const scoped = scopeCommand(check.command, check.framework, opts);
  if (!scoped || scoped === check.command) return check;
  return { ...check, command: scoped };
}

/** Changed files vs a git ref, via plain git (no shell — ref-injection safe). [] on any error. */
export function changedFilesSince(cwd: string, ref: string): string[] {
  try {
    const out = execFileSync("git", ["diff", "--name-only", ref], { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Current HEAD commit sha, or undefined when not in a git repo. */
export function headSha(cwd: string): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Map changed `.go` files to unique package dirs (`./pkg/x`). */
export function goPackagesForFiles(files: string[]): string[] {
  const pkgs = new Set<string>();
  for (const f of files) {
    if (!f.endsWith(".go")) continue;
    const dir = posixDirname(f);
    pkgs.add(dir === "" || dir === "." ? "./" : `./${dir}`);
  }
  return [...pkgs];
}

const RUN_SCRIPT = /\b(?:npm|pnpm|yarn|bun)\s+run\b/;

function scopeCommand(cmd: string, framework: NonNullable<Check["framework"]>, opts: ScopeOptions): string | undefined {
  const files = normalize(opts.affectedFiles, opts.cwd);
  switch (framework) {
    case "jest":
      if (files.length > 0) return appendArgs(cmd, ["--findRelatedTests", ...files]);
      if (opts.since) return appendArgs(cmd, ["--changedSince", opts.since]);
      return undefined;
    case "vitest":
      // `--changed <ref>` is a flag (works whether the script is `vitest` or `vitest run`).
      if (opts.since) return appendArgs(cmd, ["--changed", opts.since]);
      // The `related` subcommand only composes cleanly with a direct `vitest` invocation.
      if (files.length > 0 && /(^|\s)vitest(\s|$)/.test(cmd)) return `${cmd} related --run ${files.join(" ")}`;
      return undefined;
    case "pytest": {
      const tests = files.filter(isPytestFile);
      return tests.length > 0 ? `${cmd} ${tests.join(" ")}` : undefined;
    }
    case "go": {
      const pkgs = goPackagesForFiles(files);
      return pkgs.length > 0 && cmd.includes("./...") ? cmd.replace("./...", pkgs.join(" ")) : undefined;
    }
    default:
      return undefined; // cargo, make -> run full (safe)
  }
}

/** Append args to a command: through `--` for `<pm> run <script>`, directly for direct invocations. */
function appendArgs(cmd: string, args: string[]): string {
  const joined = args.join(" ");
  if (RUN_SCRIPT.test(cmd)) return cmd.includes(" -- ") ? `${cmd} ${joined}` : `${cmd} -- ${joined}`;
  return `${cmd} ${joined}`;
}

function normalize(files: string[], cwd: string): string[] {
  return files
    .map((f) => (isAbsolute(f) ? relative(cwd, f) : f))
    .map((f) => f.split("\\").join("/"))
    .filter((f) => f.length > 0 && !f.startsWith("../"));
}

function isPytestFile(f: string): boolean {
  return /(^|\/)(test_[^/]+|[^/]+_test)\.py$/.test(f);
}

function posixDirname(f: string): string {
  const i = f.lastIndexOf("/");
  return i === -1 ? "" : f.slice(0, i);
}
