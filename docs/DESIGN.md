# Design

Architecture decisions and the reasoning behind them. This is not a tutorial and not a reference — the code is the reference. Decisions live here so they are not relitigated.

## What we are building

A social feed for gaming sessions, built on AT Proto. The core loop: a tray agent detects when you are playing a game and for how long, proposes a session record when you stop, you confirm or discard it, confirmed sessions publish to your AT Proto feed and become visible to followers.

Discovery and recommendations are a secondary goal, enabled by the session data that accumulates over time.

## Components

Three deployable things:

**API server** — a single Go binary. Handles all backend logic, proxies IGDB with a server-side cache, holds unconfirmed sessions until the user acts on them, and serves the exclusion list to the agent.

**Tray agent** — a small C# application distributed as a Windows installer via Velopack. Watches for games, creates and heartbeats sessions via the API, fires an OS notification with a URL when a game closes. Has no UI beyond a system tray icon and a quit menu item. Registers the `agon://` custom URL scheme on install so the OS can wake it for configuration updates.

**Web frontend** — a React SPA deployed to Cloudflare Pages. Handles session confirmation, the social feed, game search, personal stats, and exclusion management.

## Why AT Proto

Sessions are the user's data, not ours. AT Proto gives users a portable identity and portable records — if Agōn shuts down, the data does not disappear. It also reduces our cold start problem: users can bootstrap their social graph from existing Bluesky follows rather than finding each other from scratch.

We use Bluesky's hosted PDS rather than running our own. That means user identity and session record storage are Bluesky's infrastructure cost, not ours.

## Authentication

Bluesky OAuth is the only login method. Agōn is an AT Proto application — every user needs an AT Proto DID regardless of how they authenticate, so adding a separate SSO provider would only delay the inevitable linking step. A Bluesky account is a hard requirement and is stated clearly in the README.

## Why the frontend and backend are separate deployments

The React SPA is static — HTML, CSS, and JavaScript with no server-side rendering. Cloudflare Pages serves it from the edge for free, with automatic deploys on every Git push and preview URLs per pull request. There is no reason to serve static files from the Go binary or pay for a server to do what a CDN does better for free.

The Go binary is responsible only for API routes. It is simpler and smaller as a result.

## Why one Go binary for the API

The scope does not justify a gateway, a reverse proxy, or multiple services. Go's `net/http` handles everything needed. One binary, one process, one thing to monitor and deploy.

## Why C# for the tray agent

The tray agent is a Windows desktop application that needs OS-level integration: process enumeration, system tray, OS notifications, custom URL scheme registration, and a proper installer with auto-update. C# and .NET have first-class support for all of these on Windows. Velopack handles installation, updates, and uninstall cleanly.

Go would produce a smaller binary but would require significantly more work for the same Windows integration surface. The right tool for a Windows desktop application is a Windows-native stack.

## Game detection

The tray agent detects games by watching for new processes that load a graphics API — DirectX, OpenGL, or Vulkan. Specifically it looks for `d3d9.dll`, `d3d10.dll`, `d3d11.dll`, `d3d12.dll`, `opengl32.dll`, or `vulkan-1.dll` in the process's loaded modules. This covers virtually every PC game regardless of store or launcher.

When a matching process appears, the agent captures the window title and sends it to the API for fuzzy matching against IGDB. The match is a suggestion, not a fact — the user confirms or corrects it.

We do not maintain an executable-to-game database. The window title approach works without one and is transparent to users and contributors.

## Session lifecycle

```
active      game is running, agent is sending heartbeats every 10 minutes
ended       game process closed, IGDB match attempted, notification fired
confirmed   user reviewed and approved, published to AT Proto feed
discarded   user dismissed
```

Sessions only publish to AT Proto on confirmation. Unconfirmed sessions are private, stored in Postgres, and visible in the web app's inbox. Unconfirmed sessions are automatically evicted after 7 days — they are short-lived scaffolding, not permanent records.

Heartbeats serve two purposes: accurate duration if the machine crashes, and liveness detection. Sessions with no heartbeat for 15 minutes are auto-closed.

## AT Proto records are fully denormalised

When a session is confirmed, the AT Proto record contains all game metadata — title, cover art URL, genres, IGDB ID — baked in at publish time. A friend's feed never needs to query the API or IGDB to render a session card. The record is self-contained and portable.

## IGDB

IGDB (owned by Twitch) is free for non-commercial use and is the most comprehensive game database available. We use it for game metadata, cover art, genres, and similar game relationships. The Twitch client secret lives server-side only — the frontend never touches it.

IGDB responses are cached in Postgres with a TTL. This cache is server-side infrastructure to stay within IGDB rate limits during detection and confirmation. It is not user data — clients read game metadata from the denormalised AT Proto records instead.

## Exclusion list

Users can mark specific executables as non-games so the agent ignores them. Exclusions are stored in Postgres per user DID and fetched by the agent on startup. When the user saves a change in the web app, the web app opens `agon://refresh-exclusions`, the OS routes this to the running agent, and the agent fetches the updated list from the API. If the agent is not running there are no sessions being detected and exclusions are irrelevant — the agent always loads fresh exclusions on startup anyway.

## Custom URL scheme

The agent registers `agon://` as a custom URL scheme on install via Velopack. This allows the web app and OS notifications to wake the agent without maintaining a persistent connection. No SSE, no polling, no open connections.

## Data boundaries

```
AT Proto      confirmed sessions — fully denormalised, permanent, user-owned
              social graph, identity, feed

Postgres      unconfirmed sessions — evicted after 7 days
              exe exclusions — per user DID, permanent until removed
              game cache — server side IGDB responses with TTL

localStorage  UI preferences only
```

## Testing

Tests are written from the start. Go packages have unit tests alongside the code they test. Integration tests covering the API live in a dedicated test package. The React frontend uses Vitest. The C# agent uses xUnit. We do not aim for coverage targets — we test behaviour that would be painful to debug manually.

## What we are not building yet

- macOS and Linux tray agent (Windows first)
- Console session detection (PSN / Xbox APIs are a future consideration)
- The language-based recommendation engine (requires session note data at scale)
- Self-hosted PDS
