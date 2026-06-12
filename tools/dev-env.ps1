# Adds the portable Node.js and PostgreSQL binaries to PATH for this shell.
# Usage:  . .\tools\dev-env.ps1   (note the leading dot — "dot-source" it)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:Path = "$root\node;$root\pgsql\bin;$env:Path"
Write-Host "Node $(node -v) and PostgreSQL tools added to PATH for this session."
