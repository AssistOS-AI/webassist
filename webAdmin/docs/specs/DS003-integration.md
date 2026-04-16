# DS003 - webAdmin Integration and Loading

The **webAdmin** agent is implemented as a Node.js CLI tool for site owners. It operates in interactive mode only.

## Runtime Launcher: web-admin
- **Script Path**: `webAdmin/src/index.mjs`
- **Type**: Node.js launcher script.
- **Purpose**: Provide a long-running interactive CLI that executes owner requests turn by turn.

## Ploinky Agent Integration
- **Manifest File**: `webAdmin/manifest.json`
- **Purpose**: Declares runtime integration metadata so `webAdmin` can be executed as a Ploinky agent.
- **Environment Contract** (`profiles.default.env`):
  - `SOUL_GATEWAY_API_KEY`: API key used for LLM calls through AchillesAgentLib.
  - `ACHILLES_DEBUG`: Enables AchillesAgentLib debug logging.
- **Webchat Access**: `/webchat?agent=webAdmin`

## CLI Parameters
- `<message>` (positional): Owner message text. In interactive mode it can be omitted at startup and provided turn-by-turn.
- `--session-id <id>` / `--session-id=<id>`: Reuse a specific session id for the interactive process.
- `--data-dir <dir>` / `--data-dir=<dir>`: Override the runtime data directory used for `config/`, `info/`, `profilesInfo/`, `leads/`, and `sessions/`.
- `--agent-root <dir>` / `--agent-root=<dir>`: Override the agent root used by runtime initialization.
  - This changes where default `webassist-shared/data` is resolved when `--data-dir` is not provided.
  - This changes the runtime root used for agent initialization and runtime file paths.
- `-h` / `--help`: Print CLI usage and exit.
- `--`: Stop option parsing and treat all remaining arguments as positional message text.

## Runtime Mode
### Interactive Mode (default)
- **Behavior**: Starts a chat loop in terminal and keeps the process alive across multiple owner turns.
- **Session Handling**: A sessionId is generated at startup (or provided via `--session-id`) and reused for all turns.
- **Exit Controls**: The interactive loop allows exiting by typing `exit`/`quit`/`:q` or by pressing `Ctrl+C`.
- **Example**: `node webAdmin/src/index.mjs "Arata ultimele leaduri"`

## Library: AchillesAgentLib
- **Mandatory Usage**: Access to LLMs must be through this library.
- **Import Mechanism**: The runtime imports AchillesAgentLib directly from resolved `node_modules`.
- **Loading Logic**:
  - Use direct import syntax: `import { RecursiveSkilledAgent, MarkdownDataStore } from "achillesAgentLib";`.
  - Do not use filesystem scanning loaders for webAdmin Achilles resolution.

## Base Agent: RecursiveSkilledAgent
- **Functionality**: The runtime uses a single `RecursiveSkilledAgent` instance (composition) to manage discovery and execution.

## Skills Discovery and Orchestration
- webAdmin skills under `webAdmin/skills/` are implemented as Achilles **cskills**.
- webAdmin includes one Achilles **oskill** (`admin-flow`) that orchestrates each turn.
- At startup, `RecursiveSkilledAgent` is initialized with `startDir = webAdmin/` and discovers skills from `webAdmin/skills/`.
- Skill discovery for webAdmin runtime must use `searchUpwards: false`.
- During runtime, webAdmin calls `RecursiveSkilledAgent.executePrompt(...)` without explicit skill name.
- `RecursiveSkilledAgent` selects `admin-flow`, and that orchestrator invokes cskills as needed.
- `admin-flow` returns a **plain text** owner-facing response string (no JSON).
- The sessionId is forwarded to `RecursiveSkilledAgent` to isolate multi-user sessions in shared instances.
- Runtime data access is centralized through `webAdmin/src/runtime/dataStore.mjs`.
- The datastore is configured exactly once when `createWebAdminAgent(...)` is initialized (default `webassist-shared/data`, or CLI `--data-dir` override).
- Runtime modules and skills only consume the configured datastore instance and must not accept per-call datastore overrides.
- Datastore folder names and section labels are centralized in `webAdmin/src/constants/datastore.mjs` and must be reused across runtime/skills (no hardcoded folder/section literals in business logic).
- Markdown parsing/rendering and section normalization rules (including `*None*` fallback for empty section content) are handled by Achilles `MarkdownDataStore`, not by agent datastore modules.

## CLI Delegation Flow
- The Node.js launcher `webAdmin/src/index.mjs` initializes `WebAdminAgent` and executes conversation turns.
- `WebAdminAgent` initializes one `RecursiveSkilledAgent` instance and delegates each turn through `executePrompt(...)`.
- In interactive mode, the launcher calls the runtime repeatedly (one call per turn).
- The runtime expects the orchestrator to return a non-empty response string for each turn.

## Communication Language
- **Input/Output**: Communication with the owner can be in any language.
- **Data Storage**: All file-based information (specs, session details, leads) must be stored in **English**.
