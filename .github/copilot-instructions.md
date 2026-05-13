# Copilot Instructions

This is Agōn — an open social network for gaming sessions built on AT Proto. Three components in one monorepo:

- `api/` — Go API server
- `agent/` — C# tray agent (Windows, Velopack)
- `web/` — React + Vite frontend (Cloudflare Pages)

See `docs/DESIGN.md` for architecture decisions. See `docs/DEPLOYMENT.md` for hosting and infrastructure. See `CLAUDE.md` for coding conventions.

## Key rules

- YAGNI. Do not add abstractions, interfaces, or configuration that nothing uses yet
- Go errors are returned, not thrown. Log at the handling site, not the origin
- C# uses result types for expected failures, not exceptions for control flow
- AT Proto session records are only written on explicit user confirmation
- AT Proto records are fully denormalised — bake all game metadata in at publish time
- IGDB is only called from the Go API server. Never from the frontend or the agent
- The agent has no UI — configuration and session management open the web app via browser
- The agent communicates with the web app only through `agon://` URL scheme calls
- Bluesky OAuth is the only authentication method. Do not add alternatives
- Every `.go` file starts with `// SPDX-FileCopyrightText: 2026 Juan Medina` and `// SPDX-License-Identifier: MIT`
- Every `.cs` file starts with the same SPDX header
- Every `.ts` / `.tsx` file starts with the same SPDX header
- TypeScript strict mode. No `any`
- Tests are written alongside the code they cover
