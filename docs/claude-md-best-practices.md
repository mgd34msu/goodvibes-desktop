# CLAUDE.md best practices guide

Reference for structuring and maintaining CLAUDE.md files across user, project, and local levels.

---

## Memory hierarchy

Claude Code loads these in order (higher = more authoritative, loaded first):

| Level | Location | Shared With | Purpose |
|-------|----------|-------------|---------|
| **Enterprise** | `/etc/claude-code/CLAUDE.md` (Linux), `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | All org users | Company policies, security standards |
| **User** | `~/.claude/CLAUDE.md` | Just you, all projects | Personal preferences, global shortcuts |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team via git | Architecture, workflows, coding standards |
| **Project Local** | `./CLAUDE.local.md` | Just you, this project | Personal sandbox URLs, local overrides |

---

## Editing these files in GoodVibes

The **Memory** view is the built-in editor for these files. It covers three of the four levels
above, namely user, project, and project local. Enterprise policy files are deliberately out
of scope, since they are managed by whoever administers the machine rather than by the person
using it.

The view lists the files it found, opens each in a Markdown editor, and offers starter
templates drawn from the practices in this document. Templates carry `{{placeholder}}` fields,
such as `{{project_name}}` and `{{package_manager}}`, which you fill in when applying one, so
a new file starts as a filled-in draft rather than a blank page.

Templates are grouped by the level they suit. User templates cover personal preferences and
tooling shortcuts. Project templates range from a minimal command-and-architecture skeleton to
fuller ones for monorepos, APIs, and frontend applications. Local templates cover development
environment overrides, worktree notes, and rules being trialled before being proposed to the
team.

---

## User-level (`~/.claude/CLAUDE.md`)

**Best for:**

- Personal code style preferences (indentation, naming conventions)
- Shell/tooling shortcuts used across all projects
- Default behaviors regardless of project context
- Personal workflow preferences

**Keep it lean.** This loads into every session. Research suggests Claude reliably follows ~150-200 instructions total, and the Claude Code system prompt already uses ~50.

**Example content:**

```markdown
# Personal Preferences

## Code Style
- Prefer functional approaches over class-based when reasonable
- Use descriptive variable names, avoid abbreviations
- 2-space indentation for JS/TS, 4-space for Python

## Workflow
- Commit messages: conventional commits format
- Always run tests before suggesting PR is ready
```

---

## Project-level (`./CLAUDE.md`)

**Best for:**

- Build/test/lint commands specific to the repo
- Architecture decisions and key abstractions
- Domain-specific terminology and jargon
- Git workflow (branch naming, PR conventions)
- MCP server instructions
- File boundaries (what not to touch)
- Known issues and gotchas

This is the high-leverage file, shared with the team and defining how Claude works with this codebase.

**Example structure:**

```markdown
# Project Name

Brief one-liner description of what this project does.

## Commands
- `pnpm dev` - Start development server
- `pnpm test` - Run test suite
- `pnpm lint` - Run linter

## Architecture
- `/src/agents` - Agent definitions and factories
- `/src/hooks` - Claude Code hook implementations
- `/src/mcp` - MCP server integrations

## Conventions
- Use Zod for runtime validation
- API routes follow REST conventions
- Error handling uses custom AppError class

## Gotchas
- The auth module has a quirky token refresh; see @docs/auth.md
- Never modify files in `/generated` directly

## MCP Servers
When working with [X], use the MCP server instead of CLI commands.
```

---

## Local files (`./CLAUDE.local.md`)

Automatically gitignored. Use cases:

1. **Personal sandbox/dev URLs.** Your local dev server, test credentials.
2. **Overrides.** If team CLAUDE.md says "use pnpm" but you need npm for debugging.
3. **Experimental instructions.** Testing rules before proposing to team.
4. **Worktree-specific context.** Feature branch with different needs.

**Alternative:** The import syntax (`@~/.claude/my-project-prefs.md`) works better across multiple git worktrees since local files are per-directory.

---

## Import syntax

CLAUDE.md files can import other files:

```markdown
See @README for project overview and @package.json for available commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md
- Individual preferences: @~/.claude/my-project-instructions.md
```

- Both relative and absolute paths work
- Imports not evaluated inside code blocks
- Recursive imports allowed (max depth: 5)
- Check loaded files with `/memory` command

---

## Content principles

### Less is more

Instruction-following quality degrades uniformly as instruction count increases. The model doesn't ignore "later" instructions. It ignores all of them more uniformly.

**Target:** Keep your CLAUDE.md as concise as possible while covering essentials.

### Progressive disclosure

Don't tell Claude everything upfront. Tell it **where to find** information so it can retrieve when needed.

```markdown
# Bad
[50 lines of auth troubleshooting steps]

# Good
For auth issues or FooBarError, see @docs/auth-troubleshooting.md
```

### Always provide alternatives

Never use negative-only constraints. The agent gets stuck when it thinks it must use a forbidden approach.

```markdown
# Bad
Never use the --force flag.

# Good
Use --force-with-lease instead of --force for safer force pushes.
```

### Be specific

```markdown
# Bad
Format code properly.

# Good
Use 2-space indentation. Run prettier before committing.
```

### Commands should be copy-pasteable

```markdown
# Bad
Run the test command with coverage enabled.

# Good
pnpm test --coverage
```

---

## What not to include

- **Linter rules.** Use actual linters, not instructions.
- **Verbose documentation.** Use imports to reference docs.
- **Information irrelevant to the current task.** Extra context leads to unpredictable behavior.
- **Auto-generated content.** CLAUDE.md is high-leverage; hand-craft it.
- **Generic advice.** Only include what's specific to this project or context.

---

## Maintenance

1. **Start with `/init`.** Use it as a starting point, then delete aggressively.
2. **Update on architecture changes.** Keep it current as the project evolves.
3. **Review agent logs.** Find common mistakes and fix them in CLAUDE.md.
4. **Treat as a forcing function.** If your CLI commands need paragraphs of docs, write a simpler wrapper instead.

---

## Quick reference

| Do | Don't |
|----|-------|
| Bullet points, grouped under headings | Walls of prose |
| Specific, actionable instructions | Vague guidance |
| Copy-pasteable commands | References to commands |
| Import verbose docs with `@path` | Inline everything |
| Provide alternatives to restrictions | Negative-only constraints |
| Hand-craft and iterate | Auto-generate and forget |

---

## Checking what's loaded

Run `/memory` in Claude Code to see all loaded memory files and their sources.
