import type { GreenloopConfig } from "./types.js";
/**
 * Load configuration from the first config file found in `cwd`.
 * Returns an empty config when none exists.
 */
export declare function loadConfig(cwd: string): GreenloopConfig;
/** The canonical config filename the CLI writes to. */
export declare function configPath(cwd: string): string;
