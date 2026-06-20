import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectAll } from "./detectors/index.js";
const DEFAULT_ORDER = ["typecheck", "lint", "test", "build"];
/**
 * Determine the ordered list of checks for a project. An explicit config (`config.checks`)
 * takes precedence; otherwise checks are inferred per-ecosystem by the detector registry.
 */
export function detectChecks(cwd, config = {}) {
    if (config.checks && config.checks.length > 0) {
        return config.checks.map((c, i) => ({
            id: c.id ?? `config-${i}`,
            name: c.name ?? c.command,
            kind: c.kind ?? "custom",
            command: c.command,
            cwd: c.cwd,
            enabled: c.enabled ?? true,
            source: "config",
        }));
    }
    const checks = detectAll(makeDetectContext(cwd, config));
    const order = config.order ?? DEFAULT_ORDER;
    checks.sort((a, b) => rank(order, a.kind) - rank(order, b.kind));
    return checks;
}
function rank(order, kind) {
    const i = order.indexOf(kind);
    return i === -1 ? order.length : i;
}
/** Build a DetectContext with per-pass memoized file reads. */
export function makeDetectContext(cwd, config = {}) {
    const textCache = new Map();
    const existsCache = new Map();
    return {
        cwd,
        config,
        readText(relPath) {
            if (!textCache.has(relPath)) {
                try {
                    textCache.set(relPath, readFileSync(join(cwd, relPath), "utf8"));
                }
                catch {
                    textCache.set(relPath, undefined);
                }
            }
            return textCache.get(relPath);
        },
        exists(relPath) {
            let v = existsCache.get(relPath);
            if (v === undefined) {
                v = existsSync(join(cwd, relPath));
                existsCache.set(relPath, v);
            }
            return v;
        },
    };
}
//# sourceMappingURL=detect.js.map