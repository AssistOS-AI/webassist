# webAssist Agent Guide

## Scope

webAssist is a guest-enabled visitor assistant that profiles visitors, maintains session context, converts leads, and offers meeting scheduling through Achilles skills.

## Mandatory Reading Order

1. Read the nearest parent `AGENTS.md` for workspace-wide rules.
2. Read `docs/index.html` for the local documentation entry point.
3. Read `docs/specs/matrix.md` and the relevant local DS files before changing behavior.
4. Read `docs/specs/DS012-ploinky-runtime-invariants.md` before touching auth, routing, guest access, MCP, HTTP services, files, logs, or runtime configuration.
5. Read `AGENTS.md` for local coding style, module structure, and test-organization rules when a dedicated coding-style DS file does not exist; otherwise inherit the parent repository coding-style authority.

## Current Skill Catalog

- skills/create-lead
- skills/book-meeting
- skills/update-session-profile

## Repository Rules

- The DS specifications are the source of truth for local contracts and invariants.
- When source code changes behavior, interfaces, architecture, workflows, security boundaries, or runtime configuration, update both the HTML documentation and the DS specifications.
- Keep DS numbering gap-free within any newly initialized GAMP spec set. Preserve existing local numbering conventions unless a migration updates all links in the same change.
- All documentation, specifications, and code comments must be written in English.
- Do not add imported-skill DS files or skill pages to a downstream host project's docs tree.
- Keep Ploinky runtime invariants in local context: router-mediated entry, secure-wire invocation JWTs, scoped guest mode, manifest-declared HTTP services, workspace-confined paths, and redacted logs.
- Never add AI/coding-agent attribution to commits, release notes, changelogs, generated metadata, comments, or documentation.
- Update `AGENTS.md` and `CLAUDE.md` together so coding agents receive the same local context.

## Runtime Defaults

Uses `node:20-bullseye`, `lite-sandbox: true`, `src/index.mjs`, and Achilles `MainAgent` skills.

## Key Paths

- `manifest.json`
- `docs/specs/DS012-ploinky-runtime-invariants.md`
- `src/`
- `skills/`
- `tests/`

## Validation

Run the narrowest relevant check after edits, then broaden when touching shared behavior:

- `node tests/runAll.mjs`
