import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const CONFIG_FILES = ["greenloop.json", ".greenloop.json"];
/**
 * Load greenloop configuration from the first config file found in `cwd`.
 * Returns an empty config when none exists.
 */
export function loadConfig(cwd) {
    for (const file of CONFIG_FILES) {
        const path = join(cwd, file);
        if (!existsSync(path))
            continue;
        try {
            const parsed = JSON.parse(readFileSync(path, "utf8"));
            return parsed ?? {};
        }
        catch (err) {
            throw new Error(`greenloop: failed to parse ${file}: ${err.message}`);
        }
    }
    return {};
}
export function configPath(cwd) {
    return join(cwd, CONFIG_FILES[0]);
}
//# sourceMappingURL=config.js.map