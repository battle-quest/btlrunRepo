<#
.SYNOPSIS
    Deploy UI/UX mockups to S3

.DESCRIPTION
    Uploads the uiux_mockups folder to the S3 bucket under /mocks/.
    Mockups will be accessible at https://btl.run/mocks/[screen-name]/index.html

.PARAMETER Environment
    Target environment: dev, staging, or prod

.PARAMETER NoInvalidate
    Skip CloudFront cache invalidation

.EXAMPLE
    .\deploy-mocks.ps1

.EXAMPLE
    .\deploy-mocks.ps1 -Environment prod
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",

    [switch]$NoInvalidate
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$MocksDir = Join-Path $ProjectRoot "uiux_mockups"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  btl.run Mockups Deployment" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verify mockups directory exists
if (-not (Test-Path $MocksDir)) {
    Write-Error "Mockups directory not found: $MocksDir"
    exit 1
}

# Get bucket name from stack outputs
# Try parent stack first, then storage stack (for individual stack deployments)
Write-Host "`nFetching S3 bucket from stack outputs..." -ForegroundColor Gray

$bucketName = $null
$stackName = "btl-run-$Environment"
$ErrorActionPreference = "SilentlyContinue"

# Try parent stack first
$bucketName = (aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='FrontendBucket'].OutputValue" --output text 2>&1) | Where-Object { $_ -notmatch "error" }

# Fall back to storage stack
if ([string]::IsNullOrEmpty($bucketName) -or $bucketName -eq "None") {
    $storageStackName = "btl-run-storage-$Environment"
    $bucketName = (aws cloudformation describe-stacks --stack-name $storageStackName --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text 2>&1) | Where-Object { $_ -notmatch "error" }
    $stackName = $storageStackName
}

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrEmpty($bucketName) -or $bucketName -eq "None") {
    Write-Error "Could not find frontend bucket. Make sure the stack is deployed."
    exit 1
}

Write-Host "Target bucket: s3://$bucketName/mocks/" -ForegroundColor Gray

# Count files to upload
$htmlCount = (Get-ChildItem "$MocksDir" -Recurse -Filter "*.html" | Measure-Object).Count
$cssCount = (Get-ChildItem "$MocksDir" -Recurse -Filter "*.css" | Measure-Object).Count
$jsCount = (Get-ChildItem "$MocksDir" -Recurse -Filter "*.js" | Measure-Object).Count
$assetCount = (Get-ChildItem "$MocksDir\assets" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count

Write-Host "`n[1/3] Uploading mockups..." -ForegroundColor Yellow
Write-Host "  Files: $htmlCount HTML, $cssCount CSS, $jsCount JS, $assetCount assets" -ForegroundColor Gray

# Sync all non-HTML files with 1-hour cache
aws s3 sync "$MocksDir" "s3://$bucketName/mocks" `
    --delete `
    --cache-control "max-age=3600" `
    --exclude "*.html" `
    --exclude "*.md" `
    --exclude "README.md"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to sync mockups"
    exit 1
}

# Upload HTML files with no-cache for easy iteration
Write-Host "`n[2/3] Uploading HTML files (no-cache)..." -ForegroundColor Yellow
Get-ChildItem "$MocksDir" -Recurse -Filter "*.html" | ForEach-Object {
    $relativePath = $_.FullName.Substring($MocksDir.Length + 1).Replace("\", "/")
    aws s3 cp $_.FullName "s3://$bucketName/mocks/$relativePath" `
        --cache-control "no-cache,no-store,must-revalidate" | Out-Null
    Write-Host "  Uploaded: mocks/$relativePath" -ForegroundColor DarkGray
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to upload HTML files"
    exit 1
}

# Invalidate CloudFront cache for /mocks/*
if (-not $NoInvalidate) {
    Write-Host "`n[3/3] Invalidating CloudFront cache for /mocks/*..." -ForegroundColor Yellow
    
    # Try CDN stack for distribution ID
    $cdnStackName = "btl-run-cdn-$Environment"
    $distributionId = (aws cloudformation describe-stacks --stack-name $cdnStackName --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text 2>&1) | Where-Object { $_ -notmatch "error" }

    if (-not [string]::IsNullOrEmpty($distributionId) -and $distributionId -ne "None") {
        aws cloudfront create-invalidation --distribution-id $distributionId --paths "/mocks/*" | Out-Null
        Write-Host "  Cache invalidation created" -ForegroundColor Gray
    } else {
        Write-Host "  Could not find CloudFront distribution ID, skipping invalidation" -ForegroundColor DarkGray
    }
} else {
    Write-Host "`n[3/3] Skipping CloudFront invalidation..." -ForegroundColor DarkGray
}

# Print success and URLs
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Mockups Deployed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Get CloudFront domain from CDN stack
$cdnStackName = "btl-run-cdn-$Environment"
$cfDomain = (aws cloudformation describe-stacks --stack-name $cdnStackName --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text 2>&1) | Where-Object { $_ -notmatch "error" }

# Default to btl.run for prod, otherwise use CloudFront domain
if ($Environment -eq "prod") {
    $websiteUrl = "https://btl.run"
} elseif (-not [string]::IsNullOrEmpty($cfDomain) -and $cfDomain -ne "None") {
    $websiteUrl = "https://$cfDomain"
} else {
    $websiteUrl = $null
}

if (-not [string]::IsNullOrEmpty($websiteUrl)) {
    Write-Host "`nMockup URLs:" -ForegroundColor Cyan
    Get-ChildItem "$MocksDir" -Directory | ForEach-Object {
        if ($_.Name -ne "assets") {
            Write-Host "  $websiteUrl/mocks/$($_.Name)/index.html" -ForegroundColor Gray
        }
    }
}
