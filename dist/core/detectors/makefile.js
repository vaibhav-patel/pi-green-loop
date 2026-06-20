/** Map well-known Make targets to check kinds, in match priority order. */
const TARGET_KINDS = [
    { kind: "typecheck", names: ["typecheck", "type-check"] },
    { kind: "lint", names: ["lint", "check"] },
    { kind: "test", names: ["test", "tests"] },
    { kind: "build", names: ["build", "all"] },
];
function readMakefile(ctx) {
    return ctx.readText("Makefile") ?? ctx.readText("makefile") ?? ctx.readText("GNUmakefile");
}
/** Collect target names; skip variable assignments (`:=`) and dot-targets (`.PHONY`). */
function parseTargets(text) {
    const targets = new Set();
    for (const line of text.split("\n")) {
        const m = /^([A-Za-z0-9_.-]+)\s*:(?!=)/.exec(line);
        if (m?.[1] && !m[1].startsWith("."))
            targets.add(m[1]);
    }
    return targets;
}
export const makefileDetector = {
    id: "makefile",
    matches: (ctx) => ctx.exists("Makefile") || ctx.exists("makefile") || ctx.exists("GNUmakefile"),
    detect: (ctx) => {
        const text = readMakefile(ctx);
        if (!text)
            return [];
        const targets = parseTargets(text);
        const checks = [];
        for (const { kind, names } of TARGET_KINDS) {
            const match = names.find((n) => targets.has(n));
            if (!match)
                continue;
            const check = { id: `make-${match}`, name: match, kind, command: `make ${match}`, enabled: true, source: "makefile" };
            if (kind === "test")
                check.framework = "make";
            checks.push(check);
        }
        return checks;
    },
};
//# sourceMappingURL=makefile.js.map