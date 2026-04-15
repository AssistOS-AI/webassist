# create-profile

## Summary
Creates a new profiling template in `data/profilesInfo/` for the webCli agent to use during visitor matching.

## Input Format
- `promptText` contains a JSON object with:
  - `profileName` (string, required)
  - `characteristics` (array of strings, required)
  - `interests` (array of strings, required)
  - `qualifyingCriteria` (array of strings, required)

## Output Format
- `object` with:
  - `success` (boolean)
  - `created` (boolean)
  - `profileName` (string)
  - `profilePath` (string)
  - `profile` (object) on success
  - `error` (string) on failure

## Constraints
- Rejects invalid or unsafe profile names.
- Fails if the target profile file already exists.
- Does not call the LLM.
