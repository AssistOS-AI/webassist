# DS009 - Skill: visitor-flow

## Goal
Coordinate one complete visitor turn through Achilles orchestration so `webCli` runtime does not hardcode skill calls in application code.

## Mechanism
This skill is implemented as an **oskill** and is selected by `RecursiveSkilledAgent` when handling visitor messages without an explicit `skillName`.

## Tool Definition
- **Name**: `visitor-flow`
- **Session Type**: `loop`
- **Allowed Skills**:
  - `create-lead`
  - `book-meeting`

## Input Contract
The runtime sends a prompt containing a JSON payload:

```json
{
  "sessionId": "...",
  "message": "..."
}
```

## Orchestration Contract
1. Read context from runtime-provided input (`context` object in prompt JSON).
2. Build an internal decision object (response draft, profiles, profileDetails, flow, lead, meeting).
3. Ensure decision constraints:
   - profile filenames in `profiles`;
   - `profileDetails` and lead summary in English;
   - `flow.answeredPendingQuestion` as boolean and `flow.pendingQuestionTopic` in English text or empty string;
   - `profileDetails` captures stable visitor facts, not full transcript copy;
   - lead only when value + contact info;
   - meeting only for explicit human-contact ask;
   - when info is missing, answer current question and ask exactly one strategic follow-up question.
4. Optionally create/update lead via `create-lead`.
5. Optionally load owner meeting config via `book-meeting`.
6. Build final visitor response in visitor language.
7. Translate both messages to English for persistence (preserve intent/facts, concise, no added info).
8. Return a final JSON payload through `final_answer`.

## Runtime Continuity Rule
`webCli` runtime synthesizes continuity markers into profile details based on `flow` output and previous session profile details. History files remain persisted for audit, but orchestration continuity relies on profile details.

## Output Contract
The orchestrator must end with a JSON object containing:
- `success`
- `sessionId`
- `response`
- `userMessageEnglish`
- `agentResponseEnglish`
- `profiles`
- `profileDetails`
- `flow`
- `lead`
- `meeting`

This payload is normalized by `webCli/src/WebCliAgent.mjs`; runtime `update-session` persists and appends `session` in the final response returned to callers.
