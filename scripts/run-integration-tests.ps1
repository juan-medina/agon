# SPDX-FileCopyrightText: 2026 Juan Medina
# SPDX-License-Identifier: MIT

. (Join-Path $PSScriptRoot "Load-Env.ps1")
Import-DotEnv (Join-Path $PSScriptRoot "..\.env")
Import-DotEnv (Join-Path $PSScriptRoot "..\.env.test")

Set-Location (Join-Path $PSScriptRoot "..\api")
go test ./... -v -tags integration
