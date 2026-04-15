# DS001 - webAdmin Skills and Reporting Logic

The **webAdmin** agent interacts with the information collected by **webCli**.

Runtime dependency note:
- `webAdmin` uses AchillesAgentLib via direct package import from `node_modules`.
- The agent runtime composes a `RecursiveSkilledAgent` instance imported from `achillesAgentLib`.

Skill runtime note:
- Operational webAdmin skills are implemented as **cskills** (`cskill.md` + `src/index.mjs`).
- They are discovered and registered from `webAdmin/skills/` by `RecursiveSkilledAgent`.
- Execution is routed through `RecursiveSkilledAgent` skill execution APIs.
- Owner requests are orchestrated by the `admin-flow` **oskills**.
  - `admin-flow` returns a plain-text response string for the owner.

## Skill: updateLead
- **Function**: Manages the lifecycle of a lead in `leads/`.
- **States**: Transitions a lead from `new` to `invalid`, `contacted`, or `converted`.

## Skill: leadInfo
- **Function**: Displays comprehensive profiling and interaction data for a selected lead.

## Skill: statistics
- **Function**: Aggregates interaction metrics.
- **Reporting Intervals**: Day, week, month, year.
- **Metrics**: Total number of sessions, total leads generated, and leads by specific profile.

## Skill: news
- **Function**: Summarizes recent lead activity.
- **Output**: Recent entries in `leads/` with a brief overview of their status and profile.

## Skill: create-profile
- **Function**: Creates a profiling template in `profilesInfo/` for the webCli agent to use when matching visitors.

## Skill: admin-flow
- **Function**: Orchestrates owner requests by selecting and executing exactly one admin skill per turn.
