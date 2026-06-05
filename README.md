# Yurnik

Yurnik is a social network for gaming journeys. Log what you play, see what people you follow are playing, discover games through the people you trust.

<p align="center">
<a href="https://yurnik.social">
  <img src="web/public/logo.png" alt="Yurnik hero image" width="150"><br/>
  https://yurnik.social
</a>
</p> 

## What it is

- **Automatic journey detection** — a lightweight tray agent watches for running games using graphics API detection, no manual logging required
- **Social feed** — see what people you follow have been playing in real time
- **Game discovery** — recommendations based on your play history and your network's

## What it is not

- A game launcher
- A library manager
- A backlog tracker

## Status

Early development. Not ready for use.

## Development

Requirements: Go 1.23+, Node 22 (via fnm), pnpm, Net 9

## Make commands

```sh
# API server
make run-api

# Tray agent
make run-agent

# Web frontend
make run-web

# All tests
make test

# Initialize the database
make db-init

# Start the database server
make db-run

# Stop the database server
make db-stop
```

## Initialize the environment & tools for Windows development

```powershell
./scripts/setup.ps1
```

This will install nvm, pnpm, go, .Net & postgres. Requires winget and admin privileges.

## License

MIT — see [LICENSE](LICENSE)

Copyright (c) 2026 Juan Medina
