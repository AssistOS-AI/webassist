# leadInfo

## Summary
Returns lead details and related session history.

## Input Format
- `promptText` contains a JSON object with:
  - `leadId` (string, required)

## Output Format
- `object` with:
  - `success` (boolean)
  - `info` (object) on success
  - `error` (string) on failure

## Constraints
- Resolves the related session from lead data.
- Does not call the LLM.
