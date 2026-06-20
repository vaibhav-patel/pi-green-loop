import { makeDetectContext } from "./detect.js";
function parsePkg(ctx) {
    const raw = ctx.readText("package.json");
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
/** The runner-appropriate prefix for executing a locally-installed binary (never auto-installs). */
function execPrefix(ctx) {
    if (ctx.exists("pnpm-lock.yaml"))
        return "pnpm exec";
    if (ctx.exists("yarn.lock"))
        return "yarn";
    if (ctx.exists("bun.lockb") || ctx.exists("bun.lock"))
        return "bunx";
    return "npx --no-install";
}
function hasAny(ctx, files) {
    return files.some((f) => ctx.exists(f));
}
function nodeFormatters(ctx) {
    if (!ctx.exists("package.json"))
        return [];
    const pkg = parsePkg(ctx);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const exec = execPrefix(ctx);
    const out = [];
    const prettierConfig = hasAny(ctx, [
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.js",
        ".prettierrc.cjs",
        ".prettierrc.yaml",
        ".prettierrc.yml",
        "prettier.config.js",
        "prettier.config.cjs",
    ]);
    if ("prettier" in deps || pkg.prettier !== undefined || prettierConfig) {
        out.push({ name: "prettier", command: `${exec} prettier --write .`, ecosystem: "node" });
    }
    const eslintConfig = hasAny(ctx, [
        ".eslintrc",
        ".eslintrc.json",
        ".eslintrc.js",
        ".eslintrc.cjs",
        ".eslintrc.yaml",
        ".eslintrc.yml",
        "eslint.config.js",
        "eslint.config.mjs",
        "eslint.config.cjs",
    ]);
    if ("eslint" in deps || eslintConfig) {
        out.push({ name: "eslint --fix", command: `${exec} eslint --fix .`, ecosystem: "node" });
    }
    return out;
}
function pythonFormatters(ctx) {
    const pyproject = ctx.readText("pyproject.toml") ?? "";
    const out = [];
    const hasRuff = /\[tool\.ruff/.test(pyproject) || ctx.exists("ruff.toml") || ctx.exists(".ruff.toml");
    if (hasRuff) {
        out.push({ name: "ruff format", command: "ruff format .", ecosystem: "python" });
        out.push({ name: "ruff check --fix", command: "ruff check --fix .", ecosystem: "python" });
    }
    if (/\[tool\.black/.test(pyproject)) {
        out.push({ name: "black", command: "black .", ecosystem: "python" });
    }
    return out;
}
function goFormatters(ctx) {
    return ctx.exists("go.mod") ? [{ name: "gofmt", command: "gofmt -w .", ecosystem: "go" }] : [];
}
function rustFormatters(ctx) {
    return ctx.exists("Cargo.toml") ? [{ name: "cargo fmt", command: "cargo fmt", ecosystem: "rust" }] : [];
}
/**
 * Discover the autofix/format commands that apply to a project, across ecosystems. Additive
 * (every applicable ecosystem contributes), detection-only — it never installs anything, and only
 * surfaces a tool when there's evidence it's already available (a dependency or its config file).
 */
export function detectFormatters(cwd) {
    const ctx = makeDetectContext(cwd);
    const all = [];
    for (const detect of [nodeFormatters, pythonFormatters, goFormatters, rustFormatters]) {
        try {
            all.push(...detect(ctx));
        }
        catch {
            /* a malformed config never breaks the rest */
        }
    }
    return all;
}
//# sourceMappingURL=fix.js.map