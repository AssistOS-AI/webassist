# admin-flow

## Description
Orchestrates webAdmin owner requests by selecting and executing exactly one admin skill (news, statistics, lead info, lead updates, or profile creation).
Use this skill when the owner asks for recent leads, metrics/statistics, details about a specific lead, to update a lead status, or to create a new profiling template.
Trigger keywords include: "news", "latest leads", "statistics", "stats", "lead info", "lead details", "update lead", "mark lead", "status", "create profile", "add profile", "new profile".

## Instructions
1. Identify the owner message and the list of known lead IDs from the input prompt context.
2. Choose exactly one skill and define its arguments:
   - `news`: `{ "limit": 5 }` (default to 5 when unspecified).
   - `statistics`: `{ "interval": "day" | "week" | "month" | "year" }` (default to `month` when unspecified).
   - `leadInfo`: `{ "leadId": "session-lead.md" }`.
   - `updateLead`: `{ "leadId": "session-lead.md", "newStatus": "invalid" | "contacted" | "converted" }`.
   - `createProfile`: `{ "profileName": "...", "characteristics": ["..."], "interests": ["..."], "qualifyingCriteria": ["..."] }`.
   Rules:
   - Use an existing leadId whenever the owner refers to a specific lead.
   - Validate `newStatus` is one of the allowed values.
3. Execute the matching skill:
   - `news` → call `news` with the JSON arguments.
   - `statistics` → call `statistics` with the JSON arguments.
   - `leadInfo` → call `leadinfo` with the JSON arguments.
   - `updateLead` → call `updatelead` with the JSON arguments.
   - `createProfile` → call `create-profile` with the JSON arguments.
4. Draft the owner-facing response in the same language as the owner message. Use the skill result to answer concisely.
5. Return **plain text only** — the final owner-facing response string (no JSON).

## Allowed Skills
- news
- statistics
- leadInfo
- updateLead
- create-profile

## Session Type
Loop
