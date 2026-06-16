# greenloop — architecture & implementation plan

## Vision

An autonomous **"keep the build green"** loop for AI coding agents. After code changes, run the
project's checks (typecheck → lint → test → build); when something is red, hand the failing output
back to the agent so it fixes it, and repeat until green or a cap is hit.

One **core engine**, four **thin surfaces**.

```
                         ┌──────────────────────────┐
                         │      core engine          │
   detect ──▶ run ──▶ parse ──▶ report ──▶ feedback   │
                         │  (zero external deps)      │
                         └──────────────┬─────────────┘
            ┌───────────────┬───────────┼─────────────┬────────────────┐
            ▼               ▼           ▼             ▼                ▼
          CLI            MCP server   pi extension   Claude/Cursor   (future
       greenloop        npx greenloop   greenloop/pi     skill        modules)
        check/watch        mcp          agent_end loop   SKILL.md
```

## Core engine (`src/core`) — dependency-free, Node built-ins only

- **`types.ts`** — `Check`, `CheckResult`, `Report`, `GreenloopConfig`.
- **`config.ts`** — load `greenloop.json` / `.greenloop.json` if present.
- **`detect.ts`** — discover checks. v0: Node `package.json` scripts (typecheck/lint/test/build)
  with package-manager detection (npm/pnpm/yarn/bun). Config file overrides detection.
  Future: Makefile, `pyproject.toml`, `cargo`, `go`.
- **`runner.ts`** — spawn each check (`shell: true`), capture combined output with byte cap,
  per-check timeout, `AbortSignal` support, streaming callback.
- **`index.ts`** — `runChecks()` orchestrator + `formatReport()` (human) +
  `reportToAgentFeedback()` (turns failures into an LLM-ready fix prompt).

## Surfaces

### CLI (`src/cli`)
`greenloop <command>`:
- `detect` — print detected checks.
- `check` — run once, print report, exit non-zero if red.
- `watch` — re-run on file changes (debounced; ignores node_modules/.git/dist).
- `mcp` — start the MCP server (dynamic import; MCP deps optional).
- `init` — write a `greenloop.json` template from detected checks.

### MCP server (`src/mcp/server.ts`)
stdio MCP server exposing tools:
- `detect_checks` — list configured/detected checks.
- `run_checks` — run all (or a subset by kind/id); returns ok + per-check status + failing output.
- `get_last_report` — cached last result.
Run via `npx greenloop mcp`; register in Claude/Cursor's MCP config.

### pi extension (`src/pi/extension.ts`)
Uses the pi event bus for the real closed loop:
- On `agent_end` (debounced), run checks via the core engine.
- If red, `pi.sendUserMessage(reportToAgentFeedback(report), { deliverAs: "followUp" })` so the
  agent fixes it — capped by `maxAttempts` to prevent infinite loops / token burn.
- `ctx.ui.setStatus("greenloop", "✓ passing" | "✗ N failing")` footer indicator.
- `/green`, `/green watch on|off`, `/green cmd "…"` commands.
- Respect `ctx.isProjectTrusted()` before executing anything.

### Skill (`skills/greenloop/SKILL.md`)
Progressive-disclosure instructions for Claude/Cursor/pi: after edits, run `greenloop check`,
read failures, fix, repeat until green. Works without the extension.

## Guardrails

- **Iteration cap** on auto-fix injections (default 3) — the key defense against loops.
- **Per-check timeout** + **output byte cap** (don't flood context).
- **Trust gate**: never run checks in an untrusted project without consent.
- **Opt-in auto-run**: `watch`/loop modes are off by default; explicit `check` always available.

## Milestones

- **M1 (this scaffold)**: core (detect/run/report) + CLI `detect`/`check`; docs; private repo.
- **M2**: MCP server wired + verified in an MCP client; `init`; `watch`.
- **M3**: pi extension closed-loop + status UI; ship as a pi package (`extensions/` + `skills/`).
- **M4**: scoped/affected-test running; more ecosystems (Python, Go, Rust); config schema.
- **M5**: publish to npm; add modules (memory, meter, secretguard).

## Open questions

- Default trigger for the pi loop: `agent_end` only, or also a debounced on-save mode?
- How aggressive should affected-test scoping be vs. always running the full suite?
- Cache the last green commit to skip redundant runs?
- One npm package with subcommands per module, or a small family of packages?
