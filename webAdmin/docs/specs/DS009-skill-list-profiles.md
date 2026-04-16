# DS009 - Skill: list-profiles

## Goal
List available profiles, or return the full markdown/selected sections for a specific profile.

## Status
- Kept as an optional direct cskill.
- Not used by `admin-flow` orchestration because profile inventory is preloaded in runtime context each turn.

## Mechanism
A **cskill** executed through `RecursiveSkilledAgent` when the owner requests a list of profiles.

## Tool Definition
- **Name**: `list-profiles`
- **Description**: Lists profiles or returns a profile’s markdown/sections.
- **Inputs**:
  - `profileName` (string, optional): If provided, returns the profile content.
  - `sections` (array of strings, optional): When provided with `profileName`, returns only those sections.

## Output
When `profileName` is **not** provided:
- `success` (boolean)
- `profiles` (array of strings, without `.md`)

When `profileName` **is** provided:
- `success` (boolean)
- `profileName` (string, without `.md`)
- `content` (string, markdown with section headings)
- `sectionsDisplayed` (array of section titles)

## Execution Logic (Node.js)
1. If `profileName` is missing:
   - Read markdown files from `data/profilesInfo/`.
   - Strip the `.md` extension from each filename.
   - Sort the list alphabetically and return it.
2. If `profileName` is provided:
   - Locate the profile file by case-insensitive match on filename.
   - If `sections` is missing, return all numbered profile sections.
   - If `sections` is provided, resolve only the standard headings:
      - `Characteristics`
      - `Interests`
      - `Qualifying criteria`
   - Section resolution reads numbered markdown section names (`### N. Name`) from the datastore.
   - Unknown section labels are mapped by keywords (`character*`, `interest*`, `criteria/qualify*`).
   - If no keyword mapping matches, return all three sections.
   - Always include the section title in the returned content (`## Name`) and report `sectionsDisplayed`.
