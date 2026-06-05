#!/usr/bin/env bash
# scripts/db-stop.sh
# Stops the local Postgres service.

set -euo pipefail

ok()   { echo "  [ok] $1"; }
info() { echo "  [-]  $1"; }
err()  { echo "  [x]  $1" >&2; }

if ! systemctl is-active --quiet postgresql; then
    ok "Postgres is already stopped"
    exit 0
fi

info "Stopping Postgres..."
sudo systemctl stop postgresql
ok "Postgres stopped"
