import type { Detector } from "./types.js";
/**
 * Python detection. We only need to know which tools the project uses, so a cheap text scan of
 * pyproject.toml / setup.cfg is enough (no TOML dependency). pytest is emitted by default since it
 * is the de-facto runner and discovers unittest-style tests too; ruff/mypy are emitted when present.
 */
export declare const pythonDetector: Detector;
