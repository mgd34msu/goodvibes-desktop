# GoodVibes architecture documentation

## Overview

GoodVibes is an Electron desktop application that wraps the Claude CLI, adding session
management, analytics, and Git and GitHub integration around it. It follows a standard
Electron split, with a main process for anything needing operating system access and a
renderer process for the React interface.

Two facts shape most of the design. First, GoodVibes does not own the session data. The Claude
CLI writes JSONL transcripts under `~/.claude/projects`, and GoodVibes scans and parses those,
which is why analytics cover sessions started outside the app. Second, the renderer has no
Node.js access at all, so every capability it has is a channel the main process chose to
expose through the preload layer.

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GOODVIBES                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐                    ┌─────────────────────────┐     │
│  │  Main Process   │◄──── IPC ────────►│   Renderer Process      │     │
│  │   (Node.js)     │    (src/preload)   │     (React + Vite)      │     │
│  │                 │                    │                         │     │
│  │  ┌───────────┐  │                    │  ┌─────────────────┐   │     │
│  │  │ Services  │  │                    │  │   Components    │   │     │
│  │  │  - PTY    │  │                    │  │   - Views       │   │     │
│  │  │  - Git    │  │                    │  │   - Overlays    │   │     │
│  │  │  - GitHub │  │                    │  │   - Common      │   │     │
│  │  │  - Logger │  │                    │  └─────────────────┘   │     │
│  │  └───────────┘  │                    │                         │     │
│  │                 │                    │  ┌─────────────────┐   │     │
│  │  ┌───────────┐  │                    │  │    Stores       │   │     │
│  │  │ Database  │  │                    │  │   (Zustand)     │   │     │
│  │  │ (SQLite)  │  │                    │  └─────────────────┘   │     │
│  │  └───────────┘  │                    │                         │     │
│  └─────────────────┘                    └─────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Directory structure

```
goodvibes-desktop/
├── src/
│   ├── main/                    # Main process code (Node.js)
│   │   ├── index.ts             # Application entry point
│   │   ├── window.ts            # Window management
│   │   ├── menu.ts              # Application menu
│   │   ├── lifecycle/           # Startup, shutdown, single-instance handling
│   │   ├── ipc/                 # The IPC surface
│   │   │   ├── handlers/        # One module per domain
│   │   │   ├── schemas/         # Zod schemas validating inbound payloads
│   │   │   └── utils/
│   │   ├── database/            # SQLite database layer
│   │   │   ├── connection.ts    # Database handle and pragmas
│   │   │   ├── index.ts         # Core database operations
│   │   │   ├── migrations.ts    # Versioned schema upgrades
│   │   │   ├── mappers.ts       # Row to type mappers
│   │   │   ├── primitives/      # MCP servers, agents, skills, tasks
│   │   │   ├── projectRegistry/ # Registered projects and their settings
│   │   │   ├── sessionSummaries/, hookEvents/, agencyIndex/
│   │   │   └── ...              # collections, prompts, notes, knowledge, search
│   │   ├── services/            # Main process services
│   │   │   ├── terminalManager.ts  # PTY terminal management
│   │   │   ├── tmuxService.ts      # Optional tmux session wrapping
│   │   │   ├── sessionManager/     # Session scanning and parsing
│   │   │   ├── git/                # Git operations
│   │   │   ├── github/             # GitHub OAuth and API
│   │   │   ├── hookServer/         # Receives hook callbacks from the CLI
│   │   │   ├── hookScripts/        # Generates the scripts the CLI invokes
│   │   │   ├── mcpManager/         # MCP server configuration and status
│   │   │   ├── projectRegistry/, projectCoordinator/
│   │   │   ├── recommendationEngine/, testMonitor/, ptyStreamAnalyzer/
│   │   │   ├── logger.ts           # Logging service
│   │   │   └── recentProjects.ts   # Recent projects tracking
│   │   └── utils/
│   │
│   ├── preload/                 # Preload script (IPC bridge)
│   │   ├── index.ts             # Composes the API and exposes window.goodvibes
│   │   └── api/                 # terminal, sessions, git, github, hooks, ...
│   │
│   ├── renderer/                # Renderer process code (React)
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Main application component
│   │   ├── components/          # React components
│   │   │   ├── views/           # Main view components
│   │   │   │   ├── TerminalView.tsx
│   │   │   │   ├── AnalyticsView.tsx
│   │   │   │   ├── NotebookView.tsx    # Knowledge entries
│   │   │   │   ├── TasksView.tsx       # Quick notes
│   │   │   │   ├── MCPView.tsx
│   │   │   │   ├── SessionsView/       # Session list and MonitorPanel
│   │   │   │   ├── SettingsView/
│   │   │   │   ├── AgentsView/, SkillsView/, CommandsView/
│   │   │   │   ├── HooksView/, MemoryView/, FilesView/
│   │   │   │   └── PluginsView/, ProjectRegistryView/
│   │   │   ├── overlays/        # Modal and overlay components
│   │   │   ├── common/          # Shared UI components
│   │   │   ├── layout/          # Layout components
│   │   │   ├── terminal/        # xterm.js host and terminal chrome
│   │   │   ├── git/             # Git panel
│   │   │   ├── github/          # GitHub integration components
│   │   │   ├── onboarding/      # First-run flow
│   │   │   ├── recommendations/ # Suggested skills and tags
│   │   │   └── preview/         # File and session preview components
│   │   ├── stores/              # Zustand state stores
│   │   │   ├── appStore.ts      # Application state
│   │   │   ├── terminalStore.ts # Terminal state
│   │   │   ├── settingsStore.ts # Settings state
│   │   │   └── toastStore.ts    # Toast notifications
│   │   ├── themes/              # Built-in color themes
│   │   ├── contexts/            # React contexts
│   │   └── hooks/               # Custom React hooks
│   │
│   └── shared/                  # Shared code between processes
│       ├── types/               # TypeScript type definitions
│       │   ├── index.ts         # Core types
│       │   └── github.ts        # GitHub-specific types
│       ├── constants.ts         # Shared constants
│       ├── logger.ts            # Shared logger utility
│       ├── dateUtils.ts         # Date formatting helpers
│       ├── toolParser.ts        # Extracts tool calls from transcripts
│       └── utils.ts             # Utility functions
│
├── test/                        # Playwright E2E tests
├── scripts/ci/                  # Ratchet gates and their recorded baseline
├── assets/                      # Application assets
├── build/                       # Icons and packaging resources
├── out/                         # Build output
└── release/                     # Packaged application
```

## Component architecture

### Main process components

#### 1. Terminal manager (`terminalManager.ts`)
- Manages PTY (pseudo-terminal) instances using `node-pty`. A PTY is what makes the CLI behave
  as it would in a real shell, including colors, prompts, and interactive input
- Starts two kinds of terminal, a Claude CLI session and a plain system shell
- Handles terminal creation, input, output, resize, and cleanup
- Writes large input in chunks so a paste cannot overwhelm the PTY
- Tracks active terminals and closes them all on shutdown

#### 2. Tmux service (`tmuxService.ts`)
- Detects whether tmux is installed and resolves its path
- Wraps the terminal command so the session lives inside tmux and survives the app closing
- Supports one shared session for all terminals or a separate session per terminal, chosen by
  the `tmuxMode` setting
- Uses array-form `execFileSync` so session names cannot be turned into shell injection

#### 3. Session manager (`sessionManager/`)
- Scans `~/.claude/projects` for the JSONL transcripts the Claude CLI writes
- Parses session metadata and messages out of those files
- Tracks session changes using file modification times
- Provides session search and filtering
- Fetches current model prices from Anthropic's published pricing page and falls back to a
  built-in table, which is what makes the cost figures possible

#### 4. Database layer (`database/`)
- Uses `better-sqlite3`, a synchronous SQLite driver, so queries need no async plumbing
- Sets `journal_mode = WAL` for concurrent reads, and enables foreign key enforcement
- Stores sessions, messages, settings, tags, collections, and the configuration for hooks,
  MCP servers, skills, agents, and projects
- Provides the aggregation queries behind the analytics views

#### 5. Git service (`git/`)
- Executes Git commands via child processes
- Covers status, branch, log, and diff, plus staging, committing, pushing, and pulling
- Also covers stashes, merges, rebases, cherry-picks, tags, remotes, worktrees, submodules,
  blame, file history, and reflog recovery
- Handles merge conflicts, including resolving a file to ours or theirs
- A watcher (`gitWatcher.ts`) reports working tree changes so the panel refreshes on its own

#### 6. GitHub service (`github/`)
- Device Flow authentication, with a client ID compiled into the build so sign-in works with
  no configuration
- Optionally uses a user-supplied OAuth App, which is what enables the Authorization Code Flow,
  since that flow needs a client secret the shipped app does not carry
- Stores tokens in an `electron-store` file keyed by machine identifiers, described under
  [Security model](#security-model)
- Provides API operations through Octokit for repositories, pull requests, issues, branches,
  and organizations
- Reads commit status, checks, and workflow runs for CI reporting

#### 7. Hook services (`hookServer/`, `hookScripts/`)
- `hookScripts` generates the scripts the Claude CLI invokes and registers them in its config
- `hookServer` runs a local server those scripts call back into, so a hook decision is made in
  the app rather than in the script
- A refusal from a `PreToolUse` hook becomes a `deny` permission decision, which is how a tool
  call gets blocked. Later events can add context but cannot undo work already done
- Every fired event is recorded in the `hook_events` table

### Renderer process components

#### 1. View components
- **TerminalView**: xterm.js terminal with tabs
- **SessionsView**: Virtual scrolling session list
- **SettingsView**: Application settings UI
- **AnalyticsView**: Usage statistics and charts
- **TasksView**: Quick notes management, backed by the `quick_notes` table
- **NotebookView**: Knowledge base articles, backed by the `knowledge_entries` table
- **MonitorPanel**: Real-time session monitoring, living inside `SessionsView/` rather than as
  a view of its own
- **AgentsView, SkillsView, CommandsView**: Agent templates, `SKILL.md` skills, and slash
  commands, each managed separately
- **HooksView, MCPView, PluginsView**: Hook, MCP server, and plugin configuration
- **MemoryView**: CLAUDE.md editor with a file tree and templates
- **FilesView**: File explorer with the preview pane
- **ProjectRegistryView**: Registered projects and their per-project settings

#### 2. State management (Zustand)
- **appStore**: Current view, modals, global state
- **terminalStore**: Terminal instances, active tab
- **settingsStore**: User preferences with persistence
- **toastStore**: Toast notification queue

#### 3. Data fetching (React Query)
- Manages server state for sessions, analytics
- Provides caching and background refetching
- Handles loading and error states

## IPC communication

### Preload script (`src/preload/`)
The preload layer is split into one module per domain under `api/`, which `index.ts` merges
into a single object and publishes with `contextBridge.exposeInMainWorld('goodvibes', api)`.
The renderer therefore reaches the main process only through named methods that were
deliberately exported:

```typescript
// Example IPC channel
window.goodvibes = {
  // Terminal operations
  startClaude: (options) => ipcRenderer.invoke('start-claude', options),
  terminalInput: (id, data) => ipcRenderer.invoke('terminal-input', id, data),

  // Session operations
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getSessionMessages: (id) => ipcRenderer.invoke('get-session-messages', id),

  // Event listeners
  onTerminalData: (callback) => ipcRenderer.on('terminal-data', callback),
};
```

### Validation
Each channel has a handler in `src/main/ipc/handlers/` and, for anything taking arguments, a
Zod schema in `src/main/ipc/schemas/`. The handler parses the payload against the schema before
acting, so a malformed or oversized argument is rejected at the boundary rather than reaching
a Git command or a database write.

### Security
- Context isolation enabled and Node integration disabled in the renderer, both set in
  `src/main/window.ts`
- All main process access goes through the preload script
- `sandbox` is set to `false`, which the preload modules rely on for Node built-ins. The
  renderer itself is still isolated by the two settings above
- GitHub tokens are held in an `electron-store` file, discussed under
  [Security model](#security-model)

## Data flow

### Terminal data flow
```
User Input → Renderer → IPC → Main Process → PTY → Claude CLI
                                                     ↓
Display ← Renderer ← IPC ← Main Process ← PTY ← Claude CLI
```

### Session data flow
```
Claude CLI → JSONL Files → Session Scanner → Database
                                              ↓
UI Display ← React Query ← IPC ← Database Query
```

## Database schema

The schema spans just over fifty tables. Rather than list them all, the table below names the
groups and a representative member of each.

| Group | Representative tables | Holds |
|---|---|---|
| Sessions | `sessions`, `messages`, `session_summaries`, `session_analytics`, `session_checkpoints`, `session_links` | Transcripts scanned from the CLI, plus derived per-session metrics |
| Organization | `tags`, `session_tags`, `recent_tags`, `tag_templates`, `collections`, `smart_collections`, `bookmarks`, `saved_searches` | User-applied structure over sessions. Smart collections are rule-driven rather than hand-filled |
| Configuration | `settings`, `hooks`, `hook_events`, `mcp_servers`, `skills`, `task_definitions` | How the app and CLI are configured, and a record of every hook that fired |
| Agents | `agent_templates`, `agent_registry`, `active_agents`, `agent_tree_nodes`, `agent_metrics`, `indexed_agents` | Saved agent configurations and the live tree of running agents |
| Projects | `registered_projects`, `project_configs`, `project_agents`, `project_templates`, `cross_project_sessions` | The project registry and per-project settings |
| Usage and cost | `tool_usage`, `tool_usage_detailed`, `analytics_snapshots`, `budgets`, `activity_log` | Aggregates behind the analytics views and budget alerts |
| Notes and knowledge | `quick_notes`, `knowledge_entries`, `prompts`, `notifications`, `posts` | Content authored in the app rather than produced by Claude |
| Recommendations | `recommendations`, `suggestion_feedback`, `tag_suggestions`, `indexed_skills`, `queued_skills` | Suggested skills and tags, with the feedback used to rank them |
| Approvals | `approval_policies`, `approval_queue` | Rules for actions needing confirmation, and the queue of pending ones |
| Bookkeeping | `schema_versions` | Migration state |

## Build system

`electron-vite` drives all three source trees, so main, preload, and renderer are configured
in one place and share the TypeScript path aliases.

### Development
- `npm run dev` starts electron-vite in watch mode
- The renderer hot-reloads, and edits to main or preload restart the Electron process

### Production
- `npm run build` emits main, preload, and renderer bundles into `out/` as ESM
- `electron-builder` packages the result, producing a Windows portable directory, a macOS zip,
  and a Linux AppImage

## Testing strategy

### Unit tests (Vitest)
- Store tests for state management
- Service tests for business logic
- Component tests for UI behavior

### E2E tests (Playwright)
- Application launch and navigation
- Terminal operations
- Settings persistence
- GitHub integration flow

### Database tests
- Uses in-memory SQLite for isolation
- Tests all CRUD operations
- Verifies foreign key constraints

### Ratchet gates
The suite is not green today, and CI is built around that rather than pretending otherwise.
Three scripts in `scripts/ci/` compare the current tree against recorded numbers in
`test-baseline.json`, which lists the failing test files, the TypeScript diagnostic count per
project, and the ESLint error and warning counts.

A build fails when any count rises above its baseline, when a test file fails that is not
already on the list, or when a listed file no longer exists. Existing debt is therefore frozen
in place while new breakage is rejected, and the baseline may only ever shrink. Read the
numbers there as a debt register, not as a target.

## Performance considerations

### Virtual scrolling
- Session list uses `@tanstack/react-virtual`
- Only renders visible items
- Handles thousands of sessions efficiently

### Database optimization
- WAL mode for concurrent reads
- Indexes on frequently queried columns
- Prepared statements for repeated queries

### Memory management
- Terminal instances cleaned up on close
- React Query cache limits
- Proper event listener cleanup

## Error handling

### Main process
- Centralized logging service
- Graceful error recovery
- Error events sent to renderer

### Renderer process
- Error boundaries for component failures
- Toast notifications for user feedback
- React Query error states

## Security model

### OAuth
- Device Flow is the default and needs no client secret, since GitHub authorizes the app by
  having the user enter a code on github.com
- The Authorization Code Flow is available only when the user supplies their own OAuth App,
  and it carries a state parameter so a callback cannot be replayed from elsewhere
- That flow returns through the `goodvibes://` URL scheme, registered with the operating
  system by the app and declared in `build.protocols` in `package.json`

### How GitHub tokens are actually stored
This is worth stating plainly, because the protection is weaker than "encrypted" suggests.
Tokens live in an `electron-store` file named `github-auth` inside the app's user data
directory. The store's `encryptionKey` is derived in `services/github/credentials.ts` by
hashing the machine's hostname, platform, architecture, home directory, and user data path.

Every input to that hash is readable by any process running as the same user, so such a process
can derive the key and read the token. What the scheme does buy is that the file is not
plaintext, so the token does not leak through a casual look at the file, a screen share, or a
backup being browsed. The code says as much in a comment and names an OS keychain as the
stronger option. Treat a stored token as recoverable by anything running under the user's
account.

### Process isolation
- Context isolation enabled, Node integration disabled
- The renderer reaches the main process only through the preload API
- IPC payloads are validated against Zod schemas before a handler acts
- `sandbox` is `false`, so the preload script can use Node built-ins

### Data protection
- Access tokens are kept out of log output
- `safeExec.ts` runs external commands with array-form arguments rather than a shell string,
  so a file path, branch name, or tmux session name cannot be read as a command
- `inputSanitizer.ts` validates user input before it reaches `spawn` or a child process
- `policyEngine.ts` matches permission requests against configured policies, deciding whether
  to auto-approve, auto-deny, or hold the request for manual review in `approval_queue`
