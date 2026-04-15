# admin-flow

## Description
Orchestrates webAdmin owner requests by selecting and executing exactly one admin skill (news, statistics, lead info, lead updates, profile management, or profile listing).
Use this skill when the owner asks for recent leads, metrics/statistics, details about a specific lead, to update a lead status, to create/update a profiling template, or to list existing profiles.
Trigger keywords include: "news", "latest leads", "statistics", "stats", "lead info", "lead details", "update lead", "mark lead", "status", "create profile", "add profile", "new profile", "list profiles", "show profiles".

## Instructions
1. Identify the owner message and the list of known lead IDs from the input prompt context.
2. Choose exactly one skill and define its arguments (write all operational text in English):
   - `news`: `{ "limit": 5 }` (default to 5 when unspecified).
   - `statistics`: `{ "interval": "day" | "week" | "month" | "year" }` (default to `month` when unspecified).
   - `lead-info`: `{ "leadId": "session-lead.md" }`.
   - `update-lead`: `{ "leadId": "session-lead.md", "newStatus": "invalid" | "contacted" | "converted" }`.
   - `manage-profile`: `{ "profileName": "...", "characteristics": ["..."], "interests": ["..."], "qualifyingCriteria": ["..."] }`.
   - `list-profiles`: `{ "profileName": "...", "sections": ["Characteristics" | "Interests" | "Qualifying criteria"] }` (optional).
   Rules:
   - Use an existing leadId whenever the owner refers to a specific lead.
   - Validate `newStatus` is one of the allowed values.
3. Execute the matching skill (skill calls and inputs must be in English):
   - `news` → call `news` with the JSON arguments.
   - `statistics` → call `statistics` with the JSON arguments.
   - `lead-info` → call `lead-info` with the JSON arguments.
   - `update-lead` → call `update-lead` with the JSON arguments.
   - `manage-profile` → call `manage-profile` with the JSON arguments.
   - `list-profiles` → call `list-profiles` with JSON arguments (empty object when listing all).
4. Draft the owner-facing response in the same language as the owner message. Use the skill result to answer concisely.
   - All operational text, tool selection reasoning, and any intermediate notes must be in English.
5. Return **plain text only** — the final owner-facing response string (no JSON).

## Allowed Skills
- news
- statistics
- lead-info
- update-lead
- manage-profile
- list-profiles

## Session Type
Loop
