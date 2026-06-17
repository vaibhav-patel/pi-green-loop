import { reportToAgentFeedback, runChecks } from "../core/index.js";
export default function greenloop(pi) {
    const state = { enabled: true, attempts: 0, maxAttempts: 3, running: false };
    // A fresh interactive prompt resets the auto-fix budget.
    pi.on("input", (event) => {
        if (event.source === "interactive")
            state.attempts = 0;
    });
    pi.on("agent_end", async (_event, ctx) => {
        if (!state.enabled || state.running)
            return;
        if (ctx.mode !== "tui" && ctx.mode !== "rpc")
            return;
        // isProjectTrusted was added in newer pi; treat its absence as trusted so older pi still works.
        const trusted = typeof ctx.isProjectTrusted === "function" ? ctx.isProjectTrusted() : true;
        if (!trusted)
            return;
        if (state.attempts >= state.maxAttempts)
            return;
        state.running = true;
        ctx.ui.setStatus("greenloop", "running checks…");
        try {
            const report = await runChecks({ cwd: ctx.cwd, signal: ctx.signal });
            if (report.results.length === 0) {
                ctx.ui.setStatus("greenloop", undefined);
                return;
            }
            if (report.ok) {
                ctx.ui.setStatus("greenloop", "checks passing");
                return;
            }
            const failing = report.results.filter((r) => !r.ok).length;
            state.attempts += 1;
            ctx.ui.setStatus("greenloop", `${failing} failing (fix ${state.attempts}/${state.maxAttempts})`);
            await pi.sendUserMessage(reportToAgentFeedback(report), { deliverAs: "followUp" });
        }
        finally {
            state.running = false;
        }
    });
    pi.registerCommand("green", {
        description: "greenloop: run checks now, or '/green on' | '/green off' to toggle the auto-fix loop.",
        handler: async (args, ctx) => {
            const arg = args.trim().toLowerCase();
            if (arg === "off") {
                state.enabled = false;
                ctx.ui.notify("greenloop: auto-fix loop disabled");
                return;
            }
            if (arg === "on") {
                state.enabled = true;
                ctx.ui.notify("greenloop: auto-fix loop enabled");
                return;
            }
            const report = await runChecks({ cwd: ctx.cwd, signal: ctx.signal });
            const failing = report.results.filter((r) => !r.ok).length;
            ctx.ui.notify(report.ok ? "greenloop: all checks passing" : `greenloop: ${failing} failing`);
            if (!report.ok)
                await pi.sendUserMessage(reportToAgentFeedback(report), { deliverAs: "followUp" });
        },
    });
}
//# sourceMappingURL=extension.js.map