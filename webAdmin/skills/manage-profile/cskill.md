# manage-profile

## Description
Creates or updates a profiling template in `data/profilesInfo/` for the webCli agent to use during visitor matching.

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
  - `updated` (boolean)
  - `profileName` (string)
  - `profilePath` (string)
  - `profile` (object) on success
  - `error` (string) on failure

## Constraints
- Rejects invalid or unsafe profile names.
- Matches existing profiles case-insensitively and updates them in place.
- Does not call the LLM.
