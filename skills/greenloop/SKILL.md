---
name: greenloop
description: Verify code changes by running the project's checks (typecheck, lint, tests, build) and fixing failures until everything passes. Use this after editing code, before reporting a task as done.
---

# greenloop

Keep the build green: after making code changes, run the project's checks and fix anything red
before you consider the work finished.

## Workflow

1. **Run the checks.**
   - If the greenloop MCP server is connected, call the `run_checks` tool.
   - Otherwise run it from the shell: `npx greenloop check` (use `--feedback` to get failure
     text optimized for fixing).
   - To see what will run first: `npx greenloop detect`.

2. **If everything passes**, you're done — say so.

3. **If something fails**, read the failing output, find the *root cause*, fix it, and run the
   checks again. Repeat until green.

## Rules

- Do **not** make checks pass by skipping, deleting, weakening, or `.only`/`.skip`-ing tests,
  loosening lint rules, or adding `// @ts-ignore` unless the user explicitly asks.
- Fix the underlying code, not the check.
- If a check is genuinely misconfigured or a failure is pre-existing and unrelated to your
  change, stop and tell the user instead of silently working around it.
- Keep iterating only while you are making progress; if you get stuck after a few attempts,
  summarize what's failing and ask for guidance.

## Configuration

greenloop auto-detects checks from `package.json` scripts (`typecheck`, `lint`, `test`,
`build`). To pin exact commands, add a `greenloop.json`:

```json
{
  "checks": [
    { "name": "typecheck", "kind": "typecheck", "command": "npm run typecheck" },
    { "name": "test", "kind": "test", "command": "npm test" }
  ]
}
```
