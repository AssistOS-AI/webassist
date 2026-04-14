# Ploinky Agents Standards

## General Rules
- **Language**: Communication with agents can be in any language, but all technical documentation, specifications (DS), and code comments must be in **English**.
- **Development Methodology**: Specification-driven development. Each agent must have a `docs/specs/` folder containing files named `DS0XX-short-description.md`.
- **Versioning DS**: `DS000` is always the vision/overview. Subsequent numbers (001, 002, etc.) define specific aspects.
- **Technology Stack**: Node.js (ES Modules, `.mjs` syntax) using `async/await`.
- **Dependencies**: Minimize dependencies. Use native Node.js features whenever possible.
- **LLM Access**: Use the `AchillesAgentLib` library. The loader must check for `AchillesAgentLib` or `achillesAgentLib` in the parent directory.
- **Base Architecture**: All agents must extend or use `RecursiveSkilledAgent` to handle tasks via specialized skills.
- **No Implicit Fallbacks**: When behavior or code is explicitly changed/removed by request, do not keep or introduce fallback behavior unless the user explicitly asks for a fallback.

## File Structure per Agent
- `/index.html`: Entry point referencing `docs/index.html`.
- `/src/`: Agent initialization and core logic.
- `/docs/specs/`: Specification documents (DS).
- `/skills/`: Anthropic-compatible skills (logic and definitions).
- `/data/`: (Ignored by git) Runtime data, configurations, and sessions.
