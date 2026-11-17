# One-time setup on the hotel PC.
# Creates the fixed door https://crm.dominal.in -> the CRM exe (port 3000).
# A browser window opens so you can approve the Dominaltech Cloudflare account.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$cloudflared = $null
foreach ($candidate in @(
  (Join-Path $root 'tools\cloudflared.exe'),
  (Join-Path $root 'cloudflared.exe'),
  'cloudflared'
)) {
  if ($candidate -eq 'cloudflared') {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { $cloudflared = $cmd.Source; break }
  } elseif (Test-Path $candidate) {
    $cloudflared = $candidate
    break
  }
}

if (-not $cloudflared) {
  Write-Host 'cloudflared is not installed. Installing with winget...'
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw 'Install failed. Install Cloudflare cloudflared, then run this script again.'
  }
  $cloudflared = $cmd.Source
}

Write-Host 'A browser will open. Log in with the Dominaltech Cloudflare account that owns dominal.in.'
& $cloudflared tunnel login
if ($LASTEXITCODE -ne 0) { throw 'Cloudflare login was not completed.' }

$existing = & $cloudflared tunnel list 2>&1 | Out-String
if ($existing -notmatch 'hcp-crm') {
  & $cloudflared tunnel create hcp-crm
  if ($LASTEXITCODE -ne 0) { throw 'Could not create tunnel hcp-crm.' }
}

$info = & $cloudflared tunnel info hcp-crm 2>&1 | Out-String
$idMatch = [regex]::Match($info, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
if (-not $idMatch.Success) {
  $list = & $cloudflared tunnel list 2>&1 | Out-String
  $idMatch = [regex]::Match($list, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s+hcp-crm')
  if (-not $idMatch.Success) {
    $idMatch = [regex]::Match($list, 'hcp-crm\s+([0-9a-fA-F-]{36})')
  }
}
if (-not $idMatch.Success) { throw "Could not read the tunnel id. Output:`n$list" }
$tunnelId = $idMatch.Groups[1].Value
if (-not $tunnelId) { $tunnelId = $idMatch.Value }

$credDir = Join-Path $env:USERPROFILE '.cloudflared'
$credFile = Join-Path $credDir "$tunnelId.json"
if (-not (Test-Path $credFile)) {
  throw "Credentials file not found: $credFile"
}

$configDir = Join-Path $root 'cloudflare'
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$yaml = @"
tunnel: $tunnelId
credentials-file: $($credFile -replace '\\','/')

ingress:
  - hostname: crm.dominal.in
    service: http://127.0.0.1:3000
  - service: http_status:404
"@
Set-Content -Path (Join-Path $configDir 'config.yml') -Value $yaml -Encoding utf8

Write-Host 'Pointing crm.dominal.in at this PC...'
& $cloudflared tunnel route dns hcp-crm crm.dominal.in
if ($LASTEXITCODE -ne 0) {
  Write-Host 'DNS route was not created. In Cloudflare, add a CNAME: crm -> the tunnel, on the dominal.in zone.'
}

Write-Host ''
Write-Host 'Done. Open the Hotel City Park CRM exe each morning.'
Write-Host 'Waiter and guest orders use https://crm.dominal.in'
Write-Host 'You do not start Cloudflare yourself.'
