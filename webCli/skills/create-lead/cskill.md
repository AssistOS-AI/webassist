# create-lead

## Summary
Creates or updates a deterministic lead markdown file for a session.

## Input Format
- `promptText` contains a JSON object with:
  - `sessionId` (string, required)
  - `contactInfo` (object, required)
  - `profile` (string, required)
  - `summary` (string, required)

## Output Format
- `object` with:
  - `success` (boolean)
  - `created` (boolean)
  - `leadId` (string)
  - `leadPath` (string)
  - `lead` (object)

## Constraints
- Lead id must be deterministic from `sessionId`.
- Existing lead must be updated in place.
- Does not call the LLM.
