# DS003 - webCli Integration and Loading

The **webCli** agent is implemented as a Node.js CLI tool with a single `sessionId`.

## Runtime Launcher: web-cli
- **Script Path**: `webCli/bin/web-cli`
- **Type**: Bash launcher script.
- **Purpose**: Provide a user-friendly CLI entrypoint that orchestrates the Node.js runtime (`src/index.mjs`).

## Runtime Modes
### 1) Interactive Mode (default)
- **Behavior**: Starts a chat loop in terminal and keeps the process alive across multiple user turns.
- **Session Handling**:
  - If `--session-id` is provided, it must be reused for all turns in that process.
  - If `--session-id` is missing, `web-cli` must generate one automatically and reuse it for the whole interactive session.
- **Persistence**: Every turn must be written to `data/sessions/{sessionId}.md` through existing skills.
- **Exit Controls**: The interactive loop must allow exiting by typing `exit` or by pressing `Ctrl+C`.
- **Example**: `web-cli "Hello I'm interested in your API"`

### 2) MCP Mode (`-mcp` flag)
- **Behavior**: Executes exactly one user request and then exits.
- **Session Handling**:
  - Accepts optional `--session-id`.
  - If missing, `web-cli` must generate one automatically for that single call.
- **Process Lifecycle**: After returning the response, all spawned subprocesses must terminate and control returns to the caller.
- **Example**: `web-cli -mcp "Hello I'm interested in your API"`

## Library: AchillesAgentLib
- **Mandatory Usage**: Access to LLMs must be through this library.
- **Loader Mechanism**: The agent's loader must check for the existence of `AchillesAgentLib` or `achillesAgentLib` in the parent directory.
- **Loading Logic**:
  - Scan `../` for `AchillesAgentLib` or `achillesAgentLib`.
  - Dynamically load the library if found.

## Base Class: RecursiveSkilledAgent
- **Functionality**: The agent extends or uses `RecursiveSkilledAgent` to manage the conversation loop and skill execution.

## CLI Delegation Flow
- The Bash launcher `web-cli` delegates execution to `webCli/src/index.mjs`.
- In interactive mode, the launcher calls the runtime repeatedly (one call per turn) while preserving the same `sessionId`.
- In MCP mode, the launcher performs a single runtime call and exits.

## Communication Language
- **Input/Output**: Communication with the visitor can be in any language.
- **Data Storage**: All file-based information (specs, session details, leads) must be stored in **English**.
