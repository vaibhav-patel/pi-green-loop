import type { DetectContext } from "./detectors/types.js";
import type { Check, GreenloopConfig } from "./types.js";
/**
 * Determine the ordered list of checks for a project. An explicit config (`config.checks`)
 * takes precedence; otherwise checks are inferred per-ecosystem by the detector registry.
 */
export declare function detectChecks(cwd: string, config?: GreenloopConfig): Check[];
/** Build a DetectContext with per-pass memoized file reads. */
export declare function makeDetectContext(cwd: string, config?: GreenloopConfig): DetectContext;
