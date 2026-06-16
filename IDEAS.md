# greenloop — ideas & roadmap

> This file captures the exploration that led to greenloop. It started as a hunt for
> a genuinely useful **pi agent-harness plugin**, then grew into a standalone,
> multi-surface developer tool (CLI + MCP server + Claude/Cursor skill + pi extension).

Date started: 2026-06-17 · Status: building idea #1 (greenloop)

---

## 1. Background: the pi agent harness

[`earendil-works/pi`](https://github.com/earendil-works/pi) is a minimal, self-extensible
coding-agent harness (TypeScript monorepo). The core ships only four tools
(Read / Write / Edit / Bash); everything else is added through four mechanisms:

- **Extensions** — TypeScript modules (`export default (pi: ExtensionAPI) => …`) that hook a
  rich event bus (`tool_call`, `tool_result`, `before_agent_start`, `context`, `agent_end`,
  `session_shutdown`, `session_before_compact`, …), register LLM tools (`pi.registerTool`),
  slash commands, keybindings, providers, and TUI (footers/widgets/overlays/renderers).
- **Skills** — markdown + frontmatter, progressive disclosure (only the description sits in
  context until invoked).
- **Prompt templates** — markdown expanded by `/name`.
- **Themes** — JSON palettes.

Packaged as npm/git bundles, installed with `pi install npm:… | git:… | ./path` or loaded
ephemerally with `-e`.

## 2. The plugin landscape we surveyed

**In-repo (~83 example extensions)** — strong on orchestration (subagents, plan-mode, handoff,
compaction), safety (permission-gate, protected-paths, dirty-repo-guard, sandbox/gondolin VM),
git (checkpoint, auto-commit), providers, TUI cosmetics, and games (even DOOM).

**Third-party / community frontier**

- **oh-my-pi** (can1357) — heavyweight bundle: LSP, DAP debugger, persistent Python/JS kernels,
  real browser control, hash-anchored edits, subagents, memory tools (retain/recall/reflect),
  checkpoint/rewind, BM25 tool search, +18 tools.
- **pi-superagents** (teelicht) — brainstorm→plan→implement→verify→review pipeline, tiered
  models, worktree isolation.
- **bo-pi** (yevhen) — preflight approvals, response export, theme sync.
- Community: **downshift** (cheaper models as context grows), **filter-output** (redact secrets),
  **review** (diff/PR feedback), **permission** (read-only mode), **caveman** (brevity),
  **pi-mcp-adapter** (MCP bridge), grill-me, youtube-transcript.

**Gaps not well covered by anyone:** a **test/CI feedback loop**, **transparent persistent
memory**, **cross-session cost/budget governance**, and **secret-in-diff guarding**.

## 3. Candidate ideas

| # | Name | What it does | Leverage | Differentiation |
|---|------|--------------|----------|-----------------|
| 1 | **greenloop** (green-keeper) | After the agent stops, auto-run the project's tests/lint/typecheck/build; if red, feed failures straight back so it fixes them — loop until green | Correctness | Not covered by oh-my-pi or community; clean gap |
| 2 | **memory** | Transparent, agent-written `.md` memory files, auto-recalled via an index injected each turn (progressive disclosure, like skills) | Continuity across sessions/compaction | oh-my-pi's memory is opaque; this is git-diffable & user-editable |
| 3 | **meter** | Cumulative + cross-session spend tracking, budget alerts, auto-downshift over budget | Cost control | Combines tracking + downshift; stock `tps.ts` is per-turn only |
| 4 | **secretguard** | Block writes/commits that introduce secrets or PII (entropy + regex on diffs) | Safety | Nothing stock scans diffs for secrets |

### Detail

**#1 greenloop** — Targets the agent's single biggest correctness lever: *did the change
actually pass?* It automates run → read-failure → fix, the loop humans otherwise babysit.
Most differentiated and highest correctness impact. Main design risk: auto-running checks can
be slow/noisy/expensive → mitigated with debounce, scoping, iteration caps, and opt-in triggers.

**#2 memory** — Stock pi has no learned cross-session memory. A focused, transparent,
file-based memory (one fact per markdown file + an index) with automatic relevance-based recall.
Pairs naturally with #1 (e.g. remembering a project's check command).

**#3 meter** — Real spend/budget governance: per-session and cross-session cost, footer budget
gauge, alerts, and automatic model downshift when a budget threshold is crossed.

**#4 secretguard** — A `tool_call`/pre-commit guard that scans diffs for secrets/PII via entropy
+ rule packs and blocks or warns before they land.

## 4. Decision

**Build #1 first, as a standalone multi-surface app.** The same core engine is exposed as:

- a **CLI** (`greenloop check`, `greenloop watch`),
- an **MCP server** (`npx greenloop mcp`) usable by Claude, Cursor, and any MCP client,
- a **Claude / Cursor skill** (`skills/greenloop/SKILL.md`) that drives the CLI/MCP,
- a **pi extension** (`greenloop/pi`) using the native event bus for the closed fix-loop.

## 5. Roadmap

1. **greenloop** — the test/check feedback loop (in progress). See [docs/plan.md](docs/plan.md).
2. **memory** — transparent file-based memory module (reuse the same multi-surface shape).
3. **meter** — cost/budget governance.
4. **secretguard** — diff secret/PII guard.

Ideas 2–4 are designed to ship as additional modules/commands under the same umbrella so users
install one tool and opt into capabilities.
