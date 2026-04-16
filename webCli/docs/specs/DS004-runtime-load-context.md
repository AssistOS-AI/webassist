# DS004 - Runtime Module: load-context

## Goal
Load all visitor-turn context before orchestration starts, so the agentic loop receives deterministic local state without needing a dedicated context-loading cskill.

## Mechanism
`webCli/src/runtime/load-context.mjs` runs before `RecursiveSkilledAgent.executePrompt(...)`.

## Module Contract
- **Name**: `load-context`
- **Input**:
  - `sessionId` (string, required)
- **Output**:
  - `siteInfo` (array)
  - `profilesInfo` (array)
  - `currentSessionState` (object)
  - `combinedSiteInfo` (string)
  - `combinedProfilesInfo` (string)
  - `currentSessionStateText` (string)

## Execution Logic
1. Read markdown files from `data/info/`.
2. Read markdown files from `data/profilesInfo/`.
3. Read and parse `data/sessions/{sessionId}.md` if it exists.
4. Return both structured and combined-text context used by the orchestrator prompt.

## Datastore Source
- `load-context` uses the datastore singleton configured at agent startup.
- It does not accept runtime `dataDir` overrides.
