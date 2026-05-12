param(
    [switch]$Force
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Function Copy-IfMissing($src, $dest) {
    if ((Test-Path $dest) -and (-not $Force)) {
        Write-Host "Skipping existing: $dest" -ForegroundColor Yellow
        return
    }
    Copy-Item -LiteralPath $src -Destination $dest -Force:$Force
    Write-Host "Created: $dest" -ForegroundColor Green
}

# Backend
$backendExample = Join-Path $root "backend\.env.example"
$backendEnv = Join-Path $root "backend\.env"
if (Test-Path $backendExample) { Copy-IfMissing $backendExample $backendEnv }

# AI service
$aiExample = Join-Path $root "ai-service\.env.example"
$aiEnv = Join-Path $root "ai-service\.env"
if (Test-Path $aiExample) { Copy-IfMissing $aiExample $aiEnv }

Write-Host "Env generation complete. Edit .env files for production values." -ForegroundColor Cyan
