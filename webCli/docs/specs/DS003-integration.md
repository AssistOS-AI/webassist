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
- **Command Target**: `webCli/src/index.mjs`
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
  - This changes where default `data/` is resolved when `--data-dir` is not provided.
  - This also changes where Achilles loader resolution starts (library lookup remains in the parent directory of the effective agent root).
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
- **Persistence**: Every turn must be written to `data/sessions/{sessionId}.md` through existing skills.
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
- **Loader Mechanism**: The agent's loader must check for the existence of `AchillesAgentLib` or `achillesAgentLib` in the parent directory.
- **Loading Logic**:
  - Scan `../` for `AchillesAgentLib` or `achillesAgentLib`.
  - Dynamically load the library if found.

## Base Class: RecursiveSkilledAgent
- **Functionality**: The agent extends or uses `RecursiveSkilledAgent` to manage the conversation loop and skill execution.

## CLI Delegation Flow
- The Node.js launcher `webCli/src/index.mjs` initializes `WebCliAgent` and executes conversation turns.
- In interactive mode, the launcher calls the runtime repeatedly (one call per turn) while preserving the same `sessionId`.
- In MCP mode, the launcher performs a single runtime call and exits.

## Communication Language
- **Input/Output**: Communication with the visitor can be in any language.
- **Data Storage**: All file-based information (specs, session details, leads) must be stored in **English**.
