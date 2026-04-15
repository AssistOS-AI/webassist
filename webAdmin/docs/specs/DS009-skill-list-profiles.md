# DS009 - Skill: list-profiles

## Goal
List the available profile templates stored in `data/profilesInfo/`.

## Mechanism
A **cskill** executed through `RecursiveSkilledAgent` when the owner requests a list of profiles.

## Tool Definition
- **Name**: `list-profiles`
- **Description**: Returns profile names without the `.md` extension.
- **Inputs**: None (accepts an empty JSON object).

## Output
A JSON object containing:
- `success` (boolean)
- `profiles` (array of strings, without `.md`)

## Execution Logic (Node.js)
1. Read markdown files from `data/profilesInfo/`.
2. Strip the `.md` extension from each filename.
3. Sort the list alphabetically.
4. Return the list.
