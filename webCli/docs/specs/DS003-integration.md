# DS003 - webCli Integration and Loading

The **webCli** agent is implemented as a Node.js CLI tool with a single `sessionId`.

## Library: AchillesAgentLib
- **Mandatory Usage**: Access to LLMs must be through this library.
- **Loader Mechanism**: The agent's loader must check for the existence of `AchillesAgentLib` or `achillesAgentLib` in the parent directory.
- **Loading Logic**:
  - Scan `../` for `AchillesAgentLib` or `achillesAgentLib`.
  - Dynamically load the library if found.

## Base Class: RecursiveSkilledAgent
- **Functionality**: The agent extends or uses `RecursiveSkilledAgent` to manage the conversation loop and skill execution.

## Communication Language
- **Input/Output**: Communication with the visitor can be in any language.
- **Data Storage**: All file-based information (specs, session details, leads) must be stored in **English**.
