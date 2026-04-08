# Next Implementation Steps

## Context and Current Gap

In the current `webCli` implementation, the runtime flow is not orchestrated through discovered skills executed by `RecursiveSkilledAgent`.

- The conversation pipeline is hardcoded in `WebCliAgent.handleMessage(...)`.
- The flow manually calls `respondRequest`, then computes a decision, then conditionally calls `createLead` / `bookMeeting`, and finally `updateSession`.
- This means the files currently placed under `webCli/skills/` are helper modules, not registered Achilles skills discovered and selected at runtime.

## Problem 1: Current webCli skills are not real discovered skills

To align with the architecture, these operations must be converted to real skill units discovered by `RecursiveSkilledAgent`.

- This is feasible by implementing them as `cskill` directories (`cskill.md` + `src/index.mjs`).
- The current logic from:
  - `respondRequest`
  - `updateSession`
  - `createLead`
  - `bookMeeting`
  can be ported into cskills with deterministic behavior.

## Problem 2: Anthropic orchestration compatibility

If we want an Anthropic-style orchestrator for these operations:

- The orchestrator itself must be an Anthropic skill (a `SKILL.md`-based skill executed by `AnthropicSkillsSubsystem`).
- But `AnthropicSkillsSubsystem` currently does not support passing an explicit `allowed-skills` list for tool exposure in the same way `OrchestratorSkillsSubsystem` does.
- In practice, this prevents a clean pattern where a custom Anthropic skill explicitly orchestrates our custom cskills as tool calls.

## Architectural options

### Option A (recommended now): Use RecursiveSkilledAgent orchestration with cskills

- Convert webCli operations into cskills.
- Add an `oskill` orchestrator that declares `Allowed-Skills` and routes execution.
- Let `RecursiveSkilledAgent` discover, register, select, and execute skills via the orchestrator subsystem.

Why this works now:

- It is already supported by the current Achilles behavior.
- It avoids deep subsystem changes before shipping.

### Option B: Extend AnthropicSkillsSubsystem

- Add support in `AnthropicSkillsSubsystem` for explicit `allowed-skills` semantics (parallel to `OrchestratorSkillsSubsystem`).
- Ensure selected tools can include custom cskills discovered in project skill roots.
- Then implement a dedicated Anthropic orchestrator skill for `webCli`.

Why this is heavier:

- Requires framework-level changes.
- Requires tests at Achilles subsystem level, not only webCli/webAdmin level.

## Problem 3: AchillesAgentLib placement and ownership

Current setup treats `AchillesAgentLib` as a shared sibling library at repository level.

When `webCli` and `webAdmin` evolve into independent Ploinky agents, this creates friction:

- Shared sibling dependency is less portable per agent.
- Versioning and release cadence become coupled unexpectedly.
- Local/test environments depend on external folder placement conventions.

## Recommended follow-up for library strategy

1. Decide long-term packaging model:
   - keep shared sibling library (current), or
   - move to per-agent dependency resolution (vendored/submodule/package-based).
2. If agents become standalone deployables, define Achilles version pinning per agent.
3. Update specs to reflect the final dependency contract and bootstrap expectations.

## Execution order proposal

1. Convert webCli operational units to cskills.
2. Add and wire a webCli orchestrator skill (`oskill`) and remove hardcoded flow.
3. Validate end-to-end behavior parity (sessions, leads, meeting flow, language/storage rules).
4. Decide whether Anthropic subsystem extension is still needed after Option A.
5. Finalize AchillesAgentLib ownership model for future standalone agents.
