<#
PowerShell cleanup script to remove generated files and folders.

WARNING: This permanently deletes files. Inspect before running.

Usage:
  Open PowerShell in project root and run:
    .\scripts\cleanup_files.ps1 -Force
#>

param(
    [switch]$Force
)

Function Confirm-Remove($path) {
    if (-not (Test-Path $path)) { return }
    if (-not $Force) {
        Write-Host "Would remove: $path" -ForegroundColor Yellow
        Write-Host "Pass -Force to actually delete files." -ForegroundColor Yellow
        return
    }
    Write-Host "Removing: $path" -ForegroundColor Cyan
    Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Folders to remove
$targets = @(
    "${root}\backend\uploads",
    "${root}\ai-service\uploads",
    "${root}\ai-service\temp",
    "${root}\ai-service\cache",
    "${root}\ai-service\generated",
    "${root}\ai-service\trained",
    "${root}\test-certs",
    "${root}\test-certs-real",
    "${root}\frontend\dist",
    "${root}\frontend\build"
)

foreach ($t in $targets) { Confirm-Remove $t }

# Remove __pycache__ and .pyc files across project
if ($Force) {
    Get-ChildItem -Path $root -Recurse -Include "__pycache__" -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }

    Get-ChildItem -Path $root -Recurse -Include "*.pyc" -File -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue }
    Write-Host "Removed __pycache__ folders and .pyc files." -ForegroundColor Green
} else {
    Write-Host "Run with -Force to remove __pycache__ and .pyc files." -ForegroundColor Yellow
}

Write-Host "Cleanup script finished. Verify removed items." -ForegroundColor Green
