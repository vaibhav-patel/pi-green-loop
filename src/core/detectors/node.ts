import type { Check, CheckKind, TestFramework } from "../types.js";
import type { DetectContext, Detector } from "./types.js";

interface PackageJson {
  scripts?: Record<string, string>;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Known script names mapped to a check kind, in match priority order. */
const SCRIPT_KINDS: Array<{ kind: CheckKind; names: string[] }> = [
  { kind: "typecheck", names: ["typecheck", "type-check", "tsc", "types"] },
  { kind: "lint", names: ["lint", "lint:check", "eslint", "biome"] },
  { kind: "test", names: ["test", "test:unit", "test:ci", "vitest", "jest"] },
  { kind: "build", names: ["build", "compile"] },
];

function parsePkg(ctx: DetectContext): PackageJson {
  const raw = ctx.readText("package.json");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PackageJson;
  } catch {
    return {};
  }
}

/** Pick a package-manager run command based on the packageManager field / lockfiles. */
function detectRunner(ctx: DetectContext, pkg: PackageJson): string {
  const pm = pkg.packageManager ?? "";
  if (pm.startsWith("pnpm") || ctx.exists("pnpm-lock.yaml")) return "pnpm";
  if (pm.startsWith("yarn") || ctx.exists("yarn.lock")) return "yarn";
  if (pm.startsWith("bun") || ctx.exists("bun.lockb") || ctx.exists("bun.lock")) return "bun";
  return "npm";
}

/** Distinguish vitest vs jest from the test script and deps, so scoping/parsing can target it. */
function testFramework(pkg: PackageJson, testScript: string | undefined): TestFramework | undefined {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const s = testScript ?? "";
  if (/\bvitest\b/.test(s) || "vitest" in deps) return "vitest";
  if (/\bjest\b/.test(s) || "jest" in deps) return "jest";
  return undefined;
}

export const nodeDetector: Detector = {
  id: "node",
  matches: (ctx) => ctx.exists("package.json"),
  detect: (ctx) => {
    const pkg = parsePkg(ctx);
    const scripts = pkg.scripts ?? {};
    const runner = detectRunner(ctx, pkg);
    const checks: Check[] = [];
    for (const { kind, names } of SCRIPT_KINDS) {
      const match = names.find((name) => typeof scripts[name] === "string");
      if (!match) continue;
      const check: Check = {
        id: `pkg-${match}`,
        name: match,
        kind,
        command: `${runner} run ${match}`,
        enabled: true,
        source: "package.json",
      };
      if (kind === "test") {
        const fw = testFramework(pkg, scripts[match]);
        if (fw) check.framework = fw;
      }
      checks.push(check);
    }
    return checks;
  },
};
