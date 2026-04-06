# DS004 - Skill: updateSession

## Goal
To maintain the state of an active conversation within a `sessionId.md` file in the `data/sessions/` directory. 

## Mechanism
This skill acts as an Anthropic-compatible tool called by the agent after it decides how to respond to the user, or after the interaction. It persists the state.

## Tool Definition
- **Name**: `updateSession`
- **Description**: Updates the session file (`data/sessions/{sessionId}.md`) with the latest user input, agent response, and current profiling assumptions.
- **Inputs**:
  - `sessionId` (string): The current session ID.
  - `userMessage` (string): The exact message from the user.
  - `agentResponse` (string): The agent's generated response.
  - `profiles` (array of strings): The list of profile names (e.g. `['Developer', 'Client']`) that are currently deemed relevant based on the conversation so far.
  - `profileDetails` (array of strings): Important facts learned about the user during the entire session (e.g., `['Looking for a web application', 'Budget is around $5000']`).

## File Generation Format
The skill will format the data and write it to `data/sessions/{sessionId}.md` according to the structure defined in DS001:
1. **Profile**: The `profiles` array formatted as a list.
2. **Profile Details**: The `profileDetails` array formatted as a list.
3. **History**: Appends the new `User: ...` and `Agent: ...` lines to the existing history. If the file does not exist, it creates it.

## Execution Logic (Node.js)
1. Read the existing `sessionId.md` file if it exists.
2. Extract the existing History section.
3. Append the new userMessage and agentResponse to the History.
4. Replace the Profile and Profile Details sections with the newly provided arrays.
5. Write the combined content back to the file.
