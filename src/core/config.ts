import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GreenloopConfig } from "./types.js";

const CONFIG_FILES = ["greenloop.json", ".greenloop.json"];

/**
 * Load greenloop configuration from the first config file found in `cwd`.
 * Returns an empty config when none exists.
 */
export function loadConfig(cwd: string): GreenloopConfig {
  for (const file of CONFIG_FILES) {
    const path = join(cwd, file);
    if (!existsSync(path)) continue;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as GreenloopConfig;
      return parsed ?? {};
    } catch (err) {
      throw new Error(`greenloop: failed to parse ${file}: ${(err as Error).message}`);
    }
  }
  return {};
}

export function configPath(cwd: string): string {
  return join(cwd, CONFIG_FILES[0]);
}
