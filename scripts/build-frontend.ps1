<#
.SYNOPSIS
    Build the frontend PWA

.DESCRIPTION
    Installs dependencies and builds the Preact frontend for production.

.EXAMPLE
    .\build-frontend.ps1
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "frontend"

Write-Host "Building frontend..." -ForegroundColor Cyan

Push-Location $FrontendDir

try {
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Gray
        
        # Prefer pnpm, fall back to npm
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm install
        } else {
            npm install
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install dependencies"
            exit 1
        }
    }

    # Build
    Write-Host "Running production build..." -ForegroundColor Gray
    
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm build
    } else {
        npm run build
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }

    # Report bundle size
    $distDir = Join-Path $FrontendDir "dist"
    if (Test-Path $distDir) {
        $totalSize = (Get-ChildItem $distDir -Recurse | Measure-Object -Property Length -Sum).Sum
        $totalSizeKB = [math]::Round($totalSize / 1KB, 2)
        Write-Host "Build complete! Total size: ${totalSizeKB}KB" -ForegroundColor Green
        
        # List JS bundles
        Get-ChildItem "$distDir\assets\*.js" -ErrorAction SilentlyContinue | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  $($_.Name): ${sizeKB}KB" -ForegroundColor Gray
        }
    }
} finally {
    Pop-Location
}
