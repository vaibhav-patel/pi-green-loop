---
name: pi-green-loop
description: Verify code changes by running the project's checks (typecheck, lint, tests, build) and fixing failures until everything passes. Use this after editing code, before reporting a task as done.
---

# pi-green-loop

Keep the build green: after making code changes, run the project's checks and fix anything red
before you consider the work finished.

## Workflow

1. **Run the checks.**
   - If the pi-green-loop MCP server is connected, call the `run_checks` tool.
   - Otherwise run it from the shell: `npx pi-green-loop check` (use `--feedback` to get failure
     text optimized for fixing).
   - To see what will run first: `npx pi-green-loop detect`.
   - On a big suite, scope to what you changed: `npx pi-green-loop check --since HEAD` (or
     `--affected file1,file2`). With the MCP server, pass `affectedFiles` / `since` to `run_checks`.

2. **If everything passes**, you're done — say so.

3. **If something fails**, read the failing output, find the *root cause*, fix it, and run the
   checks again. Repeat until green. For pure formatting/style failures, `npx pi-green-loop fix`
   runs the project's formatters (prettier/eslint, ruff, gofmt, cargo fmt) and re-checks.

## Rules

- Do **not** make checks pass by skipping, deleting, weakening, or `.only`/`.skip`-ing tests,
  loosening lint rules, or adding `// @ts-ignore` unless the user explicitly asks.
- Fix the underlying code, not the check.
- If a check is genuinely misconfigured or a failure is pre-existing and unrelated to your
  change, stop and tell the user instead of silently working around it.
- Keep iterating only while you are making progress; if you get stuck after a few attempts,
  summarize what's failing and ask for guidance.

## Configuration

pi-green-loop auto-detects checks per ecosystem — Node (`package.json` scripts), Python
(`pyproject.toml` → pytest/ruff/mypy), Go (`go.mod` → go test/vet/build), Rust (`Cargo.toml` →
cargo test/clippy/check), and `Makefile` targets. To pin exact commands, add a `pi-green-loop.json`:

```json
{
  "checks": [
    { "name": "typecheck", "kind": "typecheck", "command": "npm run typecheck" },
    { "name": "test", "kind": "test", "command": "npm test" }
  ]
}
```
