# manage-site-info

## Summary
Creates, updates, or displays site information markdown files under `data/info/`.

## Input Format
- `promptText` contains a JSON object with:
- `files` (array of objects, optional):
    - `name` (string, optional) – filename without `.md` (or with `.md`); when omitted, derive from prompt/content
    - `content` (string, required) – markdown content to write
  - `fileName` (string, optional) – file name (without `.md`) used for read or write
  - `content` (string, optional) – content to write; when `fileName` is missing, name is derived from prompt/content
  - `readFile` (string, optional) – legacy alias for read target (without `.md`)
  - `promptText` (string, optional) – raw prompt for name derivation (when no file names are given)

## Output Format
- `object` with:
  - `success` (boolean)
  - `created` (array of strings, optional)
  - `updated` (array of strings, optional)
  - `content` (string, optional) – content displayed (with title)
  - `error` (string, optional)

## Constraints
- Writes content exactly as provided.
- Reads return content with a title line containing the filename.
- Does not call the LLM.
