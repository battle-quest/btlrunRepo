<#
.SYNOPSIS
    Generate and configure VAPID keys for web push notifications

.DESCRIPTION
    Generates VAPID key pair using web-push library and updates AWS Secrets Manager.
    Run this after deploying the notifications stack.

.PARAMETER Environment
    Target environment (dev, staging, prod). Defaults to "dev".

.PARAMETER Generate
    Generate new VAPID keys (otherwise just displays current secret ARN)

.EXAMPLE
    .\setup-vapid-keys.ps1 -Environment dev -Generate
#>

param(
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [switch]$Generate
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SecretName = "btl-run/$Environment/vapid-keys"

Write-Host "VAPID Keys Setup for btl.run ($Environment)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if secret exists
try {
    $secretArn = aws secretsmanager describe-secret --secret-id $SecretName --query 'ARN' --output text 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nSecret not found. Deploy the notifications stack first:" -ForegroundColor Yellow
        Write-Host "  .\scripts\deploy.ps1 -Environment $Environment" -ForegroundColor Gray
        exit 1
    }
    Write-Host "`nSecret ARN: $secretArn" -ForegroundColor Green
} catch {
    Write-Host "`nFailed to check secret. Ensure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

if (-not $Generate) {
    Write-Host "`nTo generate new VAPID keys, run:" -ForegroundColor Yellow
    Write-Host "  .\scripts\setup-vapid-keys.ps1 -Environment $Environment -Generate" -ForegroundColor Gray
    
    # Show current value (masked)
    $currentValue = aws secretsmanager get-secret-value --secret-id $SecretName --query 'SecretString' --output text 2>$null
    if ($currentValue -like "*PLACEHOLDER*") {
        Write-Host "`n[!] VAPID keys are not configured yet (still placeholder)" -ForegroundColor Yellow
    } else {
        Write-Host "`n[OK] VAPID keys are configured" -ForegroundColor Green
    }
    exit 0
}

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required to generate VAPID keys"
    exit 1
}

Write-Host "`nGenerating new VAPID keys..." -ForegroundColor Yellow

# Generate VAPID keys using Node.js and web-push
$generateScript = @"
const webPush = require('web-push');
const vapidKeys = webPush.generateVAPIDKeys();
console.log(JSON.stringify({
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
    subject: 'mailto:admin@btl.run'
}));
"@

# Try to use existing web-push installation or install temporarily
$pushNotificationsDir = Join-Path $ProjectRoot "AskAi_KVS\services\push-notifications"

Push-Location $pushNotificationsDir
try {
    # Ensure web-push is installed
    if (-not (Test-Path "node_modules/web-push")) {
        Write-Host "Installing web-push..." -ForegroundColor Gray
        npm install web-push --no-save 2>$null
    }
    
    # Generate keys
    $vapidJson = node -e $generateScript
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to generate VAPID keys"
        exit 1
    }
    
    Write-Host "Keys generated successfully!" -ForegroundColor Green
    
    # Parse and display public key (safe to share)
    $vapidData = $vapidJson | ConvertFrom-Json
    Write-Host "`nPublic Key (safe to share, use in frontend):" -ForegroundColor Cyan
    Write-Host $vapidData.publicKey -ForegroundColor White
    
} finally {
    Pop-Location
}

# Confirm before updating secret
Write-Host "`nThis will update the VAPID keys secret in AWS Secrets Manager." -ForegroundColor Yellow
$confirm = Read-Host "Continue? (y/N)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Aborted." -ForegroundColor Gray
    exit 0
}

# Update secret in AWS
Write-Host "`nUpdating secret in AWS Secrets Manager..." -ForegroundColor Yellow

# Escape JSON for AWS CLI
$escapedJson = $vapidJson -replace '"', '\"'

aws secretsmanager put-secret-value `
    --secret-id $SecretName `
    --secret-string "$escapedJson"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to update secret"
    exit 1
}

Write-Host "`n[OK] VAPID keys configured successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Add the public key to your frontend config" -ForegroundColor White
Write-Host "2. The push-notifications Lambda will automatically use the new keys" -ForegroundColor White
Write-Host "`nPublic Key for frontend:" -ForegroundColor Yellow
Write-Host $vapidData.publicKey -ForegroundColor White
