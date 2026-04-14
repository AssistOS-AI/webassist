# DS002 - webCli Skills and Behavioral Logic

The **webCli** agent uses specific skills to manage the conversation flow and data processing.

## Skill Type and Runtime Orchestration
- All webCli runtime skills are implemented as **cskills** (`cskill.md` + `src/index.mjs`).
- webCli runtime orchestration is implemented through one **oskill** (`visitor-flow/oskill.md`).
- Skills are discovered and registered by `RecursiveSkilledAgent` from `webCli/skills/`.
- Runtime execution is routed through `RecursiveSkilledAgent` (no direct hardcoded skill sequence in `WebCliAgent`).

## Runtime Modules (Non-skill)
- `load-context` runs before orchestration to gather info/profile/session state.
- `update-session` runs after orchestration to persist profile and history updates.
- These modules live in `webCli/src/runtime/` and are not registered as cskills.

## Orchestrator: visitor-flow
- **Function**: Coordinates one full visitor turn using the skill allowlist.
- **Allowed Skills**: `create-lead`, `book-meeting`.
- **Session Type**: loop session.
- **Guarantee**: Returns persistence payload consumed by runtime `update-session`.

## Skill: create-lead
- **Function**: Automatically creates a lead entry in `leads/`, or updates the same entry if it already exists for the same session.
- **Logic**: Triggered when a visitor provides contact information and is identified as "valuable" based on the requirements in `profilesInfo/`. The lead file is keyed by `sessionId`, so repeated qualification updates that same lead record.

## Skill: book-meeting
- **Function**: Initiates the transition to a real-person interaction.
- **Logic**: If a lead satisfies the criteria from their identified profile, the agent sends the contact information and meeting links found in `config/`.
