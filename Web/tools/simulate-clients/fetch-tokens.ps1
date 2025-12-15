<#
fetch-tokens.ps1

Fetch attendee JWTs from the running WebApi and save them as tokens.json for the simulator.

Usage (PowerShell):
  cd Web\tools\simulate-clients
  # Adjust BaseUrl if your server uses a different port or https
  .\fetch-tokens.ps1 -BaseUrl 'http://localhost:5076' -MeetingCode 'FD2MJH'

Parameters:
  -BaseUrl    : base URL of the WebApi (default http://localhost:5076)
  -MeetingCode: meeting code to use (default FD2MJH)
  -AccessCodes: array of verification codes (defaults to the list you provided)
  -OutFile    : output file path for tokens.json (default ./tokens.json)

The script will call POST ${BaseUrl}/api/auth/attendee/login with JSON body { MeetingCode, AccessCode }
and expect responses with an AccessToken property. It will save an array of token strings to OutFile.
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
    [string]$OutFile = './tokens.json'
)

$loginUrl = $BaseUrl.TrimEnd('/') + '/api/auth/attendee/login'
Write-Host "Fetching tokens from $loginUrl for meeting code '$MeetingCode'..."

$tokens = @()

foreach ($code in $AccessCodes) {
    Write-Host "Posting access code: $code"
    $body = @{ MeetingCode = $MeetingCode; AccessCode = $code } | ConvertTo-Json
    try {
        # Using Invoke-RestMethod to automatically parse JSON responses
        $resp = Invoke-RestMethod -Method Post -Uri $loginUrl -Body $body -ContentType 'application/json' -ErrorAction Stop
        if ($null -ne $resp.AccessToken) {
            Write-Host "  -> got token (len=$($resp.AccessToken.Length))"
            $tokens += $resp.AccessToken
        } else {
            Write-Warning "  -> response didn't contain AccessToken: $($resp | ConvertTo-Json -Depth 2)"
        }
    } catch {
        Write-Warning "  -> request failed for code $code : $($_.Exception.Message)"
    }
}

if ($tokens.Count -eq 0) {
    Write-Warning "No tokens were fetched. Check that the WebApi is running and the meeting/code values are correct."
    exit 1
}

# Save tokens to JSON array
$fullOut = Resolve-Path -Path $OutFile -ErrorAction SilentlyContinue
if (-not $fullOut) { $OutFile = (Join-Path (Get-Location) $OutFile) }
$tokens | ConvertTo-Json -Depth 1 | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "Saved $($tokens.Count) tokens to $OutFile"

