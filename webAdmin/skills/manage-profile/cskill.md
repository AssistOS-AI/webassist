# manage-profile

## Description
Lists, displays, creates, or updates profiling templates in `data/profilesInfo/` used by the website chatbot for visitor matching. Typical triggers include list intents (`list profiles`, `show profiles`, `display profiles`, `what profiles exist`), display intents (`show profile`, `display profile`, `view profile`, `open profile`), create intents (`create profile`, `add profile`, `new profile`, `define profile`), and update intents (`update profile`, `edit profile`, `modify profile`, `change profile`).

## Input Format
- `promptText` contains a JSON object with:
  - `profileName` (string, optional for list-all, required for display/create/update one profile)
  - `sections` (array of strings, optional for display mode filtering)
  - `characteristics` (array of strings, optional; when present, create/update mode)
  - `interests` (array of strings, optional; when present, create/update mode)
  - `qualifyingCriteria` (array of strings, optional; when present, create/update mode)

Mode mapping:
- `{}` => list all profiles
- `{ "profileName": "Developer" }` => display full profile
- `{ "profileName": "Developer", "sections": ["Interests"] }` => display selected sections
- `{ "profileName": "...", "characteristics": [...], "interests": [...], "qualifyingCriteria": [...] }` => create/update

## Output Format
- `object` with:
  - `message` (string)
  - `profiles` (array of strings) for list mode
  - `profileName` (string) for display/create/update modes
  - `content` (string) and `sectionsDisplayed` (array) for display mode
  - `created` (boolean), `updated` (boolean), `profilePath` (string), `profile` (object) for create/update mode
  - `error` (string) on failure

## Constraints
- Rejects invalid or unsafe profile names.
- Matches existing profiles case-insensitively and updates them in place.
- Persists profile content using numbered markdown sections (`### 1. Characteristics`, `### 2. Interests`, `### 3. Qualifying criteria`).
- Reads and renders profile sections using normalized section names.
- Does not call the LLM.
