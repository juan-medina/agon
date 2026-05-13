# Deployment

Operational decisions and the reasoning behind them. Architecture decisions live in `DESIGN.md` — this document covers how to run the thing, not how it is built.

## Topology

```
Internet
    │
    Cloudflare          DNS, SSL termination, DDoS absorption
    │
    VPS                 Single Go binary (API + embedded frontend)
    │
    Supabase            Managed Postgres
    │
    Bluesky PDS         AT Proto identity and session records (external)
```

One VPS, one process, one database. Nothing else to operate.

## Why Cloudflare in front

Cloudflare's free tier handles DNS, SSL certificates, and absorbs most inbound abuse before it reaches the VPS. This matters because the most common way a small server gets an unexpected bill is inbound traffic from a DDoS or scan. Cloudflare eliminates most of that risk at no cost and without changing the application at all.

## Why a fixed-price VPS over a PaaS

Pay-as-you-go platforms (Fly.io, Render, Railway) bill per unit of consumption with no hard ceiling. A compromised server or sustained attack can generate a large bill before you notice. A fixed-price VPS has a known monthly cost that cannot increase regardless of what traffic hits it — when the included bandwidth is exceeded the connection is throttled, not billed.

For a side project with no revenue this is the only acceptable billing model.

## Recommended provider

Hetzner Cloud. A CX22 instance (2 vCPU, 4 GB RAM, 20 TB included traffic) costs roughly €4/month. Inbound traffic is free. Outbound overage is charged at €1/TB rather than throttled — set a traffic alert in the Hetzner dashboard to warn before the included allowance is exceeded. With Cloudflare absorbing inbound traffic, hitting the outbound limit in normal operation is very unlikely.

This is a recommendation, not a requirement. Any fixed-price VPS with at least 1 GB RAM and a reputable network will work.

## Managed database

Supabase for Postgres. The free tier is sufficient for early traffic and pauses the database rather than charging overages when limits are exceeded. The connection string is injected as an environment variable — the application has no knowledge of the provider.

## Server hardening

A small publicly reachable server needs a minimum baseline before anything is deployed:

- SSH key authentication only — password login disabled
- Fail2ban blocking repeated failed SSH attempts
- Automatic unattended security updates enabled
- Go binary runs as a dedicated non-root user
- Only ports 80 and 443 open to the public — port 22 restricted to known IPs where possible
- Cloudflare proxy enabled on the DNS record so the VPS IP is not exposed directly

The attack surface is intentionally minimal: one binary, one open port, no other services.

## Environment variables

Secrets are never committed. The binary reads configuration from environment variables at startup:

```
DATABASE_URL        Supabase Postgres connection string
IGDB_CLIENT_ID      Twitch application client ID
IGDB_CLIENT_SECRET  Twitch application client secret
ATPROTO_PDS_URL     Bluesky PDS endpoint
```

On the VPS these are set in a systemd service unit, not in a shell profile or .env file.

## Process management

The Go binary runs as a systemd service. Systemd handles startup on boot, restarts on crash, and log collection via journald. No Docker, no container runtime — the binary runs directly on the host.

## Deployment

Deployments are a binary copy followed by a service restart:

```sh
go build -o bin/api ./cmd/api
scp bin/api user@host:/opt/agon/api
ssh user@host "systemctl restart agon"
```

CI can automate this once the project has enough contributors to justify it. Until then, manual deploy is fine.
