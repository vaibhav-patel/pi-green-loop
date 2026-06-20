import type { Check } from "../types.js";
import { goDetector } from "./go.js";
import { makefileDetector } from "./makefile.js";
import { nodeDetector } from "./node.js";
import { pythonDetector } from "./python.js";
import { rustDetector } from "./rust.js";
import type { DetectContext, Detector } from "./types.js";

export type { DetectContext, Detector, EcosystemSource } from "./types.js";

/** Array order is priority: earlier detectors win when several emit the same check kind. */
export const DETECTORS: Detector[] = [nodeDetector, pythonDetector, goDetector, rustDetector, makefileDetector];

/** Run every matching detector (each guarded so one ecosystem can't break detection). */
export function detectAll(ctx: DetectContext): Check[] {
  const checks: Check[] = [];
  for (const detector of DETECTORS) {
    if (!detector.matches(ctx)) continue;
    try {
      checks.push(...detector.detect(ctx));
    } catch {
      // a detector must never break the whole detection pass
    }
  }
  return dedupeByKind(checks);
}

/** Keep the first check per non-custom kind (detector priority); custom checks all pass through. */
function dedupeByKind(checks: Check[]): Check[] {
  const seen = new Set<string>();
  const out: Check[] = [];
  for (const c of checks) {
    if (c.kind === "custom") {
      out.push(c);
      continue;
    }
    if (seen.has(c.kind)) continue;
    seen.add(c.kind);
    out.push(c);
  }
  return out;
}
