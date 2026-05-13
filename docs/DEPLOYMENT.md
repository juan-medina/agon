# Deployment

Operational decisions and the reasoning behind them. Architecture decisions live in `DESIGN.md` — this document covers how to run the thing, not how it is built.

## Topology

```
Cloudflare Pages          React SPA — static assets, global CDN, free
    │
    │  API calls (api.agon.gg)
    ▼
Cloudflare proxy          DNS, SSL termination, DDoS absorption
    │
    ▼
Hetzner VPS               Single Go binary — API only
    │
    ▼
Supabase                  Managed Postgres

Bluesky PDS               AT Proto identity and confirmed session records (external)
```

## Frontend — Cloudflare Pages

The React SPA is deployed directly from Git. Cloudflare Pages rebuilds and deploys on every push to `main`. Pull requests get preview URLs automatically. Static assets are served from Cloudflare's edge globally at no bandwidth cost.

No server is involved in serving the frontend. The SPA communicates with the API at `api.agon.gg`.

## API — Hetzner VPS

A fixed-price VPS with a known monthly cost that cannot increase regardless of traffic. When included bandwidth is exceeded Hetzner charges €1/TB overage rather than cutting service — set a traffic alert in the Hetzner dashboard to warn before the included allowance is reached. With Cloudflare absorbing inbound traffic, hitting the outbound limit in normal operation is very unlikely.

A CX22 instance (2 vCPU, 4 GB RAM, 20 TB included traffic) at roughly €4-6/month is more than sufficient for a Go binary at side-project scale.

Pay-as-you-go platforms were ruled out because they have no hard billing ceiling. A compromised server or sustained attack can generate a large bill before you notice. Fixed-price VPS means the worst case is a slow server, not an unexpected invoice.

## Tray agent — distributed via Velopack

The agent is distributed as a Windows installer built with Velopack. Velopack handles installation, the `agon://` URL scheme registration, auto-updates, and clean uninstall. The agent checks for updates on startup and applies them silently in the background.

Update packages are hosted on GitHub Releases. No update server to operate.

## Database — Supabase

Supabase hosts Postgres. The free tier is sufficient for early traffic. The application has no knowledge of the provider — it connects via a standard Postgres connection string injected as an environment variable. Supabase's `pg_cron` extension runs the eviction job for expired unconfirmed sessions nightly:

```sql
DELETE FROM sessions
WHERE status IN ('active', 'ended')
AND created_at < NOW() - INTERVAL '7 days';
```

## Server hardening

- SSH key authentication only — password login disabled
- Fail2ban blocking repeated failed SSH attempts
- Automatic unattended security updates enabled
- Go binary runs as a dedicated non-root user
- Only ports 80 and 443 open publicly — port 22 restricted to known IPs where possible
- Cloudflare proxy enabled on the DNS record so the VPS IP is not exposed directly

## Environment variables

Secrets are never committed. The binary reads configuration from environment variables at startup:

```
DATABASE_URL          Supabase Postgres connection string
IGDB_CLIENT_ID        Twitch application client ID
IGDB_CLIENT_SECRET    Twitch application client secret
ATPROTO_PDS_URL       Bluesky PDS endpoint
```

On the VPS these are set in the systemd service unit file, not in a shell profile or `.env` file.

## Process management

The Go binary runs as a systemd service. Systemd handles startup on boot, restarts on crash, and log collection via journald. No Docker, no container runtime.

## Deployment

```sh
go build -o bin/api ./api
scp bin/api user@host:/opt/agon/api
ssh user@host "systemctl restart agon"
```

CI can automate this once the project has enough contributors to justify it.
