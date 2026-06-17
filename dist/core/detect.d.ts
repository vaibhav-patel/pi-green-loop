import type { Check, GreenloopConfig } from "./types.js";
/**
 * Determine the ordered list of checks for a project. An explicit config (`config.checks`)
 * takes precedence; otherwise checks are inferred from `package.json` scripts.
 */
export declare function detectChecks(cwd: string, config?: GreenloopConfig): Check[];
