# DS003 - webCli Integration and Loading

The **webCli** agent is implemented as a Node.js CLI tool with a single `sessionId`.

## Runtime Launcher: web-cli
- **Script Path**: `webCli/src/index.mjs`
- **Type**: Node.js launcher script.
- **Purpose**: Provide a user-friendly CLI entrypoint for interactive and MCP single-shot execution.

## Ploinky Agent Integration
- **Manifest File**: `webCli/manifest.json`
- **Purpose**: Declares runtime integration metadata so `webCli` can be executed as a Ploinky agent.
- **Environment Contract** (`profiles.default.env`):
  - `SOUL_GATEWAY_API_KEY`: API key used for LLM calls through AchillesAgentLib.
  - `ACHILLES_DEBUG`: Enables AchillesAgentLib debug logging.

## MCP Contract Integration
- **Configuration File**: `webCli/mcp-config.json`
- **Tool Entry**: `web_cli_chat`
- **Command Target**: `/code/src/index.mjs`
- **Container Path Note**: Ploinky mounts agent code at `/code` inside the runtime container, so repo path `webCli/src/index.mjs` maps to container path `/code/src/index.mjs` for MCP execution.
- **Execution Mode**: MCP requests are routed as single-shot invocations equivalent to CLI `-mcp` behavior.
- **Input Parameters**: MCP input schema mirrors CLI runtime parameters:
  - `message` ↔ positional `<message>`
  - `sessionId` ↔ `--session-id`
  - `json` ↔ `--json`
  - `dataDir` ↔ `--data-dir`
  - `agentRoot` ↔ `--agent-root`

## CLI Parameters
- `<message>` (positional): User message text. In interactive mode it can be omitted at startup and provided turn-by-turn.
- `-mcp`: Run single-shot mode (one request, then exit).
- `--session-id <id>` / `--session-id=<id>`: Reuse a specific session id.
- `--json`: Print JSON output from runtime instead of plain text response.
- `--data-dir <dir>` / `--data-dir=<dir>`: Override the runtime data directory used for `config/`, `info/`, `profilesInfo/`, `leads/`, and `sessions/`.
- `--agent-root <dir>` / `--agent-root=<dir>`: Override the agent root used by runtime initialization.
  - This changes where default `<repo>/data` is resolved when `--data-dir` is not provided.
  - This changes the runtime root used for agent initialization and runtime file paths.
- `-h` / `--help`: Print CLI usage and exit.
- `--`: Stop option parsing and treat all remaining arguments as positional message text.

MCP input note:
- In `-mcp` mode, if `<message>` is omitted and stdin is piped, the launcher reads the message from stdin.

## Runtime Modes
### 1) Interactive Mode (default)
- **Behavior**: Starts a chat loop in terminal and keeps the process alive across multiple user turns.
- **Session Handling**:
  - If `--session-id` is provided, it must be reused for all turns in that process.
  - If `--session-id` is missing, `web-cli` must generate one automatically and reuse it for the whole interactive session.
- **Persistence**: Every turn updates two files:
  - `{resolvedDataDir}/sessions/{sessionId}-profile.md`
  - `{resolvedDataDir}/sessions/{sessionId}-history.md`
- **Exit Controls**: The interactive loop must allow exiting by typing `exit` or by pressing `Ctrl+C`.
- **Example**: `node webCli/src/index.mjs "Hello I'm interested in your API"`

### 2) MCP Mode (`-mcp` flag)
- **Behavior**: Executes exactly one user request and then exits.
- **Session Handling**:
  - Accepts optional `--session-id`.
  - If missing, `web-cli` must generate one automatically for that single call.
- **Additional Parameters**: Supports optional `--data-dir` and `--agent-root` with the same semantics as interactive mode.
- **Process Lifecycle**: After returning the response, all spawned subprocesses must terminate and control returns to the caller.
- **Example**: `node webCli/src/index.mjs -mcp "Hello I'm interested in your API"`

## Library: AchillesAgentLib
- **Mandatory Usage**: Access to LLMs must be through this library.
- **Import Mechanism**: The runtime imports AchillesAgentLib directly from resolved `node_modules`.
- **Loading Logic**:
  - Use direct import syntax: `import { RecursiveSkilledAgent, MarkdownDataStore } from "achillesAgentLib";`.
  - Do not use filesystem scanning loaders for webCli Achilles resolution.

## Base Class: RecursiveSkilledAgent
- **Functionality**: The runtime uses a single `RecursiveSkilledAgent` instance (composition) to manage discovery and execution.

## cskill Discovery and Execution
- webCli skills under `webCli/skills/` are implemented as Achilles **cskills**.
- webCli includes one Achilles **oskill** (`visitor-flow`) that orchestrates the turn.
- At startup, `RecursiveSkilledAgent` is initialized with `startDir = webCli/` and discovers cskills from `webCli/skills/`.
- Skill discovery for webCli runtime must use `searchUpwards: false`.
- During runtime, webCli calls `RecursiveSkilledAgent.executePrompt(...)` without explicit skill name.
- `RecursiveSkilledAgent` selects `visitor-flow`, and that orchestrator invokes cskills as needed.
- `visitor-flow` encapsulates former decision/final-response/history-translation prompt rules as orchestrator instructions.

## Runtime Pre/Post Modules
- Before orchestration, webCli runs runtime module `load-context` from `webCli/src/runtime/load-context.mjs`.
- The loaded context is embedded in the orchestration prompt and forwarded in execution context.
- After orchestration returns, webCli runs runtime module `update-session` from `webCli/src/runtime/update-session.mjs`.
- Session persistence is therefore explicit runtime behavior, not a cskill invocation.
- Runtime data access is centralized through `webCli/src/runtime/dataStore.mjs`.
- The datastore is configured exactly once when `createWebCliAgent(...)` is initialized (default `<repo>/data`, or CLI `--data-dir` override).
- Runtime modules and skills only consume the configured datastore instance and must not accept per-call datastore overrides.
- Datastore names and section labels are centralized in `webCli/src/constants/datastore.mjs` and must be reused across runtime/skills (no hardcoded folder/section literals in business logic).
- Markdown parsing/rendering and section normalization rules (including `*None*` fallback for empty section content) are handled by Achilles `MarkdownDataStore`, not by agent datastore modules.

## CLI Delegation Flow
- The Node.js launcher `webCli/src/index.mjs` initializes `WebCliAgent` and executes conversation turns.
- `WebCliAgent` initializes one `RecursiveSkilledAgent` instance and delegates each turn through `executePrompt(...)`.
- In interactive mode, the launcher calls the runtime repeatedly (one call per turn) while preserving the same `sessionId`.
- In MCP mode, the launcher performs a single runtime call and exits.
- The sessionId is forwarded to `RecursiveSkilledAgent` to isolate multi-user sessions in a shared agent instance.

## Communication Language
- **Input/Output**: Communication with the visitor can be in any language.
- **Data Storage**: All file-based information (specs, session details, leads) must be stored in **English**.
