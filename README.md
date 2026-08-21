# GoodVibes

![GoodVibes](assets/goodvibes.png)

GoodVibes is an Electron desktop application that wraps the Claude CLI in a graphical
workspace. It runs your Claude sessions in real terminals, reads the transcripts the CLI
writes to disk so it can report usage and cost, and puts the surrounding work in reach
without leaving the window, including Git, GitHub, hooks, MCP servers, skills, agent
templates, and your CLAUDE.md files.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.5-blue.svg)](https://github.com/mgd34msu/goodvibes-desktop)
[![Claude Code Platform](https://img.shields.io/badge/Claude%20Code-Platform-purple.svg)](https://claude.com/claude-code)
[![Vibe Development Environment](https://img.shields.io/badge/Vibe%20Development%20Environment-VDE-green.svg)](https://goodvibes.sh)

## Features

Each item below is a view in the application, reachable from the main navigation. Terminals
are the only place Claude actually runs. Everything else either configures a session before
it starts or reports on sessions that already ran.

- **Terminal management.** Several terminals at once, each in its own tab and each backed by
  its own pseudo-terminal process. A tab runs either a Claude CLI session or a plain system
  shell, so you can keep a build or a log next to the conversation driving it. When tmux is
  installed, GoodVibes can launch sessions inside it so they survive closing the app, either
  sharing one tmux session or taking one per terminal.
- **Session analytics.** Totals for session count, token consumption, cost, and average
  tokens per session, alongside cost split by project, a tool usage breakdown, a twelve week
  activity heatmap, and thirty day trends for both cost and session volume. Model prices are
  refreshed from Anthropic's published pricing page, with a built-in table used when that
  fetch fails.
- **Git panel.** Ordinary staging, committing, and branch work, plus the operations that
  usually send you back to a command line. Stashes, merges, rebases, cherry-picks, tags,
  remotes, worktrees, submodules, blame, per-file history, reflog recovery, and conflict
  resolution with ours and theirs shortcuts are all driven from the panel. The working tree is
  watched, so it reflects changes made outside the app.
- **GitHub integration.** Repositories, pull requests, issues, commit status and checks,
  workflow runs, organizations, and branches, through the official Octokit client. Signing in
  uses GitHub's Device Flow and needs no setup, because a client ID ships with the app.
- **Hooks.** Shell commands that Claude runs at six defined moments in a session, used to
  block risky tool calls, enforce project rules, or trigger side work. GoodVibes generates the
  hook scripts, registers them with the CLI, runs a local server to receive the callbacks,
  records every fired event, and offers a panel for testing a hook before you rely on it.
- **MCP server management.** Model Context Protocol servers extend Claude with tools it does
  not ship with. GoodVibes stores each server's transport, launch command or URL, arguments,
  and environment, scopes it to your user account or a single project, and reports whether it
  is connected and how many tools it exposes. A marketplace view lists servers you can add.
- **Skills library.** A skill is a `SKILL.md` document holding a reusable procedure, along
  with the tools it is permitted to use. Skills are scoped to your user account or one
  project, and GoodVibes counts how often each is used so the ones earning their keep are
  obvious. Slash commands are managed separately in their own view.
- **Agent templates.** A saved starting configuration for a Claude session, covering working
  directory, opening prompt, CLAUDE.md content, CLI flags, model, permission mode, and the
  tool allow and deny lists. Applying one launches a session already set up that way.
- **Project registry.** Registers the projects you work in and keeps per-project settings,
  analytics, and session history against each. Projects can be created from templates and
  have agents assigned to them, and a coordinator tracks agents running across several
  projects at once.
- **Memory management.** An editor for the CLAUDE.md files that give Claude standing
  instructions, with a tree of the files it found, a Markdown editor, and starter templates.
  Both user level and project level files are editable.
- **Plugin management.** Installs, enables, and removes Claude Code plugins from a
  repository, scoped either to your user account or to one project.

## Screenshots

### Welcome screen

The opening screen offers the four ways to start work. Begin a new Claude CLI session, pick
up a recent one where it left off, open the built-in text editor, or drop into a plain system
shell.

![Welcome Screen](assets/screenshots/welcome.png)

### Terminal

The terminal view runs the session and keeps its context beside it. Tabs across the top hold
the running terminals, and the surrounding panes carry the Git panel, recent sessions, and a
preview of the session being read.

![Terminal](assets/screenshots/terminal.png)

### Session history & live monitor

Browse past sessions with filtering and search. The monitor panel tracks sessions that are
still running and reports their activity as it happens.

![Session History](assets/screenshots/session-history.png)

### Session detail

Open any session for a breakdown of token usage, cost, duration, messages, and which tools it
called.

![Session Detail](assets/screenshots/session-detail.png)

### Analytics dashboard

Cost and token totals, cost split by project, tool usage, a twelve week activity heatmap, and
thirty day trends for spend and session volume.

![Analytics Dashboard](assets/screenshots/analytics-dashboard.png)

### File manager

A file explorer with a tree view, an icon grid, and a preview pane that renders Markdown,
highlights source code, and reports file metadata.

![File Manager](assets/screenshots/file-manager.png)

The session view shows Claude CLI session history with commit details and conversation
previews inside the same explorer.

![File Manager - Sessions](assets/screenshots/file-manager-sessions.png)

### Project registry

Register the projects you work in and manage them from one place. Each keeps its own
settings, sessions, token usage, and cost.

![Project Registry](assets/screenshots/project-registry.png)

### Hooks

Attach shell commands to the six session events GoodVibes supports, so you can block risky
tool calls, restrict file access, or run project rules automatically. A test panel exercises a
hook before you depend on it.

![Hooks](assets/screenshots/hooks.png)

These are the six events a hook can be attached to, and what each one can do when it runs.
A hook returns a decision, and only some events can act on a refusal:

| Event | Fires | Effect of a refusal |
|---|---|---|
| `PreToolUse` | Before Claude runs a tool | Denies the tool call and returns your reason to Claude. This is the event that blocks a command outright, and it can also hand back a rewritten input instead. |
| `PostToolUse` | After a tool has run | Cannot undo the call. It can add context for Claude to take into account next. |
| `SessionStart` | When a session begins | Cannot stop the session. Used to inject standing context at the start. |
| `SessionEnd` | When a session finishes | Advisory. Used for cleanup and record keeping. |
| `Notification` | When the CLI raises a notification | Advisory. Used to route alerts elsewhere. |
| `Stop` | When Claude is about to stop responding | Refusing keeps the turn going and passes back your stated reason, so Claude continues instead of ending. |

Hooks run as real commands with your permissions. Treat a hook the same way you would treat a
Git hook, and read anything you did not write before enabling it.

### Skills library

Create and manage skills, the reusable `SKILL.md` procedures Claude can draw on for recurring
work such as code review, security audits, and refactoring. Each skill records the tools it
may use and how often it has been used. Slash commands live in a separate view.

![Skills](assets/screenshots/skills.png)

### Agent templates

Saved session configurations for specialized work, each fixing a working directory, opening
prompt, model, permission mode, and tool permissions.

![Agents](assets/screenshots/agents.png)

### Settings

Themes and display options sit alongside terminal and shell selection, Claude CLI flags, Git
and GitHub configuration, budget alerts, timezone and tmux behavior, keyboard shortcuts, and
backup and maintenance tools.

![Settings](assets/screenshots/settings.png)

## Installation

Download the latest release for your operating system from the [Releases page](https://github.com/mgd34msu/goodvibes-desktop/releases):

| Platform | Download | Notes |
|----------|----------|-------|
| Windows | `GoodVibes-x.x.x-win-portable.zip` | Portable build, unzip and run, no installer |
| macOS | `GoodVibes-x.x.x-mac.zip` | Unzip and move `GoodVibes.app` to Applications |
| Linux | `GoodVibes-x.x.x.AppImage` | Mark executable with `chmod +x` before the first run |

Linux needs two extra pieces of setup covered in [Linux setup](#linux-setup) below, one so a
desktop launcher can find the `claude` binary and one to register the app in your application
menu.

## GoodVibes plugin: highly recommended

For the best experience, we recommend using GoodVibes alongside the **GoodVibes Plugin** for Claude Code. The plugin provides:

- **Directed or Autonomous Modes**: Vibecoding mode gives interactive feedback as you guide the orchestrator, Justvibes mode is full auto
- **Specialized Agents**: Pre-configured agents for frontend, backend, testing, DevOps, and more
- **Skills Library**: Reusable slash commands for common workflows (security audits, code reviews, etc.)
- **MCP Tools**: Extended tooling via Model Context Protocol for code intelligence, validation, and automation

### Quick-install plugin

Copy/Paste these into your terminal of choice. 

#### Linux / MacOS
```
curl -sL https://goodvibes.sh/install-plugin.sh | bash
```
#### Windows (Powershell)
```
powershell -ExecutionPolicy Bypass -NoProfile -Command "& { $(Invoke-RestMethod -Uri https://goodvibes.sh/install-plugin.ps1) }"
```

#### Download links
- Linux & MacOS: [https://goodvibes.sh/install-plugin.sh](https://goodvibes.sh/install-plugin.sh)
- MacOS [interactive]: [https://goodvibes.sh/install-plugin.command](https://goodvibes.sh/install-plugin.command)
- Windows [powershell]: [https://goodvibes.sh/install-plugin.ps1](https://goodvibes.sh/install-plugin.ps1)
- Windows [cmd.exe]: [https://goodvibes.sh/install-plugin.bat](https://goodvibes.sh/install-plugin.bat)

**Goodvibes Plugin Repo:** [github.com/mgd34msu/goodvibes-plugin](https://github.com/mgd34msu/goodvibes-plugin)

#### Important security notes

Users are **STRONGLY** encouraged to download and inspect these scripts **AND** the plugin source code prior to running / installing them.
Regardless of what some may claim, as of January 31st 2026, **ALL** CLI plugins and MCP servers have unrestricted access to read, write, and execute code on your computer. 
This is true for OpenAI, Google, and Anthropic CLIs, as well as any third-party CLIs. The problem is inherent in 1) the MCP standard and 2) with plugins being granted the same rights as native tools.

## GitHub integration

GoodVibes talks to GitHub for pull requests, issues, repositories, branches, commit status and
checks, workflow runs, and organization listings. Sign-in uses GitHub's OAuth Device Flow,
which authorizes the app by having you type a short code into github.com rather than by
handling your password or storing a client secret.

### Default configuration

A client ID for a shared GoodVibes OAuth App is compiled into the build, so Device Flow works
on a fresh install with nothing to configure. Open **Settings -> GitHub** and choose to sign
in. Device Flow is the only sign-in path available by default, because the Authorization Code
Flow additionally needs a client secret, which is deliberately not shipped.

### Where your token is kept

The access token is written to an `electron-store` file in the app's user data directory,
obfuscated with a key derived from your machine's hostname, platform, architecture, home
directory, and user data path. That stops the token being read at a glance from the file, and
it does not defend against a program already running under your own account, which can derive
the same key. Treat the token as recoverable by anything with access to your user session, and
revoke it from GitHub if that machine is ever shared or lost.

### Custom OAuth App (optional)

Point GoodVibes at an OAuth App you own instead of the shared one. Doing so is what unlocks
the Authorization Code Flow, since you supply the client secret the built-in app does not
carry.

1. **Create a GitHub OAuth App** at [github.com/settings/developers](https://github.com/settings/developers)
   - GitHub's own walkthrough is [Creating an OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
   - **Application name** and **Homepage URL** can be anything
   - Set the **Authorization callback URL** to `goodvibes://oauth/callback`, the custom URL
     scheme GoodVibes registers with your operating system so GitHub can hand the browser
     back to the app

2. **Configure in GoodVibes**
   - Go to **Settings -> GitHub -> Custom OAuth App -> Configure**
   - Enter your **Client ID**
   - Choose **Device Flow** (recommended) or **Authorization Code Flow**
   - Authorization Code Flow also needs your **Client Secret**

### Why use a custom OAuth App?

| Question | Built-in app | Your own app |
|---|---|---|
| Setup required | None, a client ID ships with the build | Create the app on GitHub and enter its client ID |
| Sign-in methods | Device Flow only | Device Flow or Authorization Code Flow |
| Whose entry appears in your GitHub authorized apps list | A shared GoodVibes entry, indistinguishable from other users' | Your own, revocable on its own |
| Who sets the requested scopes | Fixed by the shipped app | You do, when you create the app |
| Audit trail | Shared client ID across all installs | Your client ID alone, so the app's activity is attributable to you |

The built-in app is a normal OAuth App with no special privileges, and it can only do what the
scopes you approve allow. Running your own matters when you need the GitHub-side authorization
record and the scope list to belong to you rather than to a shared identity, which is the usual
requirement for work repositories under an organization policy.

## Prerequisites

A packaged release bundles its own runtime, so running GoodVibes needs only the tools it
drives:

| Requirement | Why it is needed |
|---|---|
| Claude CLI, installed and signed in | GoodVibes launches `claude` in a terminal and reads the session transcripts it writes. Without it the terminal tabs have nothing to run. |
| Git | Required by the Git panel and by any GitHub feature that reads the current repository. |
| Windows, macOS, or Linux | All three are built and released. See [Linux setup](#linux-setup) for two extra steps on Linux. |
| tmux (optional) | Only needed to keep terminal sessions alive across an app restart. Everything else works without it. |

Building from source needs Node.js and npm as well. Continuous integration builds on **Node
26**, which is the version to match if a build behaves differently for you. The project sets no
`engines` field, so npm will not stop an older Node, and older versions are untested rather
than explicitly supported.

## Linux setup

When running GoodVibes from a desktop launcher (not a terminal), your shell's PATH modifications from `.bashrc` or `.zshrc` may not be available. This can prevent GoodVibes from finding the `claude` CLI.

### Fix PATH for desktop apps

Add your local bin directory to the systemd user environment:

```bash
mkdir -p ~/.config/environment.d
echo 'PATH="$HOME/.local/bin:$PATH"' > ~/.config/environment.d/path.conf
```

Then **log out and back in** for changes to take effect.

### AppImage desktop entry

To create a desktop entry for the AppImage with proper flags:

1. Download the AppImage to a permanent location (e.g., `~/.local/bin/GoodVibes.AppImage`)
2. Make it executable: `chmod +x ~/.local/bin/GoodVibes.AppImage`
3. Create a desktop entry:

```bash
cat > ~/.local/share/applications/goodvibes.desktop << 'EOF'
[Desktop Entry]
Name=GoodVibes
Comment=Enhanced Claude CLI Interface
Exec=$HOME/.local/bin/GoodVibes.AppImage --no-sandbox %U
Icon=goodvibes
Type=Application
Categories=Development;
StartupWMClass=GoodVibes
MimeType=x-scheme-handler/goodvibes;
EOF
```

**Note:** The `--no-sandbox` flag may be required on some Linux distributions when running AppImages. If GoodVibes launches without issues, you can omit this flag.

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/mgd34msu/goodvibes-desktop.git
   cd goodvibes-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## Development commands

Every script defined in `package.json`, grouped by what it is for.

### Running and building

| Command | Description |
|---------|-------------|
| `npm run dev` | Start electron-vite in development mode with hot reload |
| `npm run build` | Compile main, preload, and renderer bundles into `out/` |
| `npm run start` | Launch the built app from `out/`, the same as `npm run preview` |
| `npm run preview` | Alias of `npm run start` |

### Checks

| Command | Description |
|---------|-------------|
| `npm run test` | Run the Vitest unit and component suite |
| `npm run test:ui` | Run the same suite in Vitest's browser interface |
| `npm run test:coverage` | Run the suite and produce a coverage report |
| `npm run test:e2e` | Run the Playwright end-to-end suite |
| `npm run lint` | Run ESLint over `src` for `.ts` and `.tsx` |
| `npm run lint:fix` | Run ESLint and apply the fixes it can make automatically |
| `npm run typecheck` | Type check the renderer and main projects with `tsc --noEmit` |

Continuous integration does not require these to be clean. Each of test, typecheck, and lint
runs through a ratchet script in `scripts/ci/` that compares the result against a recorded
baseline in `scripts/ci/test-baseline.json`. The build fails when a count rises above its
baseline or when a test file fails that is not already on the known-failing list, so existing
debt is held in place while new breakage is rejected.

### Packaging and release

| Command | Description |
|---------|-------------|
| `npm run package` | Build, then package for the current platform with electron-builder |
| `npm run package:win` | Build and package the Windows portable directory |
| `npm run package:mac` | Build and package the macOS zip |
| `npm run package:linux` | Build and package the Linux AppImage |
| `npm run package:all` | Build and package all three platforms in one run |
| `npm run release` | Run `scripts/release.sh` for a patch release |
| `npm run release:minor` | Same release script, bumping the minor version |
| `npm run release:major` | Same release script, bumping the major version |

## Architecture overview

GoodVibes is a standard Electron application with three source trees. The main process holds
everything needing operating system access, the renderer holds the React interface, and a
preload layer is the only channel between them.

```
goodvibes-desktop/
├── src/
│   ├── main/                    # Main process (Node.js)
│   │   ├── index.ts             # Application entry point
│   │   ├── window.ts            # Window creation and lifecycle
│   │   ├── menu.ts              # Native application menu
│   │   ├── lifecycle/           # Startup, shutdown, single-instance logic
│   │   ├── ipc/                 # IPC surface
│   │   │   ├── handlers/        # One module per domain (git, sessions, hooks, ...)
│   │   │   └── schemas/         # Zod schemas validating every inbound payload
│   │   ├── database/            # SQLite layer, one module per feature area
│   │   │   ├── connection.ts    # Database handle and pragmas
│   │   │   ├── migrations.ts    # Schema migrations
│   │   │   └── ...              # sessions, messages, tags, primitives, ...
│   │   ├── services/            # Business logic
│   │   │   ├── terminalManager.ts   # PTY lifecycle
│   │   │   ├── tmuxService.ts       # Optional tmux wrapping
│   │   │   ├── sessionManager/      # Scans and parses Claude CLI transcripts
│   │   │   ├── git/                 # Git operations
│   │   │   ├── github/              # GitHub OAuth and API
│   │   │   ├── hookServer/          # Receives hook callbacks from the CLI
│   │   │   ├── mcpManager/          # MCP server configuration and status
│   │   │   └── ...
│   │   └── utils/
│   │
│   ├── preload/                 # contextBridge layer, the only main/renderer path
│   │   ├── index.ts             # Composes the modules and exposes window.goodvibes
│   │   └── api/                 # terminal, sessions, git, github, hooks, ...
│   │
│   ├── renderer/                # Renderer process (React)
│   │   ├── components/
│   │   │   ├── views/           # One directory or file per main view
│   │   │   ├── overlays/        # Modals and the command palette
│   │   │   ├── terminal/        # xterm.js host and terminal chrome
│   │   │   ├── git/             # Git panel
│   │   │   ├── github/          # GitHub panel
│   │   │   ├── preview/         # File and session preview panes
│   │   │   ├── onboarding/      # First-run flow
│   │   │   ├── layout/          # Title bar, navigation, shell
│   │   │   └── common/          # Shared UI components
│   │   ├── stores/              # Zustand stores (app, terminal, settings, toast)
│   │   ├── themes/              # Built-in color themes
│   │   ├── contexts/            # React contexts
│   │   └── hooks/               # Custom React hooks
│   │
│   └── shared/                  # Imported by both processes
│       ├── types/               # TypeScript definitions
│       ├── constants.ts         # Shared constants
│       ├── logger.ts            # Shared logger utility
│       ├── dateUtils.ts         # Date formatting helpers
│       ├── toolParser.ts        # Parses tool calls out of transcripts
│       └── utils.ts             # Utility functions
│
├── docs/                        # Documentation
├── scripts/ci/                  # Ratchet gates and their baseline
├── test/                        # Playwright end-to-end tests
├── build/                       # Icons and packaging resources
└── out/                         # Build output, created by npm run build
```

### Key technologies

- **Electron**: Desktop application framework
- **React 19**: UI framework
| Technology | Role in GoodVibes |
|---|---|
| Electron | Hosts the app, giving the interface a Node.js process with filesystem and child-process access |
| React 19 | Renders every view in the renderer process |
| TypeScript | Source language for all three trees |
| Vite, via electron-vite | Development server with hot reload, and the production bundler |
| Zustand | Holds interface state that many components read, such as the active view and open terminals |
| TanStack Query | Fetches and caches data owned by the main process, and refreshes it in the background |
| better-sqlite3 | Synchronous SQLite driver backing the local database |
| node-pty | Spawns real pseudo-terminals, which is what lets the Claude CLI behave as it would in a normal shell |
| xterm.js | Draws the terminal, with addons for resizing to fit, searching the buffer, and making URLs clickable |
| Tailwind CSS | Styling for the renderer |
| Zod | Validates every payload crossing the IPC boundary before a handler acts on it |
| Octokit | Official GitHub API client used by the GitHub panel |

### IPC communication

The renderer has no direct Node.js access. The preload script composes one API object per
domain and publishes the result as `window.goodvibes`, so each call the renderer makes is a
named channel the main process chose to expose:

```typescript
// Main process exposes APIs via preload script
window.goodvibes.startClaude(options)
window.goodvibes.getSessions()
window.goodvibes.gitStatus(cwd)
// ... etc
```

Each of those forwards to an `ipcRenderer.invoke` channel, whose handler validates the
arguments against a Zod schema in `src/main/ipc/schemas/` before doing any work.

### Database

A single SQLite database, opened through better-sqlite3 with `journal_mode = WAL` so reads can
proceed while a write is in flight, and with foreign key enforcement switched on. Each feature
area creates its own tables under `src/main/database/`, and versioned upgrades to existing
ones live in `migrations.ts`. The schema currently spans just over fifty tables, grouped as
follows.

| Group | Representative tables | Holds |
|---|---|---|
| Sessions | `sessions`, `messages`, `session_summaries`, `session_analytics`, `session_checkpoints` | Transcripts read from the Claude CLI, plus derived per-session metrics |
| Organization | `tags`, `session_tags`, `collections`, `smart_collections`, `bookmarks`, `saved_searches` | User-applied structure over sessions, including rule-driven smart collections |
| Configuration | `settings`, `hooks`, `hook_events`, `mcp_servers`, `skills`, `task_definitions` | What the app and the CLI are set up to do, and a log of hooks that fired |
| Agents | `agent_templates`, `agent_registry`, `active_agents`, `agent_tree_nodes`, `agent_metrics` | Saved agent configurations and the live tree of running agents |
| Projects | `registered_projects`, `project_configs`, `project_agents`, `project_templates`, `cross_project_sessions` | The project registry and per-project settings |
| Usage and cost | `tool_usage`, `tool_usage_detailed`, `analytics_snapshots`, `budgets` | Aggregates behind the analytics views and budget alerts |
| Notes and knowledge | `quick_notes`, `knowledge_entries`, `prompts`, `notifications`, `posts` | Content authored in the app rather than by Claude |
| Recommendations | `recommendations`, `suggestion_feedback`, `tag_suggestions` | Suggested skills and tags, with the feedback used to rank them |

## License

MIT License. See the LICENSE file for details.

## Acknowledgments

- Built for use with [Claude Code](https://docs.claude.com/en/docs/claude-code) by Anthropic
- Terminal rendering powered by [xterm.js](https://xtermjs.org/)
- Icons from [Lucide](https://lucide.dev/)
