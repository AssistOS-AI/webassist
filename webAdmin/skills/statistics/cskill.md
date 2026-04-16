# statistics

## Description
Computes session and lead metrics for a requested interval.

## Input Format
- `promptText` contains a JSON object with:
  - `interval` (string, required; `day` | `week` | `month` | `year`)

## Output Format
- `object` with:
  - `success` (boolean)
  - `stats` (object)

## Constraints
- Uses filesystem timestamps and parsed lead metadata.
- Does not call the LLM.
