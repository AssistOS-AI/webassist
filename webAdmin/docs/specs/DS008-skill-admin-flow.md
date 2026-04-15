# DS008 - Skill: admin-flow

## Goal
Orchestrate a single owner request by selecting and executing exactly one admin skill, then returning the final owner-facing response.

## Mechanism
An **oskill** executed through `RecursiveSkilledAgent` on every owner turn.

## Tool Definition
- **Name**: `admin-flow`
- **Description**: Executes one of the admin skills (`news`, `statistics`, `lead-info`, `update-lead`, `manage-profile`, `list-profiles`) based on the owner request.
- **Session Type**: Loop

## Inputs
The runtime prompt includes:
- The owner message.
- The list of known lead IDs.

## Output
- **Plain text** response string (no JSON). The response must be in the same language as the owner’s message.
- **Operational text** (tool selection, arguments, intermediate notes) must be written in **English**.

## Execution Logic (Node.js)
1. Parse the owner message and identify which admin skill should be executed.
2. Build the skill arguments (apply defaults when needed and validate required fields).
3. Execute the selected skill via `RecursiveSkilledAgent` (inputs in English).
4. Draft the final owner-facing response based on the skill result.
5. Return only the response string.
