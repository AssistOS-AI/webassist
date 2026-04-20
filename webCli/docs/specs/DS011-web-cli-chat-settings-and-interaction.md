# DS011 - web-cli-chat settings and interaction contract

## Goal
Define, in full detail, what `webcli-settings` can configure and how each setting affects `web-cli-chat`, plus how users interact with `web-cli-chat` at runtime.

## Relevant files
- `webCli/IDE-plugins/web-cli-chat/webcli-settings/webcli-settings.html`
- `webCli/IDE-plugins/web-cli-chat/webcli-settings/webcli-settings.js`
- `webCli/IDE-plugins/web-cli-chat/web-cli-chat.html`
- `webCli/IDE-plugins/web-cli-chat/web-cli-chat.js`
- `webCli/IDE-plugins/web-cli-chat/config.json`

## Settings surface (`webcli-settings`)

### Available configuration fields
1. **Base URL** (`#webcliBaseUrl`)
   - Default value: `http://localhost:8080`
   - Normalization:
     - trims input,
     - if protocol is missing, prepends `https://`,
     - accepts only `http`/`https`,
     - stores only `origin` (`protocol + host + port`).
   - Validation effect:
     - if invalid/empty, generated embed URL is empty,
     - **Preview Chat** and **Copy iframe code** are disabled.

2. **Theme** (`#webcliTheme`)
   - Allowed values: `light`, `dark`
   - Default: `light`
   - On change, color fields are reset to theme defaults:
     - `light`: background `#f2f7ff`, user bubble `#1e293b`, agent bubble `#f8fbff`, header `#0f172a`
     - `dark`: background `#0f172a`, user bubble `#334155`, agent bubble `#1f2937`, header `#111827`

3. **Header Text** (`#webcliHeaderText`)
   - Default: `WebCli Assistant`
   - Max length: `100`
   - Empty/whitespace falls back to default when URL/snippet is generated.

4. **Chat Background** (`#webcliChatBackground`)
   - Type: hex color (`#RRGGBB`)
   - Invalid values are rejected and previous valid/default value is kept.

5. **User Bubble** (`#webcliUserBubble`)
   - Type: hex color (`#RRGGBB`)
   - Invalid values are rejected and previous valid/default value is kept.

6. **Agent Bubble** (`#webcliAgentBubble`)
   - Type: hex color (`#RRGGBB`)
   - Invalid values are rejected and previous valid/default value is kept.

7. **Header Color** (`#webcliHeaderColor`)
   - Type: hex color (`#RRGGBB`)
   - Invalid values are rejected and previous valid/default value is kept.

### Derived output from settings
- Embed URL format:
  - `{baseUrl}/webCli/IDE-plugins/web-cli-chat/web-cli-chat.html?{query}`
- Query parameters included:
  - `theme`
  - `headerText`
  - `chatBackground`
  - `userBubble`
  - `agentBubble`
  - `headerColor`
- Generated iframe snippet format:
  - `<iframe src="...">` with `title`, `loading="lazy"`, fixed style, `allow="clipboard-write"`.

### Settings actions
1. **Admin Webchat**
   - Opens `{baseUrl}/webchat?agent=webAdmin` in a new tab.
   - Requires valid Base URL.

2. **Preview Chat**
   - Opens generated embed URL in a new tab.
   - Requires valid Base URL.

3. **Copy iframe code**
   - Copies generated iframe snippet to clipboard.
   - Uses `navigator.clipboard.writeText` when available, else `execCommand('copy')`.
   - Requires valid Base URL.

### Status feedback messages
- Error (invalid base URL / missing snippet):
  - `Enter a valid Base URL first.`
- Success:
  - `Admin webchat opened in a new tab.`
  - `Preview opened in a new tab.`
  - `Iframe code copied to clipboard.`
- Copy failure:
  - `Failed to copy. Select snippet and copy manually.`

## `web-cli-chat` runtime behavior

### UI structure and interaction
- Surface has:
  - header (`#chatTitle`, `#chatSubtitle`),
  - messages container (`#chatMessages`),
  - typing indicator (`#typing`),
  - composer form (`#chatComposer`),
  - input (`#chatInput`),
  - send button (`#chatSend`).
- Input behavior:
  - `Enter` submits,
  - `Shift+Enter` keeps multiline input,
  - textarea auto-resizes up to `160px`.
- Pending state:
  - send button + input are disabled while request is in flight.

### Theme and visual configuration intake
- `web-cli-chat` reads URL query params and applies CSS custom properties:
  - `--chat-bg`, `--chat-user`, `--chat-agent`, `--chat-header`
- Header title source: `headerText` query param with fallback to `WebCli Assistant`.
- Subtitle source:
  - embed entrypoint: `Embedded preview`
  - plugin presenter mode: `Context-aware website chat`

### MCP interaction contract
- MCP client module: `/MCPBrowserClient.js`
- Endpoint: `/mcps/webCli/mcp`
- Tools:
  - `web_cli_chat` with `{ message, sessionId?, json: true }`
  - `web_cli_history` with `{ sessionId }`
- Chat response parsing:
  - accepts plain JSON or JSON wrapped in text,
  - extracts assistant text from `message`/`response`/raw output,
  - strips CLI noise lines (`Session ID`, `Type exit...`, `you>` prompts).

### Session and history behavior
- Session storage keys:
  - embed mode default: `webcli-global-chat:embedSessionId`
  - presenter mode default: `webcli-global-chat:tabSessionId`
- On successful chat response:
  - if tool returns `sessionId`, it is persisted to `sessionStorage`.
- On startup:
  - if a stored `sessionId` exists, `web_cli_history` is called once to hydrate prior messages.
  - hydration is skipped if conversation messages already exist in the DOM.
- On unload:
  - MCP client is closed.

### Message rendering rules
- User and agent messages are appended as `.chat-message.user` / `.chat-message.agent`.
- Message content is rendered as text (`textContent`), not HTML.
- Typing indicator is appended/removed around async chat calls.
- Errors are shown as agent messages:
  - chat call: `Error: ...`
  - history load: `Error loading history: ...`

## Plugin-level integration (`config.json`)
- `id`: `webcli-chat`
- `component`: `web-cli-chat`
- `presenter`: `WebCliChat`
- `type`: `global`
- `settings`: `webcli-settings`
- `autoPin`: `false`
- `location`: `[]`

This means the same runtime file (`web-cli-chat.js`) supports:
- standalone embed page usage (`web-cli-chat.html`), and
- presenter lifecycle usage (`WebCliChat` class).
