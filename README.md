# pi-green-loop

**Keep the build green.** An autonomous test / lint / typecheck / build feedback loop for AI
coding agents. After code changes, pi-green-loop runs your project's checks and — when something is
red — hands a parsed failure summary back to the agent so it fixes it, looping until green.

Built to *just work* and stay fast:

- **Polyglot detection** — Node (`package.json`), Python (`pyproject.toml`), Go (`go.mod`),
  Rust (`Cargo.toml`), and `Makefile`, out of the box. No config required.
- **Affected-test scoping** — runs only the tests impacted by the files that changed
  (vitest / jest / pytest / go), so the loop stays fast on big suites.
- **Parsed failures** — feeds the agent a compact list of failing test names, not a raw dump.
- **Reliable loop** — debounced, capped, stops when it stops improving, and skips runs when
  nothing changed.

One core engine, four ways to run it:

| Surface | How |
|---------|-----|
| **CLI** | `npx pi-green-loop check` · `pi-green-loop fix` · `pi-green-loop watch` |
| **MCP server** | `npx pi-green-loop mcp` (use from Claude, Cursor, any MCP client) |
| **Claude / Cursor skill** | drop [`skills/pi-green-loop`](skills/pi-green-loop/SKILL.md) into your skills dir |
| **pi extension** | `import piGreenLoop from "pi-green-loop/pi"` — closed loop on the pi event bus |

The core engine is dependency-free (Node built-ins only); the CLI, MCP server, and pi extension all
sit on top of it.

## Install into pi

```bash
pi install git:github.com/vaibhav-patel/pi-green-loop   # extension (agent_end loop + /green) and skill
# once published to npm:
pi install npm:pi-green-loop
```

`import … from "pi-green-loop/pi"` is for embedding in your own SDK app — pi users should `pi install` instead.

## Quick start

```bash
npm install
npm run build

# what would run?
node dist/cli/index.js detect      # (or: npm run dev -- detect)

# run the checks once
node dist/cli/index.js check
```

## How it decides what to run

1. A `pi-green-loop.json` (or `.pi-green-loop.json`) in the project root, if present, wins.
2. Otherwise it auto-detects per ecosystem (first match per kind, polyglot repos supported):

   | Ecosystem | Detected from | Checks |
   |-----------|---------------|--------|
   | **Node** | `package.json` scripts | `typecheck` / `lint` / `test` / `build` (npm/pnpm/yarn/bun) |
   | **Python** | `pyproject.toml` etc. | `pytest`, `ruff check .`, `mypy .` |
   | **Go** | `go.mod` | `go test ./...`, `go vet ./...`, `golangci-lint run`, `go build ./...` |
   | **Rust** | `Cargo.toml` | `cargo test`, `cargo clippy`, `cargo check`, `cargo build` |
   | **Make** | `Makefile` | `make <test\|lint\|build>` (lowest priority) |

Generate a starter config (add `--ci` to also write a GitHub Actions workflow):

```bash
node dist/cli/index.js init --ci
```

```jsonc
// pi-green-loop.json
{
  "timeoutMs": 300000,
  "checks": [
    { "name": "typecheck", "kind": "typecheck", "command": "npm run typecheck" },
    { "name": "test",      "kind": "test",      "command": "npm test" }
  ]
}
```

## Fast & focused

Scope a run to just the tests affected by what changed:

```bash
node dist/cli/index.js check --since HEAD~1          # tests touching files changed since a git ref
node dist/cli/index.js check --affected src/a.ts,src/b.ts
```

When scoping isn't possible (no git, unknown framework, empty set) it safely falls back to the full
suite — it never reports a false pass by running zero tests. `watch` accumulates changed files and
scopes each re-run automatically.

Run formatters / autofixers, then re-check:

```bash
node dist/cli/index.js fix    # prettier/eslint --fix, ruff format/--fix, gofmt, cargo fmt (only what's detected)
```

`fix` never installs anything — it only runs a tool when there's evidence it's already available
(a dependency or its config file).

## The loop (pi extension)

The pi adapter listens for `agent_end` and, once the agent is idle, runs the checks scoped to the
files it just edited. On failure it injects a parsed failure summary back as a follow-up so the
agent fixes it. The loop is guarded:

- **Debounced** — only runs when idle with no queued messages.
- **Capped** — at most `maxAttempts` (default 3) auto-fixes per interactive turn.
- **Stops when stuck** — if a run reproduces the exact same failures, it pauses instead of looping
  (`/green` resumes it).
- **Skips redundant runs** — caches the last all-green commit and skips when `HEAD` is unchanged and
  nothing was edited.
- **Status gauge** — a footer status plus a widget listing the currently-failing checks.

`/green` runs the checks now; `/green on` · `/green off` toggle the auto-fix loop.

## Development

```bash
npm install
npm run build      # tsc -> dist/
npm test           # node --test suite
npm run typecheck  # tsc --noEmit
```

pi-green-loop checks itself: `node dist/cli/index.js check` runs its own typecheck + test + build.

## License

MIT — see [LICENSE](LICENSE).
