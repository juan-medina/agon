# SPDX-FileCopyrightText: 2026 Juan Medina
# SPDX-License-Identifier: MIT
#
# Dot-source this file to get Import-DotEnv.
# Usage: . (Join-Path $PSScriptRoot "Load-Env.ps1")

function Import-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object {
        $k, $v = $_.split('=', 2)
        [System.Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim(), 'Process')
    }
}

# Sets or replaces a single key=value line in an env file without touching anything else.
function Set-EnvLine {
    param([string]$Path, [string]$Key, [string]$Value)
    $line = "$Key=$Value"
    if (Test-Path $Path) {
        $lines = Get-Content $Path
        $found = $false
        $lines = $lines | ForEach-Object {
            if ($_ -match "^\s*$Key\s*=") { $found = $true; $line } else { $_ }
        }
        if (-not $found) { $lines += $line }
        $lines | Set-Content $Path -Encoding UTF8
    } else {
        $line | Set-Content $Path -Encoding UTF8
    }
}
