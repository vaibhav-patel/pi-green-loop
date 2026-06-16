export type CheckKind = "typecheck" | "lint" | "test" | "build" | "custom";

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
  source: "config" | "package.json" | "makefile" | "builtin";
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
