# news

## Summary
Returns newest leads first with compact summary data.

## Input Format
- `promptText` contains a JSON object with:
  - `limit` (number, optional; defaults to 5)

## Output Format
- `object` with:
  - `success` (boolean)
  - `leads` (array)

## Constraints
- Sorts by newest lead timestamp descending.
- Does not call the LLM.
