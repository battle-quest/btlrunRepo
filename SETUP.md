# btl.run Setup Guide

Complete setup instructions for deploying btl.run to AWS.

## Current Status

You already have deployed:
- **AskAI Lambda**: `btl-run-prod-askai` → https://5qxowokttms7px4cmtza4cugku0ovubz.lambda-url.us-east-1.on.aws/
- **KVS Lambda**: `btl-run-prod-kvs` → https://ajeqoveqydsyhxofa5kwb3bx6a0ptbcw.lambda-url.us-east-1.on.aws/
- **DynamoDB Table**: `btl-run-kvs-prod`
- **OpenAI Secret**: `arn:aws:secretsmanager:us-east-1:615821144597:secret:btl-run/prod/openai-api-key-LdzRqt`

## Integration Options

### Option 1: Use Existing Resources (Recommended for Prod)

The `prod.json` parameters file is already configured to use your existing OpenAI secret:

```json
{
  "OpenAiApiKeySecretArn": "arn:aws:secretsmanager:us-east-1:615821144597:secret:btl-run/prod/openai-api-key-LdzRqt"
}
```

Deploy with:
```powershell
.\scripts\deploy.ps1 -Environment prod
```

This will:
- Create NEW btl-run Lambda functions (separate from your existing ones)
- Reuse your existing OpenAI secret
- Create a NEW DynamoDB table (`btl-run-kvs-prod`) separate from `btl-run-kvs-prod`

### Option 2: Create New Resources for Dev

For development environment:

1. **Create OpenAI secret for dev:**
   ```powershell
   aws secretsmanager create-secret `
       --name "btl-run/dev/openai-api-key" `
       --description "OpenAI API key for btl.run dev" `
       --secret-string "sk-YOUR-ACTUAL-OPENAI-API-KEY"
   ```

2. **Get the ARN and update dev.json:**
   ```powershell
   $secretArn = aws secretsmanager describe-secret `
       --secret-id "btl-run/dev/openai-api-key" `
       --query 'ARN' `
       --output text
   
   Write-Host "Update dev.json OpenAiApiKeySecretArn to: $secretArn"
   ```

3. **Deploy:**
   ```powershell
   .\scripts\deploy.ps1 -Environment dev
   ```

### Option 3: Let SAM Create Secret (Not Recommended)

Leave `OpenAiApiKeySecretArn` empty in parameters file. SAM will create a placeholder secret that you must update:

```powershell
# After deployment, update the secret:
$secretArn = aws cloudformation describe-stacks `
    --stack-name "btl-run-dev" `
    --query "Stacks[0].Outputs[?OutputKey=='OpenAiSecretArn'].OutputValue" `
    --output text

aws secretsmanager put-secret-value `
    --secret-id $secretArn `
    --secret-string "sk-YOUR-ACTUAL-OPENAI-API-KEY"
```

## Full Deployment Steps

1. **Install prerequisites** (all installed):
   - AWS CLI configured
   - SAM CLI
   - Rust + cargo-lambda (pip installed)
   - Node.js + pnpm
   - Docker (required for SAM builds)
   
   **Note:** For Rust Lambda builds, SAM uses Docker (`--use-container` flag) which handles cross-compilation automatically. This is the recommended approach and doesn't require Zig locally.

2. **Configure OpenAI secret** (see options above)

3. **Build everything:**
   ```powershell
   .\scripts\build-frontend.ps1
   .\scripts\build-services.ps1
   .\scripts\build-backend.ps1
   ```

4. **Deploy infrastructure:**
   ```powershell
   # Deploy to dev
   .\scripts\deploy.ps1 -Environment dev

   # Or deploy to prod with existing secret
   .\scripts\deploy.ps1 -Environment prod
   ```

5. **Get deployment outputs:**
   ```powershell
   aws cloudformation describe-stacks `
       --stack-name "btl-run-dev" `
       --query "Stacks[0].Outputs" `
       --output table
   ```

## Partial Deployments

Update individual stacks without full redeployment:

```powershell
# Update only TypeScript services
.\scripts\deploy-stack.ps1 -Stack services -Environment dev

# Update only Rust game API
.\scripts\deploy-stack.ps1 -Stack api -Environment dev

# Update only storage/S3
.\scripts\deploy-stack.ps1 -Stack storage -Environment dev

# Update only CloudFront/CDN
.\scripts\deploy-stack.ps1 -Stack cdn -Environment dev
```

## Environment Configuration

Edit `infrastructure/parameters/{env}.json`:

```json
{
  "Parameters": {
    "Environment": "dev",
    "DomainName": "",
    "HostedZoneId": "",
    "OpenAiApiKeySecretArn": "YOUR-SECRET-ARN",
    "DefaultAiModel": "gpt-5-nano"
  }
}
```

## Testing Services Locally

**KVS Mock Server:**
```powershell
cd AskAi_KVS
npx tsx mocks/kvs-server.ts
# http://localhost:9000
```

**AskAI Mock Server:**
```powershell
cd AskAi_KVS
npx tsx mocks/askai-server.ts
# http://localhost:9001
```

**Frontend with mock backends:**
```powershell
cd frontend

# Create .env.local
echo "VITE_KVS_ENDPOINT=http://localhost:9000" > .env.local
echo "VITE_ASKAI_ENDPOINT=http://localhost:9001" >> .env.local

pnpm dev
```

## Migrating from Existing Deployment

If you want to migrate from `btl-run-prod-*` to `btl-run-*`:

1. **Export data from old table:**
   ```powershell
   aws dynamodb scan `
       --table-name btl-run-kvs-prod `
       --output json > kvs-backup.json
   ```

2. **Deploy new infrastructure:**
   ```powershell
   .\scripts\deploy.ps1 -Environment prod
   ```

3. **Import data to new table:**
   ```powershell
   # Use AWS CLI or write a migration script
   ```

4. **Update any clients to use new endpoints**

5. **Delete old resources when ready**

## Security Notes

- OpenAI API key is stored in AWS Secrets Manager (never in code)
- Function URLs are currently open (AuthType: NONE)
- For production, consider:
  - Adding API Gateway authorizers
  - Implementing request signing
  - Rate limiting at CloudFront level
  - Restricting CORS origins

## Troubleshooting

**SAM build fails:**
- Ensure Docker is running
- Check that all TypeScript services have `dist/` output

**OpenAI errors:**
- Verify secret contains valid API key
- Check Lambda has permission to read secret
- Ensure sufficient OpenAI quota

**DynamoDB errors:**
- Verify table exists
- Check Lambda IAM role has DynamoDB permissions
- Confirm table name matches environment variable
