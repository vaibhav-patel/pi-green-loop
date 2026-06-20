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
export declare function scopeTestCommand(check: Check, opts: ScopeOptions): Check;
/** Changed files vs a git ref, via plain git (no shell — ref-injection safe). [] on any error. */
export declare function changedFilesSince(cwd: string, ref: string): string[];
/** Current HEAD commit sha, or undefined when not in a git repo. */
export declare function headSha(cwd: string): string | undefined;
/** Map changed `.go` files to unique package dirs (`./pkg/x`). */
export declare function goPackagesForFiles(files: string[]): string[];
