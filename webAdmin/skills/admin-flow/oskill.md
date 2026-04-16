# admin-flow

## Description
Orchestrates webAdmin owner requests by selecting and executing exactly one admin skill (news, statistics, lead info, lead updates, profile management, site info management, or owner info management).
Use this skill when the owner asks for recent leads, metrics/statistics, details about a specific lead, to update a lead status, to create/update a profiling template, to manage website knowledge files, or to manage owner contact details.
The runtime already injects existing profiles, owner info, and website info into context each turn.
Trigger keywords include: "news", "latest leads", "statistics", "stats", "lead info", "lead details", "update lead", "mark lead", "status", "create profile", "add profile", "new profile", "site info", "website info", "owner info", "contact info".

## Instructions
1. Identify the owner message, known lead IDs, and preloaded context data (profiles, owner info, website info) from the input prompt context.
2. Choose exactly one skill and define its arguments (write all operational text in English):
   - `news`: `{ "limit": 5 }` (default to 5 when unspecified).
   - `statistics`: `{ "interval": "day" | "week" | "month" | "year" }` (default to `month` when unspecified).
   - `lead-info`: `{ "leadId": "session-lead.md" }`.
   - `update-lead`: `{ "leadId": "session-lead.md", "newStatus": "invalid" | "contacted" | "converted" }`.
    - `manage-profile`: `{ "profileName": "...", "characteristics": ["..."], "interests": ["..."], "qualifyingCriteria": ["..."] }`.
    - `manage-site-info`: read `{ "fileName": "..." }`; write `{ "fileName": "...", "content": "..." }`; batch write `{ "files": [{ "name": "...", "content": "..." }] }`.
    - `manage-owner-info`: read `{ "read": true }`; targeted update `{ "email": "...", "phone": "...", "calendar": "...", "meeting": "..." }`; full overwrite `{ "content": "..." }`.
   Rules:
   - Use an existing leadId whenever the owner refers to a specific lead.
   - Validate `newStatus` is one of the allowed values.
3. Execute the matching skill (skill calls and inputs must be in English):
    - `news` → call `news` with the JSON arguments.
    - `statistics` → call `statistics` with the JSON arguments.
    - `lead-info` → call `lead-info` with the JSON arguments.
    - `update-lead` → call `update-lead` with the JSON arguments.
    - `manage-profile` → call `manage-profile` with the JSON arguments.
    - `manage-site-info` → call `manage-site-info` with the JSON arguments.
    - `manage-owner-info` → call `manage-owner-info` with the JSON arguments.
4. Draft the owner-facing response in the same language as the owner message. Use the skill result to answer concisely.
   - All operational text, tool selection reasoning, and any intermediate notes must be in English.
   - any text you use from the user MUST be translated to english
   - any text used as parameters for the skills you call MUST be translated to english
   - only respond in the user's language when addressing to them.
5. Return **plain text only** — the final owner-facing response string (no JSON).

## Allowed Skills
- news
- statistics
- lead-info
- update-lead
- manage-profile
- manage-site-info
- manage-owner-info

## Session Type
Loop
