# update-lead

## Summary
Updates the lifecycle status of an existing lead.

## Input Format
- `promptText` contains a JSON object with:
  - `leadId` (string, required)
  - `newStatus` (string, required; `invalid` | `contacted` | `converted`)

## Output Format
- `object` with:
  - `success` (boolean)
  - `leadId` (string)
  - `lead` (object)

## Constraints
- Rejects unknown lead ids and invalid statuses.
- Does not call the LLM.
