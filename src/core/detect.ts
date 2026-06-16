import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckKind, GreenloopConfig } from "./types.js";

interface PackageJson {
  scripts?: Record<string, string>;
  packageManager?: string;
}

/** Known script names mapped to a check kind, in match priority order. */
const SCRIPT_KINDS: Array<{ kind: CheckKind; names: string[] }> = [
  { kind: "typecheck", names: ["typecheck", "type-check", "tsc", "types"] },
  { kind: "lint", names: ["lint", "lint:check", "eslint", "biome"] },
  { kind: "test", names: ["test", "test:unit", "test:ci", "vitest", "jest"] },
  { kind: "build", names: ["build", "compile"] },
];

const DEFAULT_ORDER: CheckKind[] = ["typecheck", "lint", "test", "build"];

/**
 * Determine the ordered list of checks for a project. An explicit config (`config.checks`)
 * takes precedence; otherwise checks are inferred from `package.json` scripts.
 */
export function detectChecks(cwd: string, config: GreenloopConfig = {}): Check[] {
  if (config.checks && config.checks.length > 0) {
    return config.checks.map((c, i) => ({
      id: c.id ?? `config-${i}`,
      name: c.name ?? c.command,
      kind: c.kind ?? "custom",
      command: c.command,
      cwd: c.cwd,
      enabled: c.enabled ?? true,
      source: "config" as const,
    }));
  }

  const checks: Check[] = [];
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = readPackageJson(pkgPath);
    const runner = detectRunner(cwd, pkg);
    const scripts = pkg.scripts ?? {};
    for (const { kind, names } of SCRIPT_KINDS) {
      const match = names.find((name) => typeof scripts[name] === "string");
      if (match) {
        checks.push({
          id: `pkg-${match}`,
          name: match,
          kind,
          command: `${runner} run ${match}`,
          enabled: true,
          source: "package.json",
        });
      }
    }
  }

  const order = config.order ?? DEFAULT_ORDER;
  checks.sort((a, b) => rank(order, a.kind) - rank(order, b.kind));
  return checks;
}

function rank(order: CheckKind[], kind: CheckKind): number {
  const i = order.indexOf(kind);
  return i === -1 ? order.length : i;
}

/** Pick a package-manager run command based on lockfiles / packageManager field. */
function detectRunner(cwd: string, pkg: PackageJson): string {
  const pm = pkg.packageManager ?? "";
  if (pm.startsWith("pnpm") || existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (pm.startsWith("yarn") || existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (
    pm.startsWith("bun") ||
    existsSync(join(cwd, "bun.lockb")) ||
    existsSync(join(cwd, "bun.lock"))
  ) {
    return "bun";
  }
  return "npm";
}

function readPackageJson(path: string): PackageJson {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
  } catch {
    return {};
  }
}
