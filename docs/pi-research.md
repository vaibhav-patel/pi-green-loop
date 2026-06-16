# pi extension API — distilled reference

Condensed notes from studying `earendil-works/pi` (the harness greenloop's pi adapter targets).

## Extension shape

```ts
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
export default function (pi: ExtensionAPI): void | Promise<void> { /* register here */ }
```

Discovered from `~/.pi/agent/extensions/`, project `.pi/extensions/`, npm/git packages, or `-e`.

## Key API surface (what greenloop/pi uses)

- **Events** — `pi.on(event, (ev, ctx) => …)`. Relevant ones:
  - `agent_end` — agent loop finished (our primary trigger).
  - `tool_result` / `tool_execution_end` — detect file changes (`isEditToolResult`, `isWriteToolResult`).
  - `input` — detect a fresh user turn (reset the auto-fix counter).
  - `tool_call` — blockable (`return { block: true, reason }`).
  - `session_start` / `session_shutdown`, `before_agent_start` (mutate system prompt),
    `context` (mutate messages), `session_before_compact`.
- **Tools** — `pi.registerTool({ name, description, parameters /* TypeBox */, execute })`.
- **Commands** — `pi.registerCommand(name, { description, handler(args, ctx) })`.
- **Shortcuts** — `pi.registerShortcut("ctrl+g", { handler })`.
- **Messaging** — `pi.sendUserMessage(text, { deliverAs: "steer" | "followUp" })`,
  `pi.sendMessage({ customType, content, display, details }, { triggerTurn, deliverAs })`.
- **Exec** — `pi.exec(cmd, args, { cwd, timeout, signal })`.
- **UI** (`ctx.ui`) — `setStatus(key, text)`, `setFooter`, `setWidget`, `notify`, `confirm`,
  `select`, `setWorkingMessage`, `theme`.
- **Context** (`ctx`) — `cwd`, `mode` ("tui"|"rpc"|"json"|"print"), `isIdle()`,
  `isProjectTrusted()`, `signal`, `sessionManager` (read-only), `getContextUsage()`.

## Packaging

A pi package is a bundle with convention dirs (`extensions/ skills/ prompts/ themes/`) or a
`pi` field in `package.json`. Core pi packages go in `peerDependencies` (`"*"`), not bundled.
Install: `pi install npm:… | git:… | ./path`; ephemeral: `pi -e …`.

## Constraints (pi's own rules, mirrored where sensible)

- Top-level imports only (no inline `await import()` in pi-checked code).
- Truncate large tool output; throw to signal tool error.
- Respect project trust before side effects.
