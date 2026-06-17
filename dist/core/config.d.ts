import type { GreenloopConfig } from "./types.js";
/**
 * Load greenloop configuration from the first config file found in `cwd`.
 * Returns an empty config when none exists.
 */
export declare function loadConfig(cwd: string): GreenloopConfig;
export declare function configPath(cwd: string): string;
