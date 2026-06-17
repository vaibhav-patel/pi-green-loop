// pi extension surface for greenloop.
//
// Requires "@earendil-works/pi-coding-agent" (a peer dependency provided by the pi harness).
// Install into a pi project, or load ephemerally:  pi -e ./node_modules/greenloop/dist/pi/extension.js
//
// Behavior: after the agent finishes a turn (`agent_end`), run the project's checks. If any
// fail, feed the failing output back as a follow-up so the agent fixes it — capped by
// `maxAttempts` per user turn to prevent runaway loops.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { reportToAgentFeedback, runChecks } from "../core/index.js";

interface GreenloopState {
  enabled: boolean;
  attempts: number;
  maxAttempts: number;
  running: boolean;
}

export default function greenloop(pi: ExtensionAPI): void {
  const state: GreenloopState = { enabled: true, attempts: 0, maxAttempts: 3, running: false };

  // A fresh interactive prompt resets the auto-fix budget.
  pi.on("input", (event) => {
    if (event.source === "interactive") state.attempts = 0;
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!state.enabled || state.running) return;
    if (ctx.mode !== "tui" && ctx.mode !== "rpc") return;
    // isProjectTrusted was added in newer pi; treat its absence as trusted so older pi still works.
    const trusted = typeof ctx.isProjectTrusted === "function" ? ctx.isProjectTrusted() : true;
    if (!trusted) return;
    if (state.attempts >= state.maxAttempts) return;

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
    } finally {
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
      if (!report.ok) await pi.sendUserMessage(reportToAgentFeedback(report), { deliverAs: "followUp" });
    },
  });
}
