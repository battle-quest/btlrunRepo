<#
.SYNOPSIS
    Full deployment script for btl.run

.DESCRIPTION
    Builds frontend and backend, then deploys all infrastructure via SAM.

.PARAMETER Environment
    Target environment: dev, staging, or prod

.PARAMETER SkipBuild
    Skip building frontend and backend (deploy existing artifacts)

.PARAMETER SkipFrontendUpload
    Skip uploading frontend to S3

.EXAMPLE
    .\deploy.ps1 -Environment dev

.EXAMPLE
    .\deploy.ps1 -Environment prod -SkipBuild
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",

    [switch]$SkipBuild,
    [switch]$SkipFrontendUpload
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  btl.run Full Deployment" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Build steps
if (-not $SkipBuild) {
    Write-Host "`n[1/4] Building frontend..." -ForegroundColor Yellow
    & "$PSScriptRoot\build-frontend.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        exit 1
    }

    Write-Host "`n[2/4] Building backend..." -ForegroundColor Yellow
    & "$PSScriptRoot\build-backend.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend build failed"
        exit 1
    }
} else {
    Write-Host "`n[1-2/4] Skipping builds..." -ForegroundColor DarkGray
}

# SAM deployment
Write-Host "`n[3/4] Deploying infrastructure via SAM..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\infrastructure"

try {
    # Build SAM application
    Write-Host "Running SAM build..." -ForegroundColor Gray
    sam build --use-container --beta-features

    if ($LASTEXITCODE -ne 0) {
        Write-Error "SAM build failed"
        exit 1
    }

    # Deploy
    Write-Host "Running SAM deploy..." -ForegroundColor Gray
    $confirmFlag = if ($Environment -eq "prod") { "" } else { "--no-confirm-changeset" }
    
    sam deploy `
        --config-env $Environment `
        --no-fail-on-empty-changeset `
        $confirmFlag

    if ($LASTEXITCODE -ne 0) {
        Write-Error "SAM deploy failed"
        exit 1
    }
} finally {
    Pop-Location
}

# Upload frontend to S3
if (-not $SkipFrontendUpload) {
    Write-Host "`n[4/4] Uploading frontend to S3..." -ForegroundColor Yellow
    
    # Get bucket name from stack outputs
    $stackName = "btl-run-$Environment"
    $bucketName = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucket'].OutputValue" `
        --output text

    if ([string]::IsNullOrEmpty($bucketName)) {
        Write-Error "Could not find frontend bucket. Make sure the stack is deployed."
        exit 1
    }

    Write-Host "Uploading to s3://$bucketName" -ForegroundColor Gray
    aws s3 sync "$ProjectRoot\frontend\dist" "s3://$bucketName" `
        --delete `
        --cache-control "max-age=31536000,immutable" `
        --exclude "index.html" `
        --exclude "*.json"

    # Upload index.html and JSON with no-cache
    aws s3 cp "$ProjectRoot\frontend\dist\index.html" "s3://$bucketName/index.html" `
        --cache-control "no-cache,no-store,must-revalidate"
    
    Get-ChildItem "$ProjectRoot\frontend\dist\*.json" | ForEach-Object {
        aws s3 cp $_.FullName "s3://$bucketName/$($_.Name)" `
            --cache-control "no-cache,no-store,must-revalidate"
    }

    # Invalidate CloudFront cache
    $distributionId = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" `
        --output text

    if (-not [string]::IsNullOrEmpty($distributionId)) {
        Write-Host "Invalidating CloudFront cache..." -ForegroundColor Gray
        aws cloudfront create-invalidation `
            --distribution-id $distributionId `
            --paths "/*" | Out-Null
    }
} else {
    Write-Host "`n[4/4] Skipping frontend upload..." -ForegroundColor DarkGray
}

# Print outputs
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$stackName = "btl-run-$Environment"
Write-Host "`nStack Outputs:" -ForegroundColor Cyan
aws cloudformation describe-stacks `
    --stack-name $stackName `
    --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" `
    --output table
