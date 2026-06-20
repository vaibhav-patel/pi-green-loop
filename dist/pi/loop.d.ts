import type { Report } from "../core/index.js";
/** Session custom-entry type used to cache the last all-green commit. */
export declare const GREEN_ENTRY = "pi-green-loop:green";
/**
 * A stable key set describing *what* is currently failing — parsed test names when available,
 * otherwise the failing check ids. Used to detect "not improving" between fix attempts.
 */
export declare function failingKeys(report: Report): Set<string>;
export declare function sameSet(a: Set<string>, b: Set<string>): boolean;
/**
 * Best-effort extraction of the file path from an edit/write tool-result event. Shape-tolerant
 * (works across pi versions / tool-name variants); returns undefined for non-edit tools so the
 * caller simply doesn't scope to anything (a full run — the safe fallback).
 */
export declare function editedPath(event: unknown): string | undefined;
interface CustomEntryLike {
    type?: string;
    customType?: string;
    data?: unknown;
}
/** Most recent green-commit sha recorded in a session's custom entries. */
export declare function lastGreenSha(entries: CustomEntryLike[]): string | undefined;
export {};
