$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Expected a release version such as 0.1.0.' }
$binary = Join-Path $projectRoot 'src-tauri/target/release/folio-budget.exe'
if (-not (Test-Path -LiteralPath $binary)) { throw 'Build the native release before packaging it.' }
$output = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$filename = "PocketPlan-$version-windows-x64.exe"
$destination = Join-Path $output $filename
Copy-Item -LiteralPath $binary -Destination $destination
$hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath (Join-Path $output 'SHA256SUMS.txt') -Value "$hash  $filename" -Encoding ascii
Write-Output $destination
Write-Output (Join-Path $output 'SHA256SUMS.txt')
