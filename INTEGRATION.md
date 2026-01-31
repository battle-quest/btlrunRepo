# AskAI/KVS Integration Strategy

This document explains how the existing AskAI and KVS services are integrated into btl.run.

## Current Deployment

You have existing Lambda functions deployed:

| Function | Name | Endpoint |
|----------|------|----------|
| AskAI | `battle-quest-prod-askai` | https://5qxowokttms7px4cmtza4cugku0ovubz.lambda-url.us-east-1.on.aws/ |
| KVS | `battle-quest-prod-kvs` | https://ajeqoveqydsyhxofa5kwb3bx6a0ptbcw.lambda-url.us-east-1.on.aws/ |

**Resources:**
- DynamoDB Table: `battle-quest-kvs-prod`
- OpenAI Secret: `arn:aws:secretsmanager:us-east-1:615821144597:secret:battle-quest/prod/openai-api-key-LdzRqt`

## Integration Approach

### Strategy: Parallel Deployment

The btl.run infrastructure creates **new** resources alongside your existing ones:

```
Existing (battle-quest):          New (btl-run):
├── battle-quest-prod-askai  →   ├── btl-run-askai-{env}
├── battle-quest-prod-kvs    →   ├── btl-run-kvs-{env}
├── battle-quest-kvs-prod    →   ├── btl-run-kvs-{env} (DynamoDB)
└── openai-api-key secret    →   └── (reuses existing secret)
```

**Benefits:**
- No disruption to existing deployments
- Can test btl.run independently
- Gradual migration path
- Easy rollback

### Why Not Import Existing Resources?

CloudFormation resource import is complex and risky:
- Requires exact configuration match
- Can break existing deployments if misconfigured
- Hard to roll back if issues occur

Instead, we:
1. Create new btl-run resources for dev/staging
2. For prod, configure to use your existing OpenAI secret (saves costs)
3. Can migrate data later if needed

## Deployment Workflow

### Development Environment

1. **Create new OpenAI secret for dev:**
   ```powershell
   .\scripts\setup-openai-secret.ps1 -Environment dev -ApiKey "sk-..."
   ```

2. **Deploy:**
   ```powershell
   .\scripts\deploy.ps1 -Environment dev
   ```

   Creates:
   - `btl-run-askai-dev` (new function)
   - `btl-run-kvs-dev` (new function)
   - `btl-run-kvs-dev` (new DynamoDB table)
   - New OpenAI secret (if not using existing)

### Production Environment

1. **Deploy with existing secret:**
   ```powershell
   .\scripts\deploy.ps1 -Environment prod
   ```

   Creates:
   - `btl-run-askai-prod` (new function, uses existing secret)
   - `btl-run-kvs-prod` (new function)
   - `btl-run-kvs-prod` (new DynamoDB table, separate from battle-quest-kvs-prod)

2. **Optionally migrate data:**
   ```powershell
   # Export from old table
   aws dynamodb scan --table-name battle-quest-kvs-prod > backup.json
   
   # Import to new table (write script or use AWS DMS)
   ```

## Code Organization

### Service Layer (`AskAi_KVS/`)

The services are self-contained and can be used in multiple ways:

1. **As Lambda Functions** (via SAM deployment)
   - Deployed with `infrastructure/stacks/services.yaml`
   - Accessible via Function URLs
   
2. **As Library Code** (imported into other services)
   - Use the clients: `import { AIClient, KVSClient } from './AskAi_KVS/shared/clients'`
   - Call from Rust API or frontend

3. **As Mock Servers** (local development)
   - Run `mocks/askai-server.ts` and `mocks/kvs-server.ts`
   - No AWS credentials needed

### Frontend Integration

The Preact frontend calls services via environment variables:

```typescript
// From .env.local or deployment outputs
const askAI = new AIClient(import.meta.env.VITE_ASKAI_ENDPOINT);
const kvs = new KVSClient({ endpoint: import.meta.env.VITE_KVS_ENDPOINT });
```

### Rust API Integration

The Rust game API can call AskAI/KVS services:

```rust
// Use reqwest to call Function URLs
let response = reqwest::get(format!("{}/game:state", kvs_endpoint)).await?;
```

## Migration Path (If Needed)

If you want to consolidate to btl-run infrastructure:

1. **Deploy btl-run infrastructure**
2. **Test thoroughly**
3. **Migrate data** (DynamoDB table copy)
4. **Update clients** to point to new endpoints
5. **Decommission old resources**

For now, both can coexist safely.

## Security Configuration

### Current State (Existing Functions)
- Function URLs with NONE auth (open to internet)
- CORS allows all origins (`*`)

### Recommended for Production
- Add API Gateway with authorizers
- Implement request signing
- Restrict CORS to specific domains
- Add CloudFront WAF rules
- Enable AWS X-Ray tracing

### OpenAI Secret Access

Only Lambda functions with explicit IAM permissions can read the secret:

```yaml
Policies:
  - Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action: secretsmanager:GetSecretValue
        Resource: !Ref OpenAiApiKeySecret
```

## Cost Optimization

- **Reuse OpenAI secret across environments** (configured for prod)
- **DynamoDB on-demand** (pay per request, no idle costs)
- **Lambda ARM64** (20% cheaper than x86)
- **Function URLs** (no API Gateway costs for services)

## Next Steps

1. Deploy to dev environment
2. Test services integration
3. Implement game logic using the services
4. Add authentication/authorization
5. Configure custom domain
6. Set up CI/CD
