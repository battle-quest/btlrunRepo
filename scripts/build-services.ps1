<#
.SYNOPSIS
    Build the TypeScript Lambda services (AskAI, KVS)

.DESCRIPTION
    Compiles TypeScript services for Lambda deployment.

.EXAMPLE
    .\build-services.ps1
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServicesDir = Join-Path $ProjectRoot "AskAi_KVS\services"

Write-Host "Building TypeScript services..." -ForegroundColor Cyan

# Install root dependencies if needed
$AskAiKvsRoot = Join-Path $ProjectRoot "AskAi_KVS"
if (-not (Test-Path (Join-Path $AskAiKvsRoot "node_modules"))) {
    Write-Host "Installing root dependencies..." -ForegroundColor Gray
    Push-Location $AskAiKvsRoot
    try {
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm install
        } else {
            npm install
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install dependencies"
            exit 1
        }
    } finally {
        Pop-Location
    }
}

# Build each service
$services = @("askai", "kvs", "push-notifications")

foreach ($service in $services) {
    $serviceDir = Join-Path $ServicesDir $service
    Write-Host "`nBuilding $service..." -ForegroundColor Yellow
    
    Push-Location $serviceDir
    try {
        # Clean previous build
        if (Test-Path "dist") {
            Remove-Item -Recurse -Force "dist"
        }

        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Host "  Installing dependencies..." -ForegroundColor Gray
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                pnpm install
            } else {
                npm install
            }
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to install dependencies for $service"
                exit 1
            }
        }

        # Build
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm build
        } else {
            npm run build
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Build failed for $service"
            exit 1
        }

        # Verify output
        if (-not (Test-Path "dist/index.js")) {
            Write-Error "Build output missing for $service"
            exit 1
        }

        $sizeKB = [math]::Round((Get-Item "dist/index.js").Length / 1KB, 2)
        
        # Check for additional outputs (e.g., push-notifications has dispatcher.js)
        if (Test-Path "dist/dispatcher.js") {
            $dispatcherKB = [math]::Round((Get-Item "dist/dispatcher.js").Length / 1KB, 2)
            Write-Host "  [OK] $service built (index: ${sizeKB}KB, dispatcher: ${dispatcherKB}KB)" -ForegroundColor Green
        } else {
            Write-Host "  [OK] $service built (${sizeKB}KB)" -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
}

Write-Host "`nAll services built successfully!" -ForegroundColor Green
