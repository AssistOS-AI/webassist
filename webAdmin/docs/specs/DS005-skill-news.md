# DS005 - Skill: news

## Goal
To provide the site owner with immediate awareness of the most recent interactions that resulted in new leads.

## Mechanism
An Anthropic-compatible tool used by the webAdmin agent when queried about "what's new", "recent leads", or similar prompts.

## Tool Definition
- **Name**: `news`
- **Description**: Lists the most recent leads added to the system, sorted by newest first.
- **Inputs**:
  - `limit` (number, optional): The maximum number of recent leads to return. Default is 5.

## Output
A list/array of JSON objects containing brief summaries of the recent leads:
- `leadId` (string)
- `status` (string, e.g., `new`)
- `profile` (string)
- `summary` (string)
- `createdAt` (timestamp or formatted date string)

## Execution Logic (Node.js)
1. Read the `data/leads/` directory.
2. Get the file metadata (specifically creation time/mtime) for all lead files.
3. Sort the files descending by time.
4. Take the top `limit` files.
5. Parse their contents to extract the status, profile, and summary.
6. Return the formatted list.
