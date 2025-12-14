<#
run-5-attendees.ps1

One-shot helper: fetch up to 5 attendee tokens and start the simulator with 5 clients.

Usage examples:
  # If your Rider backend listens on HTTP (no cert issues):
  .\run-5-attendees.ps1 -BaseUrl 'http://localhost:5076' -MeetingCode 'FD2MJH'

  # If your Rider backend uses HTTPS with a dev cert (skip TLS validation locally):
  .\run-5-attendees.ps1 -BaseUrl 'https://localhost:7029' -MeetingCode 'FD2MJH' -SkipCertificateCheck

Parameters:
  -BaseUrl             : Base URL of your WebApi (default http://localhost:5076)
  -MeetingCode         : Meeting code (default FD2MJH)
  -AccessCodes         : array of access codes to use (default uses the 8 known codes embedded)
  -SkipCertificateCheck: switch - skip server cert validation for local dev
  -ClientCount         : how many clients to start (default 5)
  -StartDelayMs        : delay between client connects in ms (default 200)

This script will:
  - run npm install if node_modules missing
  - call fetch-tokens.ps1 to obtain tokens.json (with -SkipCertificateCheck if provided)
  - set environment variables and launch node simulate-with-tokens.js with CLIENT_COUNT

Security: skipping cert validation or setting NODE_TLS_REJECT_UNAUTHORIZED is only intended for local development.
#>
param(
    [string]$BaseUrl = 'http://localhost:5076',
    [string]$MeetingCode = 'FD2MJH',
    [string[]]$AccessCodes = @(
        'S2JRCC3F',
        '29YYQFPZ',
        '3EDCVVFY',
        'XDBR4KXB',
        'FZZAZHT8',
        'XMZEJBJG',
        'AHSUWGYG',
        'TDDA75WN'
    ),
    [switch]$SkipCertificateCheck,
    [int]$ClientCount = 5,
    [int]$StartDelayMs = 200
)

$here = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Push-Location $here

Write-Host "Run helper: BaseUrl=$BaseUrl MeetingCode=$MeetingCode SkipCert=$SkipCertificateCheck Clients=$ClientCount"

# Ensure node modules
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found - running npm install (this may take a moment)"
    npm install
}

# Build the parameter list for fetch-tokens
$fetchArgs = @(
    '-BaseUrl', $BaseUrl,
    '-MeetingCode', $MeetingCode,
    '-OutFile', './tokens.json'
)
if ($AccessCodes -and $AccessCodes.Count -gt 0) {
    $fetchArgs += '-AccessCodes'
    $fetchArgs += ([string]::Join(',', $AccessCodes))
}
if ($SkipCertificateCheck) { $fetchArgs += '-SkipCertificateCheck' }

# Call fetch-tokens.ps1
Write-Host "Fetching tokens..."
# If we passed AccessCodes as a comma list we need to expand in the call; use the script's parameters directly
if ($SkipCertificateCheck) {
    .\fetch-tokens.ps1 -BaseUrl $BaseUrl -MeetingCode $MeetingCode -AccessCodes $AccessCodes -OutFile './tokens.json' -SkipCertificateCheck
} else {
    .\fetch-tokens.ps1 -BaseUrl $BaseUrl -MeetingCode $MeetingCode -AccessCodes $AccessCodes -OutFile './tokens.json'
}

# verify tokens.json
if (-not (Test-Path './tokens.json')) {
    Write-Error "tokens.json not found. Aborting."
    Pop-Location
    exit 1
}

$tokens = Get-Content './tokens.json' | ConvertFrom-Json
$available = $tokens.Count
if ($available -lt 1) {
    Write-Error "No tokens fetched. Aborting."
    Pop-Location
    exit 1
}

$toStart = [Math]::Min($ClientCount, $available)
Write-Host "Starting simulator with $toStart clients (tokens available: $available)."

# If using HTTPS and local certs were skipped, Node may reject the cert too; allow disabling TLS checks in Node for this session if SkipCertificateCheck
if ($SkipCertificateCheck) {
    Write-Warning "Disabling Node TLS certificate validation in this PowerShell session (NODE_TLS_REJECT_UNAUTHORIZED=0)"
    $env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

# set env vars for the simulator
# choose SIGNALR_URL matching the BaseUrl
# if BaseUrl contains https:// or http:// and has a port, use that; otherwise fallback to http://localhost:5076
$signalrUrl = $BaseUrl.TrimEnd('/') + '/hub/meetings'
$env:SIGNALR_URL = $signalrUrl
$env:TOKENS_FILE  = (Resolve-Path './tokens.json').Path
$env:CLIENT_COUNT = $toStart.ToString()
$env:START_DELAY_MS = $StartDelayMs.ToString()

Write-Host "Launching node simulate-with-tokens.js -> SIGNALR_URL=$signalrUrl CLIENT_COUNT=$toStart"
node .\simulate-with-tokens.js

Pop-Location

