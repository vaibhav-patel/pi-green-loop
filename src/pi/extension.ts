// pi extension surface for pi-green-loop.
//
// Requires "@earendil-works/pi-coding-agent" (a peer dependency provided by the pi harness).
// Install into a pi project, or load ephemerally:  pi -e ./node_modules/pi-green-loop/dist/pi/extension.js
//
// After the agent finishes a turn (`agent_end`) and the session is idle, run the project's checks,
// scoped to the files the agent just edited. If anything fails, feed a parsed failure summary back
// as a follow-up so the agent fixes it. Reliability guards:
//   • debounce      — only run when idle with no queued messages
//   • budget        — at most `maxAttempts` auto-fixes per interactive turn
//   • not-improving — stop when a run reproduces the exact same set of failures
//   • skip-unchanged— skip when HEAD is the last known-green commit and nothing was edited
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { headSha, reportToAgentFeedback, runChecks } from "../core/index.js";
import { GREEN_ENTRY, editedPath, failingKeys, lastGreenSha, sameSet } from "./loop.js";

interface GreenloopState {
  enabled: boolean;
  attempts: number;
  maxAttempts: number;
  running: boolean;
  /** Files the agent edited this turn — used to scope test runs. */
  edited: Set<string>;
  /** Failing keys from the previous run, for not-improving detection. */
  lastFailing: Set<string> | undefined;
  /** Last commit sha observed all-green (skip redundant runs). */
  lastGreenSha: string | undefined;
  restored: boolean;
}

export default function piGreenLoop(pi: ExtensionAPI): void {
  const state: GreenloopState = {
    enabled: true,
    attempts: 0,
    maxAttempts: 3,
    running: false,
    edited: new Set(),
    lastFailing: undefined,
    lastGreenSha: undefined,
    restored: false,
  };

  // Restore the last known-green commit so a reloaded session skips redundant runs.
  pi.on("session_start", (_event, ctx) => {
    state.lastGreenSha = restoreGreenSha(ctx);
    state.restored = true;
  });

  // A fresh interactive prompt resets the auto-fix budget and the edited-file set.
  pi.on("input", (event) => {
    if (event.source === "interactive") {
      state.attempts = 0;
      state.lastFailing = undefined;
      state.edited.clear();
    }
  });

  // Track files the agent edits so the next run only re-tests what changed.
  pi.on("tool_result", (event) => {
    if (event.isError) return;
    const path = editedPath(event);
    if (path) state.edited.add(path);
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!state.enabled || state.running) return;
    if (ctx.mode !== "tui" && ctx.mode !== "rpc") return;
    if (!isTrusted(ctx)) return;
    // Debounce: only act when the agent is genuinely idle with nothing queued.
    if (!isIdle(ctx) || hasPending(ctx)) return;
    if (state.attempts >= state.maxAttempts) return;

    if (!state.restored) {
      state.lastGreenSha = restoreGreenSha(ctx);
      state.restored = true;
    }

    // Skip when HEAD is already the last known-green commit and nothing was edited since.
    const sha = headSha(ctx.cwd);
    if (sha && sha === state.lastGreenSha && state.edited.size === 0) return;

    state.running = true;
    ctx.ui.setStatus("pi-green-loop", "running checks…");
    try {
      const report = await runChecks({ cwd: ctx.cwd, signal: ctx.signal, affectedFiles: [...state.edited] });

      if (report.results.length === 0) {
        clearUi(ctx);
        return;
      }
      if (report.ok) {
        ctx.ui.setStatus("pi-green-loop", "checks passing");
        setWidget(ctx, undefined);
        state.edited.clear();
        state.lastFailing = undefined;
        if (sha) {
          state.lastGreenSha = sha;
          appendGreen(pi, sha);
        }
        return;
      }

      const failing = failingKeys(report);
      const failingChecks = report.results.filter((r) => !r.ok).length;
      setWidget(ctx, [...failing]);

      // Not-improving: the agent reproduced the exact same failures — pause instead of looping.
      if (state.lastFailing && sameSet(failing, state.lastFailing)) {
        state.attempts = state.maxAttempts; // park until the next interactive prompt
        ctx.ui.setStatus("pi-green-loop", `${failingChecks} failing — not improving, paused`);
        notify(ctx, "pi-green-loop: the same checks are still failing; pausing the auto-fix loop. Run /green to retry.");
        return;
      }

      state.lastFailing = failing;
      state.attempts += 1;
      ctx.ui.setStatus("pi-green-loop", `${failingChecks} failing (fix ${state.attempts}/${state.maxAttempts})`);
      await pi.sendUserMessage(reportToAgentFeedback(report), { deliverAs: "followUp" });
    } finally {
      state.running = false;
    }
  });

  pi.registerCommand("green", {
    description: "pi-green-loop: run checks now, or '/green on' | '/green off' to toggle the auto-fix loop.",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      if (arg === "off") {
        state.enabled = false;
        ctx.ui.notify("pi-green-loop: auto-fix loop disabled");
        return;
      }
      if (arg === "on") {
        state.enabled = true;
        state.attempts = 0;
        state.lastFailing = undefined;
        ctx.ui.notify("pi-green-loop: auto-fix loop enabled");
        return;
      }
      // A manual run clears the budget so the loop can resume after a not-improving pause.
      state.attempts = 0;
      state.lastFailing = undefined;
      const report = await runChecks({ cwd: ctx.cwd, signal: ctx.signal, affectedFiles: [...state.edited] });
      const failingChecks = report.results.filter((r) => !r.ok).length;
      ctx.ui.notify(report.ok ? "pi-green-loop: all checks passing" : `pi-green-loop: ${failingChecks} failing`);
      if (report.ok) {
        const sha = headSha(ctx.cwd);
        if (sha) {
          state.lastGreenSha = sha;
          appendGreen(pi, sha);
        }
        state.edited.clear();
        setWidget(ctx, undefined);
      } else {
        setWidget(ctx, [...failingKeys(report)]);
        await pi.sendUserMessage(reportToAgentFeedback(report), { deliverAs: "followUp" });
      }
    },
  });
}

// --- pi version-tolerant helpers (peer dep is `*`; older pi may lack some methods) ---

interface Ctxish {
  isProjectTrusted?: () => boolean;
  isIdle?: () => boolean;
  hasPendingMessages?: () => boolean;
  sessionManager?: { getEntries?: () => Array<{ type?: string; customType?: string; data?: unknown }> };
  ui: {
    setStatus: (key: string, text: string | undefined) => void;
    setWidget?: (key: string, content: string[] | undefined) => void;
    notify?: (text: string) => void;
  };
}

function isTrusted(ctx: Ctxish): boolean {
  return typeof ctx.isProjectTrusted === "function" ? ctx.isProjectTrusted() : true;
}

function isIdle(ctx: Ctxish): boolean {
  return typeof ctx.isIdle === "function" ? ctx.isIdle() : true;
}

function hasPending(ctx: Ctxish): boolean {
  return typeof ctx.hasPendingMessages === "function" ? ctx.hasPendingMessages() : false;
}

function restoreGreenSha(ctx: Ctxish): string | undefined {
  try {
    return lastGreenSha(ctx.sessionManager?.getEntries?.() ?? []);
  } catch {
    return undefined;
  }
}

function appendGreen(pi: { appendEntry?: (customType: string, data?: unknown) => void }, sha: string): void {
  try {
    pi.appendEntry?.(GREEN_ENTRY, { sha });
  } catch {
    /* appendEntry unavailable -> in-memory only */
  }
}

function setWidget(ctx: Ctxish, names: string[] | undefined): void {
  try {
    if (typeof ctx.ui.setWidget !== "function") return;
    if (!names || names.length === 0) {
      ctx.ui.setWidget("pi-green-loop", undefined);
      return;
    }
    const MAX = 8;
    const shown = names.slice(0, MAX);
    const lines = [`pi-green-loop — ${names.length} failing`, ...shown.map((n) => `  ✗ ${n}`)];
    if (names.length > shown.length) lines.push(`  …and ${names.length - shown.length} more`);
    ctx.ui.setWidget("pi-green-loop", lines);
  } catch {
    /* widget rendering is optional */
  }
}

function clearUi(ctx: Ctxish): void {
  ctx.ui.setStatus("pi-green-loop", undefined);
  setWidget(ctx, undefined);
}

function notify(ctx: Ctxish, text: string): void {
  try {
    ctx.ui.notify?.(text);
  } catch {
    /* notify is optional */
  }
}
