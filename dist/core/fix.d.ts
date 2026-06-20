import type { EcosystemSource } from "./detectors/types.js";
/** A detected auto-formatter / autofix command that can be run before re-checking. */
export interface Formatter {
    /** Display name (e.g. "prettier", "ruff format"). */
    name: string;
    /** Shell command to run from the project root. */
    command: string;
    /** Ecosystem that contributed it. */
    ecosystem: EcosystemSource;
}
/**
 * Discover the autofix/format commands that apply to a project, across ecosystems. Additive
 * (every applicable ecosystem contributes), detection-only — it never installs anything, and only
 * surfaces a tool when there's evidence it's already available (a dependency or its config file).
 */
export declare function detectFormatters(cwd: string): Formatter[];
