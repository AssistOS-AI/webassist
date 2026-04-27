# update-session-profile

## Description
Updates session profile memory with the latest profiling data.

## Input Format
- `promptText` contains a JSON object with:
  - `sessionId` (string, required)
  - `profiles` (string[], optional)
  - `profileDetails` (string[], optional)
  - `contactInformation` (object, optional)

## Output Format
- `object` with:
  - `sessionId` (string)
  - `updated` (boolean)

## Constraints
- Persists profile memory through runtime `updateSessionProfile`.
- Runtime appends user/agent history separately after final answer.
- Does not call the LLM.
