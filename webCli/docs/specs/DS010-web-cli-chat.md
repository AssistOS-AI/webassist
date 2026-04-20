# DS010 - web-cli-chat

## Goal
Define the active plugin contract for the Web CLI chat integration.

## Plugin Identity
- **Plugin folder**: `webCli/IDE-plugins/web-cli-chat/`
- **Config id**: `webcli-chat`
- **Component**: `web-cli-chat`
- **Presenter**: `WebCliChat`
- **Type**: `global`
- **Settings component**: `webcli-settings`

## Runtime Surface
- Chat UI is served through:
  - `web-cli-chat.html`
  - `web-cli-chat.css`
  - `web-cli-chat.js`
- Settings generates Preview and iframe snippets targeting `web-cli-chat.html`.

## Runtime Contract
- MCP endpoint: `/mcps/webCli/mcp`
- Tools:
  - `web_cli_chat` with `{ message, sessionId?, json: true }`
  - `web_cli_history` with `{ sessionId }`
- `web-cli-chat.js` handles:
  - message parsing/sanitization,
  - session persistence,
  - history hydration,
  - typing/send UI behavior.
