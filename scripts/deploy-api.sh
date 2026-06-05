#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Juan Medina
# SPDX-License-Identifier: MIT
#
# Safe deploy: builds to a temp path first.
# The running service is only stopped and replaced if the build succeeds.

set -euo pipefail

ok()  { echo "  [ok] $1"; }
err() { echo "  [x]  $1" >&2; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_BINARY=/tmp/yurnik-api-new

rm -f "$TEMP_BINARY"

ok "Building..."
cd "$REPO_ROOT/api"
YURNIK_ENV=production go build -o "$TEMP_BINARY" ./cmd/api
ok "Build succeeded"

systemctl stop yurnik
mv "$TEMP_BINARY" /usr/local/bin/yurnik-api
chmod +x /usr/local/bin/yurnik-api
systemctl start yurnik
ok "Service restarted"
