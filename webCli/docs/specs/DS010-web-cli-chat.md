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
- Iframe UX is launcher-based:
  - initial state is closed (chat icon visible),
  - click icon opens chat panel,
  - close button (`X`) in header closes panel.

## Runtime Contract
- MCP endpoint: `/mcps/webCli/mcp` (always; no token-based routing)
- Tools:
  - `web_cli_chat` with `{ message, sessionId?, json: true }`
  - `web_cli_history` with `{ sessionId }`
- `web-cli-chat.js` handles:
  - message parsing/sanitization,
  - session persistence,
  - history hydration,
  - typing/send UI behavior.

## MCP Client
- Client module: `/MCPBrowserClient.js`
- Loaded dynamically via `import()`
- Calls `callTool()` for chat and history operations
- Parses tool responses to extract response text and sessionId
