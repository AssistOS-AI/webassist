# book-meeting

## Description
Loads owner meeting configuration text for high-intent visitors.

## Input Format
- `promptText` contains a JSON object with:
  - `sessionId` (string, required)

## Output Format
- `string` containing merged markdown from `data/config/`.

## Constraints
- Fails when configuration files are missing.
- Does not call the LLM.
