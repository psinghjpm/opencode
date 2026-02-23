# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Notes

- Default branch is `dev`. Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Always use parallel tool calls when applicable.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.
- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.

## Commands

```bash
# Install dependencies
bun install

# Development
bun dev                          # Run TUI (equivalent to opencode CLI)
bun dev serve                    # Start headless API server (port 4096)
bun dev:web                      # Start web UI dev server
bun run dev:desktop              # Start Tauri desktop app

# Type checking
bun typecheck                    # Runs turbo typecheck across all packages

# Build
bun run --cwd packages/opencode build   # Build core CLI
bun run --cwd packages/app build        # Build web app
bun run --cwd packages/sdk/js build     # Build JS SDK

# Tests (NEVER run from repo root)
cd packages/opencode && bun test --timeout 30000        # Core unit tests
cd packages/app && bun run test:e2e                     # Playwright E2E tests
cd packages/app && bun run test:e2e:ui                  # Playwright UI mode

# Code generation
./script/generate.ts             # Regenerate SDK and related files after API changes
```

## Architecture

OpenCode is a Bun monorepo (Turborepo-orchestrated) implementing an open-source AI coding agent.

**Key packages:**

- `packages/opencode` — Core application: CLI commands, API server (Hono on port 4096), TUI (SolidJS + OpenTUI), agent loop, MCP integration, Drizzle/SQLite database
- `packages/app` — Shared SolidJS web UI used by both web and desktop targets; Vite-built
- `packages/desktop` — Tauri v2 wrapper that hosts the web UI as a native desktop app
- `packages/sdk/js` — TypeScript client SDK generated from the OpenAPI spec at `packages/sdk/openapi.json`
- `packages/ui` — Shared UI component library

**Agents:** Two built-in agents: `build` (default, full tool access) and `plan` (read-only, requires permission for writes). The agent loop lives in `packages/opencode/src/`.

**AI provider abstraction:** Multiple AI providers (Anthropic, OpenAI, Google, Bedrock, etc.) are supported through the Vercel AI SDK (`ai` package v5).

**Client/server split:** `bun dev serve` runs a headless JSON API; the TUI and web UI are separate clients that connect to it. This enables the desktop app and web app to share the same server logic.

## Style Guide

From `AGENTS.md` — follow these conventions throughout the codebase:

- **Functions:** Keep logic in one function unless it's composable/reusable
- **Error handling:** Avoid `try`/`catch` where possible
- **Types:** Avoid `any`; rely on type inference; skip explicit annotations unless needed for exports
- **Naming:** Prefer single-word names; only use multiple words if necessary
- **Inlining:** Inline values used only once rather than assigning to a variable
- **Destructuring:** Avoid — use dot notation (`obj.a`) to preserve context
- **Variables:** `const` over `let`; use ternaries or early returns instead of reassignment
- **Control flow:** No `else` — use early returns instead
- **Arrays:** Prefer `flatMap`/`filter`/`map` over `for` loops; use type guards on `filter`
- **Bun APIs:** Use `Bun.file()`, `Bun.write()`, etc. instead of Node equivalents
- **Drizzle ORM:** Use snake_case field names so column names don't need string redefinition
- **Testing:** Avoid mocks; test actual implementation; don't duplicate logic in tests

**Formatting:** Prettier with `semi: false`, `printWidth: 120`, 2-space indentation, LF line endings.

## Commits

Follow conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:` with optional package scope (e.g., `fix(desktop):`, `feat(app):`). All PRs must reference an existing GitHub issue.
