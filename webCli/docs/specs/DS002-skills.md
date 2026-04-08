# DS002 - webCli Skills and Behavioral Logic

The **webCli** agent uses specific skills to manage the conversation flow and data processing.

## Skill: updateSession
- **Function**: Processes every user message to update the current session file.
- **Logic**:
  - Updates the **Profile** section (adding/removing filenames from `profilesInfo/`).
  - Appends to the **Profile Details** as new facts are extracted.
  - Updates the **History** section with the current interaction.

## Skill: respondRequest
- **Function**: Formulates the agent's response.
- **Resources**: Uses `info/`, `profilesInfo/`, and the state from `sessionId.md`.
- **Strategy**:
  - Provide requested information from `info/`.
  - Formulate strategic questions to complete the user's profiling as defined in `profilesInfo/`.

## Skill: createLead
- **Function**: Automatically creates a lead entry in `leads/`, or updates the same entry if it already exists for the same session.
- **Logic**: Triggered when a visitor provides contact information and is identified as "valuable" based on the requirements in `profilesInfo/`. The lead file is keyed by `sessionId`, so repeated qualification updates that same lead record.

## Skill: bookMeeting
- **Function**: Initiates the transition to a real-person interaction.
- **Logic**: If a lead satisfies the criteria from their identified profile, the agent sends the contact information and meeting links found in `config/`.
