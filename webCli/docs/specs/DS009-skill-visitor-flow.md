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
   - Use `currentLeadState` as source of truth for existing lead data tied to `sessionId`.
2. Build an internal decision object (response draft, profiles, profileDetails, contactInformation).
3. Ensure decision constraints:
   - use only profiles defined in `combinedProfilesInfo` as qualification candidates;
   - evaluate profile matching through multi-turn questioning;
   - profile filenames in `profiles`;
   - `profileDetails` and lead summary in English;
   - `contactInformation` is structured key-value data with explicit user-provided fields (no fixed schema);
   - visitor full name is requested during qualification; when missing, this is explicitly noted in `profileDetails`;
   - at least one direct contact channel should be collected when available (for example email, phone, social profile, or equivalent);
   - `profileDetails` captures conversation essence relevant to profiling and progression, not transcript copy;
   - `profileDetails` must include what the agent asked, what the user answered, pending questions, and profile-relevant discussed aspects;
   - if no profile matches after multiple attempts, switch to dismissive mode (website-only answers, no profiling questions) until new profile-relevant evidence appears;
   - when info is missing, answer current question and ask exactly one strategic follow-up question.
4. Build final visitor response in visitor language.
5. Return a final JSON payload through `final_answer`.

## Runtime Continuity Rule
`webCli` runtime does not synthesize flow markers. Conversational continuity is authored directly by orchestrator through `profileDetails`. History files remain persisted for audit and admin consumers.

## Output Contract
The orchestrator must end with a JSON object containing:
- `response`
- `profiles`
- `profileDetails`
- `contactInformation`

The runtime passes `sessionId` and `message` directly from the incoming request; the orchestrator does not return them.
This payload is normalized by `webCli/src/WebCliAgent.mjs`; runtime `update-session` persists and appends `session` in the final response returned to callers.
