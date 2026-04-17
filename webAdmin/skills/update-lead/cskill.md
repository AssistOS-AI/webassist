# update-lead

## Description
Updates the lifecycle status of an existing lead. Typical triggers include `update lead status`, `mark lead`, `set lead status`, `change lead status`, and status intents like `mark as contacted`, `mark as converted`, or `mark as invalid`.

## Input Format
- `promptText` contains a JSON object with:
  - `leadId` (string, required)
  - `newStatus` (string, required; `invalid` | `contacted` | `converted`)

## Output Format
- `object` with:
  - `message` (string)
  - `leadId` (string)
  - `lead` (object)
  - `error` (string) on validation or lookup failures

## Constraints
- Rejects unknown lead ids and invalid statuses.
- Does not call the LLM.
