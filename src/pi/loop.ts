import type { Report } from "../core/index.js";

/** Session custom-entry type used to cache the last all-green commit. */
export const GREEN_ENTRY = "pi-green-loop:green";

/**
 * A stable key set describing *what* is currently failing — parsed test names when available,
 * otherwise the failing check ids. Used to detect "not improving" between fix attempts.
 */
export function failingKeys(report: Report): Set<string> {
  const keys = new Set<string>();
  for (const r of report.results) {
    if (r.ok) continue;
    if (r.parsed && r.parsed.failures.length > 0) {
      for (const f of r.parsed.failures) keys.add(`${r.check.id}:${f.name}`);
    } else {
      keys.add(r.check.id);
    }
  }
  return keys;
}

export function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * Best-effort extraction of the file path from an edit/write tool-result event. Shape-tolerant
 * (works across pi versions / tool-name variants); returns undefined for non-edit tools so the
 * caller simply doesn't scope to anything (a full run — the safe fallback).
 */
export function editedPath(event: unknown): string | undefined {
  if (!event || typeof event !== "object") return undefined;
  const e = event as { tool?: unknown; toolName?: unknown; name?: unknown; input?: Record<string, unknown> };
  const tool = String(e.toolName ?? e.tool ?? e.name ?? "").toLowerCase();
  if (!/(edit|write|create|update|patch|str_replace|multiedit)/.test(tool)) return undefined;
  const input = e.input ?? {};
  const p = input.path ?? input.file_path ?? input.filePath ?? input.file;
  return typeof p === "string" && p.length > 0 ? p : undefined;
}

interface CustomEntryLike {
  type?: string;
  customType?: string;
  data?: unknown;
}

/** Most recent green-commit sha recorded in a session's custom entries. */
export function lastGreenSha(entries: CustomEntryLike[]): string | undefined {
  let sha: string | undefined;
  for (const e of entries) {
    if (e.type === "custom" && e.customType === GREEN_ENTRY && hasSha(e.data)) sha = e.data.sha;
  }
  return sha;
}

function hasSha(d: unknown): d is { sha: string } {
  return typeof d === "object" && d !== null && typeof (d as { sha?: unknown }).sha === "string";
}
