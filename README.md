# greenloop

**Keep the build green.** An autonomous test / lint / typecheck / build feedback loop for AI
coding agents. After code changes, greenloop runs your project's checks and — when something is
red — hands the failing output back to the agent so it fixes it, looping until green.

One core engine, four ways to run it:

| Surface | How |
|---------|-----|
| **CLI** | `npx greenloop check` · `greenloop watch` |
| **MCP server** | `npx greenloop mcp` (use from Claude, Cursor, any MCP client) |
| **Claude / Cursor skill** | drop [`skills/greenloop`](skills/greenloop/SKILL.md) into your skills dir |
| **pi extension** | `import greenloop from "greenloop/pi"` — closed loop on the pi event bus |

> Status: early scaffold (M1). Core check detection + runner + CLI are in place; MCP and pi
> adapters are wired and being hardened. See [docs/plan.md](docs/plan.md) and [IDEAS.md](IDEAS.md).

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

1. A `greenloop.json` (or `.greenloop.json`) in the project root, if present, wins.
2. Otherwise it reads `package.json` scripts and picks up `typecheck`, `lint`, `test`, `build`
   (with npm/pnpm/yarn/bun auto-detected).

Generate a starter config from what's detected:

```bash
node dist/cli/index.js init
```

```jsonc
// greenloop.json
{
  "timeoutMs": 300000,
  "checks": [
    { "name": "typecheck", "kind": "typecheck", "command": "npm run typecheck" },
    { "name": "test",      "kind": "test",      "command": "npm test" }
  ]
}
```

## The loop (pi extension)

The pi adapter listens for `agent_end`, runs the checks, and on failure injects the failing
output back as a follow-up so the agent fixes it — capped by `maxAttempts` to avoid runaway loops.

## License

MIT — see [LICENSE](LICENSE).
