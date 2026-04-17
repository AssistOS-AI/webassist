# DS002 - webCli Skills and Behavioral Logic

The **webCli** agent uses specific skills to manage the conversation flow and data processing.

## Skill Type and Runtime Orchestration
- All webCli runtime skills are implemented as **cskills** (`cskill.md` + `src/index.mjs`).
- webCli runtime orchestration is implemented through one **oskill** (`visitor-flow/oskill.md`).
- Skills are discovered and registered by `RecursiveSkilledAgent` from `webCli/skills/`.
- Runtime execution is routed through `RecursiveSkilledAgent` (no direct hardcoded skill sequence in `WebCliAgent`).

## Runtime Modules (Non-skill)
- `load-context` runs before orchestration to gather info/profile/session state and deterministic lead state for the current `sessionId`.
- `update-session` runs after orchestration to persist profile and history updates.
- These modules live in `webCli/src/runtime/` and are not registered as cskills.

## Orchestrator: visitor-flow
- **Function**: Coordinates one full visitor turn using the skill allowlist.
- **Allowed Skills**: `create-lead`, `book-meeting`.
- **Session Type**: loop session.
- **Guarantee**: Returns persistence payload (`response`, `profiles`, `profileDetails`, `contactInformation`, English persistence fields) consumed by runtime `update-session`.
- **Continuity Rule**: Conversation progression is encoded directly in orchestrator-authored `profileDetails`; runtime does not synthesize flow fields.

## Skill: create-lead
- **Function**: Automatically creates a lead entry in `leads/`, or updates the same entry if it already exists for the same session.
- **Logic**: Triggered when a visitor provides contact information and is identified as "valuable" based on the requirements in `profilesInfo/`. The lead file is keyed by `sessionId`, so repeated qualification updates that same lead record.

## Skill: book-meeting
- **Function**: Initiates the transition to a real-person interaction.
- **Logic**: Runs only when a lead already exists for the current `sessionId`; otherwise it fails with a deterministic error. When allowed, it returns meeting/contact details from `config/`.
