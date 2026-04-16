# DS001 - webCli Data Structure and Session Management

The `data/` folder is the persistent storage for the webCli agent. It is excluded from version control via `.gitignore`.

Runtime note:
- By default, `data/` is resolved under `webassist-shared/data` at the repository/runtime root level.
- `--data-dir` can override this location explicitly.
- `--agent-root` changes the runtime root whose parent is used for default `webassist-shared/data` resolution.
- Persistence is implemented through `MarkdownDataStore` from AchillesAgentLib.
- Folder/section identifiers used by datastore calls are centralized in `webCli/src/constants/datastore.mjs`.

## Data Subfolders
- **config/**: Contains `owner.md` or similar files with site owner contact details and calendar/meeting links.
- **info/**: General knowledge base for the agent. Markdown files containing details about the user, company, or site services.
- **profilesInfo/**: Contains `ProfileName.md` files. Each file defines the characteristics, interests, and qualifying criteria for a specific user type (e.g., "Developer", "Enterprise Client").
- **leads/**: Stores contact information and profiling data for valuable prospects identified during conversations.
- **sessions/**: Stores the state of active and past interactions.

## Session File Specification (sessionId.md)
Each file in `sessions/` must follow this mandatory Markdown structure:

### Session ID Lifecycle
- `sessionId` can be provided explicitly by the caller.
- If omitted at CLI launcher level, `webCli/src/index.mjs` generates it automatically.
- In interactive CLI mode, the same generated/provided `sessionId` is reused for all turns until the process exits.
- In MCP mode (`-mcp`), one request uses one `sessionId` and exits.

### 1. Profile
Contains a list of filenames from `profilesInfo/` that are currently considered relevant to this session. 
- **Initialization**: Can start with multiple likely profiles.
- **Evolution**: The list is updated/narrowed down as more information is gathered from the user.

### 2. Profile Details
A structured list or narrative of important facts the agent has learned about the user (e.g., industry, company size, specific pain points, budget).

### 3. History
A chronological log of the interaction:
- **User**: [Input text]
- **Agent**: [Response text]
