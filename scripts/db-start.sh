#!/usr/bin/env bash
# scripts/db-start.sh
# Starts the local Postgres service.

set -euo pipefail

ok()   { echo "  [ok] $1"; }
info() { echo "  [-]  $1"; }
err()  { echo "  [x]  $1" >&2; }

if systemctl is-active --quiet postgresql; then
    ok "Postgres is already running"
    exit 0
fi

info "Starting Postgres..."
sudo systemctl start postgresql
ok "Postgres started"
