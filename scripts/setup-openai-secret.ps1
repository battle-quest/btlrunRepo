<#
.SYNOPSIS
    Setup OpenAI API key in AWS Secrets Manager

.DESCRIPTION
    Creates or updates the OpenAI API key secret for a given environment.

.PARAMETER Environment
    Target environment: dev, staging, or prod

.PARAMETER ApiKey
    The OpenAI API key to store

.PARAMETER Update
    Update an existing secret instead of creating new

.EXAMPLE
    .\setup-openai-secret.ps1 -Environment dev -ApiKey "sk-..."

.EXAMPLE
    .\setup-openai-secret.ps1 -Environment prod -ApiKey "sk-..." -Update
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey,

    [switch]$Update
)

$ErrorActionPreference = "Stop"

$secretName = "btl-run/$Environment/openai-api-key"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenAI Secret Setup" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Validate API key format
if (-not $ApiKey.StartsWith("sk-")) {
    Write-Warning "API key should start with 'sk-'"
    $confirm = Read-Host "Continue anyway? (y/n)"
    if ($confirm -ne "y") {
        exit 0
    }
}

try {
    if ($Update) {
        Write-Host "`nUpdating existing secret: $secretName" -ForegroundColor Yellow
        
        aws secretsmanager put-secret-value `
            --secret-id $secretName `
            --secret-string $ApiKey

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to update secret"
            exit 1
        }

        Write-Host "✓ Secret updated successfully" -ForegroundColor Green
    } else {
        Write-Host "`nCreating new secret: $secretName" -ForegroundColor Yellow
        
        $result = aws secretsmanager create-secret `
            --name $secretName `
            --description "OpenAI API key for btl.run $Environment" `
            --secret-string $ApiKey `
            --tags "Key=Project,Value=btl-run" "Key=Environment,Value=$Environment" `
            --output json | ConvertFrom-Json

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create secret"
            exit 1
        }

        Write-Host "✓ Secret created successfully" -ForegroundColor Green
        Write-Host "`nSecret ARN:" -ForegroundColor Cyan
        Write-Host $result.ARN -ForegroundColor White
        
        Write-Host "`nUpdate infrastructure/parameters/$Environment.json:" -ForegroundColor Yellow
        Write-Host "  OpenAiApiKeySecretArn: $($result.ARN)" -ForegroundColor Gray
    }

    # Verify the secret
    Write-Host "`nVerifying secret..." -ForegroundColor Gray
    $secretValue = aws secretsmanager get-secret-value `
        --secret-id $secretName `
        --query 'SecretString' `
        --output text

    if ($secretValue -eq $ApiKey) {
        Write-Host "✓ Secret verified" -ForegroundColor Green
    } else {
        Write-Warning "Secret verification failed - value mismatch"
    }

} catch {
    Write-Error "Error: $_"
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
