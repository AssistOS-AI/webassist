# manage-owner-info

## Summary
Creates or updates `data/config/owner.md` with owner contact information.

## Input Format
- `promptText` contains a JSON object with:
  - `content` (string, optional) – full replacement content
  - `email` (string, optional)
  - `phone` (string, optional)
  - `calendar` (string, optional)
  - `meeting` (string, optional)
  - `read` (boolean, optional) – when true, returns current content

## Output Format
- `object` with:
  - `success` (boolean)
  - `updated` (boolean, optional)
  - `content` (string, optional)
  - `error` (string, optional)

## Constraints
- Uses freeform text; updates only known prefix lines (Email:, Phone:, Calendar:, Meeting:).
- Does not call the LLM.
