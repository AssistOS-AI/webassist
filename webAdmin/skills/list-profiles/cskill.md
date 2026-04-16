# list-profiles

## Description
Lists available profiling templates from `data/profilesInfo/`.

## Input Format
- `promptText` contains a JSON object (optional, currently unused).

## Output Format
- `object` with:
  - `success` (boolean)
  - `profiles` (array of strings, without `.md`)

## Constraints
- Returns profile names without file extensions.
- Does not call the LLM.
