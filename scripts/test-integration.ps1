# SPDX-FileCopyrightText: 2026 Juan Medina
# SPDX-License-Identifier: MIT

. (Join-Path $PSScriptRoot "Load-Env.ps1")
Import-DotEnv (Join-Path $PSScriptRoot "..\.env")

$env:TEST_DATABASE_URL = $env:DATABASE_URL
$env:TEST_DATABASE_ADMIN_URL = $env:DATABASE_ADMIN_URL

Set-Location (Join-Path $PSScriptRoot "..\api")
go test -tags integration ./... -v -count=1
