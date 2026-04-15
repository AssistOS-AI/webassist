# DS007 - Skill: create-profile

## Goal
Create a reusable profiling template for the webCli agent in `data/profilesInfo/`.

## Mechanism
A **cskill** executed through `RecursiveSkilledAgent` when the owner requests a new profile.

## Tool Definition
- **Name**: `create-profile`
- **Description**: Writes a new profile markdown file with characteristics, interests, and qualifying criteria.
- **Inputs**:
  - `profileName` (string): File name base or full `.md` name for the profile.
  - `characteristics` (array of strings)
  - `interests` (array of strings)
  - `qualifyingCriteria` (array of strings)

## Output
A JSON object containing:
- `success` (boolean)
- `created` (boolean)
- `profileName` (string)
- `profilePath` (string)
- `profile` (object) with the provided lists

## Execution Logic (Node.js)
1. Validate `profileName` and reject path separators or empty names.
2. Normalize the filename to include `.md`.
3. Reject creation if the file already exists.
4. Create `data/profilesInfo/` if missing.
5. Write the profile file with:
   - `## Characteristics`
   - `## Interests`
   - `## Qualifying criteria`
