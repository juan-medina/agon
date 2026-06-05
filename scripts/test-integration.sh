#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Juan Medina
# SPDX-License-Identifier: MIT

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "${YURNIK_ENV:-}" = "production" ]; then
    ENV_FILE="/etc/yurnik/env"
else
    ENV_FILE="$REPO_ROOT/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "  [x]  $ENV_FILE not found — run make db-init first" >&2
    exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

export TEST_DATABASE_URL="$DATABASE_URL"
export TEST_DATABASE_ADMIN_URL="$DATABASE_ADMIN_URL"

cd "$REPO_ROOT/api"
go test -tags integration ./... -v -count=1
