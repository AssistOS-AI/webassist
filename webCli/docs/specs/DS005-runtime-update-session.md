# DS005 - Runtime Module: update-session

## Goal
Persist the current visitor turn after orchestration completes, so session state is written in one deterministic runtime step.

## Mechanism
`webCli/src/runtime/update-session.mjs` runs after `RecursiveSkilledAgent.executePrompt(...)` returns a valid payload.

## Module Contract
- **Name**: `update-session`
- **Input**:
  - `sessionId` (string, required)
  - `userMessage` (string, required, English)
  - `agentResponse` (string, required, English)
  - `profiles` (string[])
  - `profileDetails` (string[])
  - `dataDir` (string, required)
- **Output**:
  - `success` (boolean)
  - `sessionId` (string)
  - `sessionPath` (string)
  - `session` (object)

## Execution Logic
1. Read existing `data/sessions/{sessionId}.md` if present.
2. Merge and de-duplicate `profiles` and `profileDetails`.
3. Append current user/agent history entries.
4. Render and write session markdown using DS001 structure.
