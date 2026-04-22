# DS005 - Runtime Module: update-session

## Goal
Persist the current visitor turn after orchestration completes, so session state is written in one deterministic runtime step.

## Mechanism
`webAssist/src/runtime/update-session.mjs` runs after `RecursiveSkilledAgent.executePrompt(...)` returns a valid payload.

## Module Contract
- **Name**: `update-session`
- **Input**:
  - `sessionId` (string, required)
  - `userMessage` (string, required, English)
  - `agentResponse` (string, required, English)
  - `profiles` (string[])
  - `profileDetails` (string[])
  - `contactInformation` (object)
- **Output**:
  - `success` (boolean)
  - `sessionId` (string)
  - `sessionProfilePath` (string)
  - `sessionHistoryPath` (string)
  - `session` (object)

## Execution Logic
1. Read existing `data/sessions/{sessionId}-history.md` if present.
2. Merge and de-duplicate `profiles` and `profileDetails`.
3. Merge existing and incoming `contactInformation` key-value fields (incoming values override same keys).
4. Write profile state to `data/sessions/{sessionId}-profile.md` including `Contact Information` section.
5. Append current user/agent history entries to `data/sessions/{sessionId}-history.md`.

## Continuity Invariant
- `update-session` persists `profileDetails` exactly as provided by orchestrator payload (after de-duplication).
- `update-session` persists `contactInformation` as structured key-value session memory.
- Runtime keeps history persisted on disk but does not depend on history loading for conversational continuity.
- Conversational continuity is encoded in `Profile Details` by orchestrator instructions.

## Datastore Source
- `update-session` uses the datastore singleton configured at agent startup.
- It does not accept runtime `dataDir` overrides.
