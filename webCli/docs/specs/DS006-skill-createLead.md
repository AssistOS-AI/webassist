# DS006 - Skill: createLead

## Goal
To save the captured contact information and profiling details into a structured file inside the `data/leads/` directory when a user is deemed a valuable prospect.

## Mechanism
This is an Anthropic-compatible tool called when the LLM determines that a user's intent, provided contact info, and profiled traits match a specific `ProfileName.md`'s requirements.

## Tool Definition
- **Name**: `createLead`
- **Description**: Creates a new lead file in the system. The tool parses contact details and profile traits, creating a file that represents a solid lead.
- **Inputs**:
  - `sessionId` (string): The current session ID (used as part of the filename or reference).
  - `contactInfo` (object): Key-value pairs for the extracted contact data (e.g. `{"email": "...", "phone": "...", "name": "..."}`).
  - `profile` (string): The single most relevant profile name from `profilesInfo/` that this lead matches (e.g., "Developer").
  - `summary` (string): A short summary explaining why this lead is valuable.

## File Generation Format
The tool will create a file named `{sessionId}-lead.md` inside `data/leads/`. It should contain:
- **Status**: `new` (default state required for webAdmin).
- **Profile**: The chosen `profile`.
- **Contact Info**: Formatted key-value list from the `contactInfo` object.
- **Summary**: The `summary` provided.

## Execution Logic (Node.js)
1. Read the provided inputs.
2. Ensure `data/leads/` directory exists.
3. Construct the markdown string according to the format.
4. Write the file synchronously or asynchronously using Node.js `fs.promises.writeFile`.
