<#
.SYNOPSIS
    Build the Rust Lambda functions

.DESCRIPTION
    Uses cargo-lambda to build ARM64 binaries for AWS Lambda.

.PARAMETER Release
    Build in release mode (default: true)

.EXAMPLE
    .\build-backend.ps1

.EXAMPLE
    .\build-backend.ps1 -Release:$false
#>

param(
    [bool]$Release = $true
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host "Building backend Lambda functions..." -ForegroundColor Cyan

# Check for cargo-lambda
if (-not (Get-Command cargo-lambda -ErrorAction SilentlyContinue)) {
    Write-Host "cargo-lambda not found. Installing..." -ForegroundColor Yellow
    cargo install cargo-lambda
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install cargo-lambda"
        exit 1
    }
}

Push-Location $BackendDir

try {
    $buildArgs = @("lambda", "build", "--arm64")
    
    if ($Release) {
        $buildArgs += "--release"
    }

    Write-Host "Running: cargo $($buildArgs -join ' ')" -ForegroundColor Gray
    & cargo @buildArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }

    # Report binary sizes
    $targetDir = if ($Release) { "target/lambda" } else { "target/lambda" }
    
    if (Test-Path $targetDir) {
        Write-Host "`nBuild complete! Binary sizes:" -ForegroundColor Green
        Get-ChildItem $targetDir -Directory | ForEach-Object {
            $bootstrap = Join-Path $_.FullName "bootstrap"
            if (Test-Path $bootstrap) {
                $sizeMB = [math]::Round((Get-Item $bootstrap).Length / 1MB, 2)
                Write-Host "  $($_.Name): ${sizeMB}MB" -ForegroundColor Gray
            }
        }
    }
} finally {
    Pop-Location
}
