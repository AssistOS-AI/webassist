# DS005 - Skill: respondRequest

## Goal
To provide the LLM with the necessary context from local data stores (`info/`, `profilesInfo/`, and current session history) so it can accurately respond to the visitor's requests while attempting to profile them.

## Mechanism
This skill is an Anthropic-compatible tool called when the agent needs context to answer a question or formulate its next profiling question.

## Tool Definition
- **Name**: `respondRequest`
- **Description**: Gathers all relevant context (site info, available profiles, and current session state) needed to formulate a response to the user. The goal is to provide information and ask strategic questions for profiling.
- **Inputs**:
  - `sessionId` (string): The ID of the current session to load its history.

## Output
The tool returns a JSON object or stringified summary containing:
- Contents of all Markdown files in `data/info/`.
- Contents of all Markdown files in `data/profilesInfo/` (to understand what questions to ask to qualify a lead).
- The current parsed state of `data/sessions/{sessionId}.md`.

## Execution Logic (Node.js)
1. Read the `data/info/` directory. Concatenate the contents of all `.md` files.
2. Read the `data/profilesInfo/` directory. Concatenate the contents of all `.md` files.
3. Read `data/sessions/{sessionId}.md` if it exists.
4. Return this combined context to the LLM. The LLM will use this to generate the text response.
