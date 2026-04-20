# DS010 - IDE Global Chat Plugin

## Goal
Expose `webCli` as a persistent, workspace-level chat surface inside Explorer `#file-exp` through a global application plugin.

## Plugin Identity
- **Agent owner**: `webCli`
- **Plugin category**: `application`
- **Contribution type**: `mount`
- **Plugin type**: `global`
- **Host slot**: `file-exp:global`

## UX Contract
The plugin must render as a floating chat trigger visible on the right side of `#file-exp` at all times.

When the trigger is activated:
1. Open a full-screen chat panel.
2. Render a native chat UI (message list + composer) inside the plugin component (no iframe).
3. Show a header action that opens `/webchat?agent=webAdmin` in a separate page/tab.
4. Show an explicit close button (`X`) that hides the panel and keeps only the floating trigger visible.

## MCP Invocation Contract
- The plugin must call webCli through MCP endpoint `/mcps/webCli/mcp`.
- The plugin must use `MCPBrowserClient` (`/MCPBrowserClient.js`) as transport client.
- Tool invocation must target the configured MCP tool from `webCli/mcp-config.json`:
  - `name`: `web_cli_chat`
  - arguments: `{ message, sessionId?, json: true }`
- History hydration invocation must target:
  - `name`: `web_cli_history`
  - arguments: `{ sessionId }`
- The plugin must parse MCP tool text output and render `message` as assistant text.

## Persistence and Session Behavior
- The plugin loads `sessionId` from `sessionStorage` when present and reuses it for all chat turns in the tab.
- On first turn with no local `sessionId`, `web_cli_chat` generates server session identity and returns it; plugin must persist that returned `sessionId` in `sessionStorage`.
- Once persisted, the same `sessionId` is reused by the plugin for all next turns in the tab.
- On each subsequent turn, if `web_cli_chat` returns a `sessionId`, plugin updates local session state to that returned value.
- Conversation transcript UI state is in-memory and does not need localStorage persistence.
- Closing the panel must not destroy plugin component state.
- On plugin startup, call `web_cli_history` only if `sessionId` already exists in `sessionStorage`.

## Typing Feedback
- Immediately after submitting a message and until MCP response is received, the chat must show an assistant typing indicator with three animated dots.
- Dot animation pattern: sequential grow/shrink pulses (WhatsApp/Messenger style).
- Typing indicator must disappear on both success and error completion paths.

## Host Compatibility
- Explorer plugin discovery must accept application plugins with `type: "global"`.
- The host must mount `file-exp:global` independently from toolbar, right-bar, and internal slots.

## Operational Constraints
- The plugin must not mutate Explorer shell navigation or layout outside its host slot.
- Agent invocations are executed directly through MCP tool calls (not through `/webchat?agent=webCli`).
- The plugin must degrade gracefully if MCP endpoint `/mcps/webCli/mcp` or WebAdmin route `/webchat?agent=webAdmin` is temporarily unavailable.
