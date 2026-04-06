# DS007 - Skill: bookMeeting

## Goal
To facilitate the transition from an automated chat session to a real human interaction by offering a meeting link or direct contact details.

## Mechanism
This is an Anthropic-compatible tool called by the LLM when a visitor is deemed highly qualified and is actively requesting to speak with someone or schedule a call.

## Tool Definition
- **Name**: `bookMeeting`
- **Description**: Retrieves the site owner's calendar link or contact details to offer a direct meeting to a highly qualified lead.
- **Inputs**:
  - `sessionId` (string): The ID of the current session.

## Output
The tool returns a string containing the content of the config files in `data/config/` (such as `owner.md`), which includes the necessary links or emails.

## Execution Logic (Node.js)
1. Read the `data/config/` directory.
2. Concatenate the contents of the files found in that directory (e.g., `owner.md`).
3. Return the content so the LLM can use it to formulate a natural response offering the calendar link to the user.
