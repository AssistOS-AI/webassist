# DS008 - webCli Testing

## Goal
To define the current automated test coverage for `webCli`, including the behavior verified by each test file and the runtime guarantees those tests protect.

## Test Runner
- **Command**: `node --test "webCli/tests/*.test.mjs"`
- **Folder Runner Script**: `node webCli/tests/runAll.mjs`
- **Scope**: Unit and integration-style tests for skill handlers, agent flow, and CLI MCP-mode behavior.

### runAll Behavior (`tests/runAll.mjs`)
- Discovers test files only in the current `webCli/tests/` folder.
- Includes `.js` and `.mjs` files.
- Excludes `helpers.mjs` and `runAll.mjs`.
- Executes discovered files through Node.js test runner (`node --test ...`).

## Test Suites and Covered Cases

### 1) `agent.test.mjs`
- Verifies end-to-end visitor turn handling through `createWebCliAgent(...).handleMessage(...)`.
- Confirms Achilles library import from `node_modules` via `achillesAgentLib` package resolution.
- Confirms decision/final response/history-translation prompt flow and call order.
- Verifies lead persistence and session persistence with expected markdown sections and content.

### 2) `respondRequest.test.mjs`
- Verifies loading of `info/` and `profilesInfo/` markdown context.
- Verifies session state parsing for existing and new sessions.
- Verifies normalized context payload structure returned to the runtime.

### 3) `updateSession.test.mjs`
- Verifies creation of a session file when absent.
- Verifies appending `User` and `Agent` history entries in order.
- Verifies profile and profile-details list updates with de-duplication.
- Verifies markdown structure compliance with DS001 headings.

### 4) `createLead.test.mjs`
- Verifies deterministic lead filename generation from `sessionId`.
- Verifies lead file creation with required fields (`Status`, `Profile`, `Session ID`, contact info, summary).
- Verifies update-in-place behavior when the same lead already exists.
- Verifies lifecycle field behavior (`createdAt` retained, `updatedAt` refreshed).

### 5) `bookMeeting.test.mjs`
- Verifies successful config aggregation from `data/config/`.
- Verifies error behavior when no configuration is available.
- Verifies output contract used by the runtime response phase.

### 6) `mcpMode.test.mjs`
- Verifies `-h` usage output.
- Verifies `-mcp` execution with explicit `--session-id`.
- Verifies `-mcp` execution without `--session-id` (auto-generated session id).
- Verifies `--json` and non-JSON output variants.
- Verifies default data path persistence and `--data-dir` override persistence.
- Verifies `--agent-root` override behavior and default data placement under the overridden root.
- Verifies `--` separator support for positional message parsing.

## Fixture Strategy
- Tests use isolated sandbox data directories and fixture markdown seed content.
- AchillesAgentLib is expected to be available via `node_modules` package resolution during test execution.
- Tests must not require external network calls or provider credentials.
