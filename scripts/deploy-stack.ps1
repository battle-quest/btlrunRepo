<#
.SYNOPSIS
    Deploy a single nested stack for btl.run

.DESCRIPTION
    Deploys only a specific nested stack without redeploying the entire infrastructure.
    Useful for quick updates to specific components.

.PARAMETER Stack
    The stack to deploy: api, storage, or cdn

.PARAMETER Environment
    Target environment: dev, staging, or prod

.EXAMPLE
    .\deploy-stack.ps1 -Stack api -Environment dev

.EXAMPLE
    .\deploy-stack.ps1 -Stack cdn -Environment prod
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("api", "storage", "cdn", "services")]
    [string]$Stack,

    [Parameter(Mandatory = $false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  btl.run Stack Deployment" -ForegroundColor Cyan
Write-Host "  Stack: $Stack" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Map stack names to template files
$stackTemplates = @{
    "api" = "stacks/api.yaml"
    "storage" = "stacks/storage.yaml"
    "cdn" = "stacks/cdn.yaml"
    "services" = "stacks/services.yaml"
}

$templateFile = $stackTemplates[$Stack]
$nestedStackName = "btl-run-$Stack-$Environment"

# Build dependencies based on stack
if ($Stack -eq "api") {
    Write-Host "`n[1/2] Building Rust backend..." -ForegroundColor Yellow
    & "$PSScriptRoot\build-backend.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend build failed"
        exit 1
    }
} elseif ($Stack -eq "services") {
    Write-Host "`n[1/2] Building TypeScript services..." -ForegroundColor Yellow
    & "$PSScriptRoot\build-services.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Services build failed"
        exit 1
    }
}

Write-Host "`n[2/2] Deploying $Stack stack..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\infrastructure"

try {
    # For Lambda stacks with SAM
    if ($Stack -eq "api" -or $Stack -eq "services") {
        Write-Host "Building SAM application..." -ForegroundColor Gray
        sam build --use-container --beta-features --template $templateFile

        Write-Host "Deploying via SAM..." -ForegroundColor Gray
        sam deploy `
            --template-file ".aws-sam/build/template.yaml" `
            --stack-name $nestedStackName `
            --capabilities CAPABILITY_IAM `
            --parameter-overrides "Environment=$Environment" `
            --no-confirm-changeset `
            --no-fail-on-empty-changeset

    } else {
        # For non-Lambda stacks, use standard CloudFormation
        Write-Host "Deploying via CloudFormation..." -ForegroundColor Gray
        
        # Get parameters from parent stack if needed
        $parentStackName = "btl-run-$Environment"
        $params = "Environment=$Environment"

        if ($Stack -eq "cdn") {
            # CDN stack needs outputs from storage and API stacks
            $frontendBucket = aws cloudformation describe-stacks `
                --stack-name "$parentStackName" `
                --query "Stacks[0].Outputs[?OutputKey=='FrontendBucket'].OutputValue" `
                --output text 2>$null

            $apiEndpoint = aws cloudformation describe-stacks `
                --stack-name "$parentStackName" `
                --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" `
                --output text 2>$null

            if ([string]::IsNullOrEmpty($frontendBucket) -or [string]::IsNullOrEmpty($apiEndpoint)) {
                Write-Warning "Could not get required parameters from parent stack."
                Write-Warning "Make sure the full stack is deployed first, or run: .\deploy.ps1 -Environment $Environment"
                exit 1
            }

            # Get bucket details
            $bucketArn = "arn:aws:s3:::$frontendBucket"
            $bucketDomain = "$frontendBucket.s3.amazonaws.com"
            
            $params = @(
                "Environment=$Environment"
                "FrontendBucketName=$frontendBucket"
                "FrontendBucketArn=$bucketArn"
                "FrontendBucketDomainName=$bucketDomain"
                "ApiEndpoint=$apiEndpoint"
            ) -join " "
        }

        aws cloudformation deploy `
            --template-file $templateFile `
            --stack-name $nestedStackName `
            --capabilities CAPABILITY_IAM `
            --parameter-overrides $params `
            --no-fail-on-empty-changeset
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Deployment failed"
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  $Stack Stack Deployed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Print stack outputs
Write-Host "`nStack Outputs:" -ForegroundColor Cyan
aws cloudformation describe-stacks `
    --stack-name $nestedStackName `
    --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" `
    --output table 2>$null
