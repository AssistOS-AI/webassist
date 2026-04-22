# DS001 - webAdmin Skills and Reporting Logic

The **webAdmin** agent interacts with the information collected by **webAssist**.

Runtime dependency note:
- `webAdmin` uses AchillesAgentLib via direct package import from `node_modules`.
- The agent runtime composes a `RecursiveSkilledAgent` instance imported from `achillesAgentLib`.

Skill runtime note:
- Operational webAdmin skills are implemented as **cskills** (`cskill.md` + `src/index.mjs`).
- They are discovered and registered from `webAdmin/skills/` by `RecursiveSkilledAgent`.
- Execution is routed through `RecursiveSkilledAgent` skill execution APIs.
- File persistence is handled through `MarkdownDataStore` (AchillesAgentLib) with numbered markdown sections (`### N. Section Name`).
- Skill payloads expose domain data and optional `error` fields; they do not rely on `success` flags.
- Skills also include `message` text fields so loop-session planners receive human-readable execution outcomes alongside structured data.
- Owner requests are orchestrated by the `admin-flow` **oskills**.
  - `admin-flow` returns a plain-text response string for the owner in structured, user-friendly formatting.

## Skill: update-lead
- **Function**: Manages the lifecycle of a lead in `leads/`.
- **States**: Transitions a lead from `new` to `invalid`, `contacted`, or `converted`.

## Skill: lead-info
- **Function**: Displays comprehensive profiling and interaction data for a selected lead.

## Skill: statistics
- **Function**: Aggregates interaction metrics.
- **Reporting Intervals**: Day, week, month, year.
- **Metrics**: Total number of sessions, total leads generated, and leads by specific profile.

## Skill: news
- **Function**: Summarizes recent lead activity.
- **Output**: Recent entries in `leads/` with a brief overview of their status and profile.

## Skill: manage-profile
- **Function**: Lists profiles, displays one profile, or creates/updates a profiling template in `profilesInfo/` for the webAssist agent to use when matching visitors.

## Skill: manage-site-info
- **Function**: Creates or updates one/many site information files under `data/info/`, and can display a specific file.

## Skill: manage-owner-info
- **Function**: Creates or updates `data/config/owner.md` with owner contact information.

## Skill: admin-flow
- **Function**: Orchestrates owner requests by selecting and executing exactly one admin skill per turn.
- **Context Preload**: Receives preloaded profiles list, owner info, and website info at every iteration.
