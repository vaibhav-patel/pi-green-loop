import type { Check, GreenloopConfig } from "../types.js";

export type EcosystemSource = "node" | "python" | "go" | "rust" | "makefile";

/** Read-only view of a project root, with memoized file access, passed to each detector. */
export interface DetectContext {
  cwd: string;
  config: GreenloopConfig;
  /** Contents of a file relative to cwd, or undefined if missing/unreadable. */
  readText(relPath: string): string | undefined;
  /** Whether a file/dir exists relative to cwd. */
  exists(relPath: string): boolean;
}

export interface Detector {
  /** Ecosystem id; registry priority is array order. */
  id: EcosystemSource;
  /** Cheap gate: does this ecosystem apply to the project? */
  matches(ctx: DetectContext): boolean;
  /** Produce checks. MUST NOT throw — return [] on any parse failure. */
  detect(ctx: DetectContext): Check[];
}
