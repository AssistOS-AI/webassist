# list-profiles

## Description
Lists available profiling templates from `data/profilesInfo/`, or returns full/filtered section content for one profile.

## Input Format
- `promptText` contains an optional JSON object with:
  - `profileName` (string, optional)
  - `sections` (array of strings, optional)

## Output Format
- If `profileName` is missing:
  - `success` (boolean)
  - `profiles` (array of strings, without `.md`)
- If `profileName` is provided:
  - `success` (boolean)
  - `profileName` (string)
  - `content` (string)
  - `sectionsDisplayed` (array of strings)

## Constraints
- Reads numbered markdown sections (`### N. Name`) and renders owner output with `## Name` headings.
- Does not call the LLM.
