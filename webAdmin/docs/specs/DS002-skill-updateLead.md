# DS002 - Skill: updateLead

## Goal
To manage the state and lifecycle of a lead inside the `webAdmin` application.

## Mechanism
An Anthropic-compatible tool used by the webAdmin agent when the owner requests to change the status of a specific lead.

## Tool Definition
- **Name**: `updateLead`
- **Description**: Updates the status of an existing lead in the system.
- **Inputs**:
  - `leadId` (string): The identifier of the lead (typically `{sessionId}-lead.md`).
  - `newStatus` (string): The new state for the lead. Allowed values: `invalid`, `contacted`, `converted`.

## Execution Logic (Node.js)
1. Ensure the `leadId` exists in `data/leads/`.
2. Read the markdown file corresponding to the lead.
3. Parse the markdown and replace the "Status:" line with the `newStatus` value.
4. Write the file back to disk in `data/leads/`.
5. Return a success message or error if the lead file is not found or the state is invalid.
