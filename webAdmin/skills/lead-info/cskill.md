# lead-info

## Description
Returns lead details and related session history. Typical triggers include `lead info`, `lead details`, `show lead`, `display lead`, `open lead`, `show lead history`, `lead session`, and `lead context`.

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
