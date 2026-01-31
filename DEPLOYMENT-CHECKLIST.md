# btl.run Deployment Checklist

Use this checklist before deploying to each environment.

## Pre-Deployment Checklist

### For Development Environment

- [ ] OpenAI API key secret created
  ```powershell
  .\scripts\setup-openai-secret.ps1 -Environment dev -ApiKey "sk-..."
  ```

- [ ] Secret ARN updated in `infrastructure/parameters/dev.json`

- [ ] AWS CLI configured with valid credentials
  ```powershell
  aws sts get-caller-identity
  ```

- [ ] Docker is running
  ```powershell
  docker ps
  ```

- [ ] All builds successful
  ```powershell
  .\scripts\build-frontend.ps1
  .\scripts\build-services.ps1
  # Note: Rust builds via SAM with Docker
  ```

### For Production Environment

- [ ] Existing OpenAI secret ARN verified in `infrastructure/parameters/prod.json`
  ```
  Current: arn:aws:secretsmanager:us-east-1:615821144597:secret:battle-quest/prod/openai-api-key-LdzRqt
  ```

- [ ] Custom domain name configured (if applicable)

- [ ] Route 53 hosted zone ID set (if using custom domain)

- [ ] Review changeset before confirming
  ```powershell
  # SAM will show changeset for approval
  .\scripts\deploy.ps1 -Environment prod
  ```

## Deployment Steps

### Full Deployment

```powershell
# Step 1: Build everything
.\scripts\build-frontend.ps1
.\scripts\build-services.ps1
# Rust builds during SAM deployment

# Step 2: Deploy infrastructure
.\scripts\deploy.ps1 -Environment dev

# Step 3: Verify outputs
aws cloudformation describe-stacks `
    --stack-name "btl-run-dev" `
    --query "Stacks[0].Outputs" `
    --output table
```

### Partial Deployment (Faster Iteration)

```powershell
# Deploy only services (AskAI/KVS)
.\scripts\build-services.ps1
.\scripts\deploy-stack.ps1 -Stack services -Environment dev

# Deploy only game API (Rust)
.\scripts\deploy-stack.ps1 -Stack api -Environment dev

# Deploy only frontend
.\scripts\build-frontend.ps1
.\scripts\deploy.ps1 -Environment dev -SkipBuild

# Deploy only CloudFront/CDN
.\scripts\deploy-stack.ps1 -Stack cdn -Environment dev
```

## Post-Deployment Verification

### Check Deployed Resources

```powershell
# List all btl-run functions
aws lambda list-functions `
    --query 'Functions[?contains(FunctionName, `btl-run`)].{Name:FunctionName, Runtime:Runtime}' `
    --output table

# Get stack outputs
aws cloudformation describe-stacks `
    --stack-name "btl-run-dev" `
    --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" `
    --output table

# Check DynamoDB table
aws dynamodb describe-table `
    --table-name "btl-run-kvs-dev" `
    --query 'Table.{Name:TableName, Status:TableStatus, Items:ItemCount}'
```

### Test Endpoints

```powershell
# Get endpoints from stack
$endpoints = aws cloudformation describe-stacks `
    --stack-name "btl-run-dev" `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

# Test game API health
$apiUrl = ($endpoints | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
Invoke-RestMethod -Uri "$apiUrl/health"

# Test KVS (create, read, delete)
$kvsUrl = ($endpoints | Where-Object { $_.OutputKey -eq "KVSFunctionUrl" }).OutputValue
Invoke-RestMethod -Method PUT -Uri "$kvsUrl/test:key" -Body '{"hello":"world"}' -ContentType "application/json"
Invoke-RestMethod -Method GET -Uri "$kvsUrl/test:key"
Invoke-RestMethod -Method DELETE -Uri "$kvsUrl/test:key"

# Test AskAI
$askaiUrl = ($endpoints | Where-Object { $_.OutputKey -eq "AskAiFunctionUrl" }).OutputValue
$body = @{
    systemPrompt = "You are a test assistant."
    input = "Say 'test successful'"
    maxTokens = 20
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri $askaiUrl -Body $body -ContentType "application/json"
```

### Frontend Configuration

After deployment, update frontend `.env.local`:

```powershell
# Get outputs
$outputs = aws cloudformation describe-stacks `
    --stack-name "btl-run-dev" `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

# Create .env.local
$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
$askaiUrl = ($outputs | Where-Object { $_.OutputKey -eq "AskAiFunctionUrl" }).OutputValue
$kvsUrl = ($outputs | Where-Object { $_.OutputKey -eq "KVSFunctionUrl" }).OutputValue

@"
VITE_API_ENDPOINT=$apiUrl
VITE_ASKAI_ENDPOINT=$askaiUrl
VITE_KVS_ENDPOINT=$kvsUrl
"@ | Out-File -FilePath frontend/.env.local -Encoding utf8
```

## Rollback Procedure

If deployment fails or issues occur:

```powershell
# Delete the entire stack
aws cloudformation delete-stack --stack-name "btl-run-dev"

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name "btl-run-dev"

# Or rollback to previous version
aws cloudformation update-stack `
    --stack-name "btl-run-dev" `
    --use-previous-template
```

## Troubleshooting

### SAM Build Fails

- **Docker not running**: Start Docker Desktop
- **Out of disk space**: Clean Docker images `docker system prune`
- **Permission denied**: Run PowerShell as Administrator

### Deployment Fails

- **Missing secret**: Check OpenAI secret exists and ARN is correct
- **IAM permissions**: Ensure AWS credentials have CloudFormation/Lambda/S3 permissions
- **Resource limits**: Check AWS service quotas

### Function Errors

- **View logs:**
  ```powershell
  # Tail logs for a function
  sam logs -n btl-run-askai-dev --tail
  
  # Or use AWS CLI
  aws logs tail "/aws/lambda/btl-run-askai-dev" --follow
  ```

- **Invoke locally:**
  ```powershell
  cd AskAi_KVS/services/askai
  npx tsx src/index.ts  # Test locally
  ```

## Performance Validation

After deployment, verify performance:

- [ ] Frontend loads in < 2 seconds
- [ ] Bundle size < 50KB (target: 40KB)
- [ ] Lambda cold starts < 500ms
- [ ] CloudFront cache hit ratio > 80%

Check CloudFront metrics:
```powershell
aws cloudwatch get-metric-statistics `
    --namespace "AWS/CloudFront" `
    --metric-name "Requests" `
    --dimensions Name=DistributionId,Value=YOUR_DIST_ID `
    --start-time (Get-Date).AddDays(-1) `
    --end-time (Get-Date) `
    --period 3600 `
    --statistics Sum
```

## Security Checklist

Before production deployment:

- [ ] OpenAI API key in Secrets Manager (not environment variables)
- [ ] CORS restricted to specific origins
- [ ] Function URLs auth type evaluated (consider API Gateway with authorizer)
- [ ] CloudFront WAF rules configured
- [ ] S3 bucket policies reviewed
- [ ] IAM roles follow least privilege
- [ ] CloudTrail logging enabled
- [ ] Cost alerts configured

## Cost Estimation

Expected monthly costs (dev environment, moderate usage):

| Service | Estimated Cost |
|---------|----------------|
| Lambda | $5-10 (1M requests) |
| DynamoDB | $1-5 (on-demand) |
| S3 | < $1 (static hosting) |
| CloudFront | $5-20 (depends on traffic) |
| Secrets Manager | $0.40/secret |
| **Total** | **$12-36/month** |

Production costs will scale with traffic.
