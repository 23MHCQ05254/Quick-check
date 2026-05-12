<#
PowerShell script to remove and recreate Python virtual environment, then install AI service deps.

Usage:
  Open PowerShell in project root and run:
    .\scripts\recreate_venv.ps1

This will remove .venv folder, create a new venv, and install packages from ai-service/requirements.txt
#>

param(
    [string]$Python = "python",
    [switch]$InstallDev
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$venv = Join-Path $root ".venv"

if (Test-Path $venv) {
    Write-Host "Removing existing venv: $venv" -ForegroundColor Yellow
    Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Creating new virtual environment..." -ForegroundColor Cyan
& $Python -m venv $venv

Write-Host "Activating venv and installing dependencies..." -ForegroundColor Cyan
$pip = Join-Path $venv "Scripts\pip.exe"
& $pip install --upgrade pip
& $pip install -r "$root\ai-service\requirements.txt"

if ($InstallDev) {
    & $pip install -r "$root\ai-service\requirements-dev.txt" 2>$null || Write-Host "No dev requirements file found." -ForegroundColor Yellow
}

Write-Host "Virtual environment recreated and dependencies installed." -ForegroundColor Green
