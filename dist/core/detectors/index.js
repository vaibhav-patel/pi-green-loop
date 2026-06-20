import { goDetector } from "./go.js";
import { makefileDetector } from "./makefile.js";
import { nodeDetector } from "./node.js";
import { pythonDetector } from "./python.js";
import { rustDetector } from "./rust.js";
/** Array order is priority: earlier detectors win when several emit the same check kind. */
export const DETECTORS = [nodeDetector, pythonDetector, goDetector, rustDetector, makefileDetector];
/** Run every matching detector (each guarded so one ecosystem can't break detection). */
export function detectAll(ctx) {
    const checks = [];
    for (const detector of DETECTORS) {
        if (!detector.matches(ctx))
            continue;
        try {
            checks.push(...detector.detect(ctx));
        }
        catch {
            // a detector must never break the whole detection pass
        }
    }
    return dedupeByKind(checks);
}
/** Keep the first check per non-custom kind (detector priority); custom checks all pass through. */
function dedupeByKind(checks) {
    const seen = new Set();
    const out = [];
    for (const c of checks) {
        if (c.kind === "custom") {
            out.push(c);
            continue;
        }
        if (seen.has(c.kind))
            continue;
        seen.add(c.kind);
        out.push(c);
    }
    return out;
}
//# sourceMappingURL=index.js.map