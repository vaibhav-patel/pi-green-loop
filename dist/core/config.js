import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// Current name first; legacy "greenloop.json" is still read so existing setups keep working.
const CONFIG_FILES = ["pi-green-loop.json", ".pi-green-loop.json", "greenloop.json", ".greenloop.json"];
/**
 * Load configuration from the first config file found in `cwd`.
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
            throw new Error(`pi-green-loop: failed to parse ${file}: ${err.message}`);
        }
    }
    return {};
}
/** The canonical config filename the CLI writes to. */
export function configPath(cwd) {
    return join(cwd, "pi-green-loop.json");
}
//# sourceMappingURL=config.js.map