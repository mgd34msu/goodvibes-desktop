# GoodVibes architecture documentation

## Overview

GoodVibes is an Electron-based desktop application that provides an enhanced interface for Claude CLI with session management, analytics, and Git integration. The application follows a standard Electron architecture with separate main and renderer processes.

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GOODVIBES                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐                    ┌─────────────────────────┐     │
│  │  Main Process   │◄──── IPC ────────►│   Renderer Process      │     │
│  │   (Node.js)     │    (preload.ts)    │     (React + Vite)      │     │
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
goodvibes/
├── src/
│   ├── main/                    # Main process code (Node.js)
│   │   ├── index.ts             # Application entry point
│   │   ├── window.ts            # Window management
│   │   ├── menu.ts              # Application menu
│   │   ├── preload.ts           # Preload script (IPC bridge)
│   │   ├── database/            # SQLite database layer
│   │   │   ├── index.ts         # Core database operations
│   │   │   ├── mappers.ts       # Row to type mappers
│   │   │   ├── collections.ts   # Collection operations
│   │   │   ├── prompts.ts       # Prompt library operations
│   │   │   ├── notes.ts         # Quick notes operations
│   │   │   ├── notifications.ts # Notification operations
│   │   │   ├── knowledge.ts     # Knowledge base operations
│   │   │   └── search.ts        # Search operations
│   │   └── services/            # Main process services
│   │       ├── terminalManager.ts  # PTY terminal management
│   │       ├── sessionManager.ts   # Session scanning/parsing
│   │       ├── git.ts              # Git operations
│   │       ├── github.ts           # GitHub OAuth and API
│   │       ├── logger.ts           # Logging service
│   │       └── recentProjects.ts   # Recent projects tracking
│   │
│   ├── renderer/                # Renderer process code (React)
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Main application component
│   │   ├── components/          # React components
│   │   │   ├── views/           # Main view components
│   │   │   │   ├── TerminalView.tsx
│   │   │   │   ├── SessionsView.tsx
│   │   │   │   ├── SettingsView.tsx
│   │   │   │   ├── AnalyticsView.tsx
│   │   │   │   ├── NotesView.tsx
│   │   │   │   ├── KnowledgeView.tsx
│   │   │   │   └── MonitorView.tsx
│   │   │   ├── overlays/        # Modal and overlay components
│   │   │   ├── common/          # Shared UI components
│   │   │   ├── layout/          # Layout components
│   │   │   ├── github/          # GitHub integration components
│   │   │   └── preview/         # Session preview components
│   │   ├── stores/              # Zustand state stores
│   │   │   ├── appStore.ts      # Application state
│   │   │   ├── terminalStore.ts # Terminal state
│   │   │   ├── settingsStore.ts # Settings state
│   │   │   └── toastStore.ts    # Toast notifications
│   │   └── hooks/               # Custom React hooks
│   │
│   └── shared/                  # Shared code between processes
│       ├── types/               # TypeScript type definitions
│       │   ├── index.ts         # Core types
│       │   └── github.ts        # GitHub-specific types
│       ├── constants.ts         # Shared constants
│       └── utils.ts             # Utility functions
│
├── test/                        # Test files
│   └── e2e/                     # Playwright E2E tests
│
├── assets/                      # Application assets
├── dist/                        # Build output
└── release/                     # Packaged application
```

## Component architecture

### Main process components

#### 1. Terminal manager (`terminalManager.ts`)
- Manages PTY (pseudo-terminal) instances using `node-pty`
- Handles terminal creation, input/output, and cleanup
- Provides resize functionality for terminal dimensions
- Tracks active terminal sessions

#### 2. Session manager (`sessionManager.ts`)
- Scans Claude session directories for JSONL files
- Parses session metadata and messages
- Tracks session changes using file modification times
- Provides session search and filtering

#### 3. Database layer (`database/`)
- Uses `better-sqlite3` for SQLite database
- WAL mode for better concurrent access
- Stores sessions, messages, settings, tags, collections, etc.
- Provides analytics aggregation queries

#### 4. Git service (`git.ts`)
- Executes Git commands via child processes
- Provides Git status, branch, log, diff operations
- Supports staging, committing, pushing, pulling
- Handles merge conflicts and stash operations

#### 5. GitHub service (`github.ts`)
- OAuth authentication flow with custom protocol
- Manages access tokens with secure storage
- Provides GitHub API operations (repos, PRs, issues)
- Supports CI/CD status checking

### Renderer process components

#### 1. View components
- **TerminalView**: xterm.js terminal with tabs
- **SessionsView**: Virtual scrolling session list
- **SettingsView**: Application settings UI
- **AnalyticsView**: Usage statistics and charts
- **NotesView**: Quick notes management
- **KnowledgeView**: Knowledge base articles
- **MonitorView**: Real-time session monitoring

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

### Preload script (`preload.ts`)
The preload script creates a secure bridge between main and renderer processes:

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

### Security
- Context isolation enabled
- Node integration disabled in renderer
- All main process access goes through preload script
- Sensitive data (tokens) stored in encrypted electron-store

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

### Core tables
- `sessions`: Session metadata
- `messages`: Session messages
- `tags`: User-defined tags
- `session_tags`: Tag assignments
- `collections`: Session collections
- `smart_collections`: Dynamic collections
- `settings`: User settings
- `prompts`: Prompt library
- `quick_notes`: Quick notes
- `notifications`: User notifications
- `knowledge_entries`: Knowledge base
- `tool_usage`: Tool usage statistics
- `activity_log`: User activity log

## Build system

### Development
- Vite for renderer process (hot reload)
- TypeScript compiler for main process
- Concurrent development with `concurrently`

### Production
- Vite builds optimized renderer bundle
- TypeScript compiles to ESM modules
- `electron-builder` packages application

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

### OAuth security
- State parameter for CSRF protection
- Custom protocol callback (goodvibes://)
- Token encryption in electron-store

### Process isolation
- Context isolation enabled
- No direct Node.js access in renderer
- All IPC calls validated

### Data protection
- Encrypted storage for credentials
- No sensitive data in logs
- Secure session handling
