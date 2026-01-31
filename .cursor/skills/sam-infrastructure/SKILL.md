---
name: sam-infrastructure
description: Manage AWS resources using SAM (Serverless Application Model). Use when creating, modifying, or deploying AWS infrastructure like Lambda functions, API Gateway, DynamoDB tables, S3 buckets, or CloudFront distributions.
---

# AWS SAM Infrastructure Management

Manage AWS resources for btl.run using AWS SAM and nested CloudFormation stacks.

## Quick Reference

| Action | Command | Location |
|--------|---------|----------|
| Validate templates | `sam validate --template infrastructure/template.yaml --lint` | Root |
| Deploy full stack | `.\scripts\deploy.ps1 -Environment dev` | Root |
| Deploy single stack | `.\scripts\deploy-stack.ps1 -Stack services -Environment dev` | Root |
| View outputs | `aws cloudformation describe-stacks --stack-name btl-run-dev` | Anywhere |
| Delete stack | `aws cloudformation delete-stack --stack-name btl-run-dev` | Anywhere |

## btl.run Stack Architecture

```
template.yaml (root orchestrator)
├── stacks/services.yaml    → AskAI + KVS + DynamoDB + Secrets
├── stacks/api.yaml         → Rust game API + HTTP API Gateway
├── stacks/storage.yaml     → S3 buckets for frontend + artifacts
└── stacks/cdn.yaml         → CloudFront + Route 53
```

## Adding Resources

### Edit Existing Stack

Modify `infrastructure/stacks/{stack-name}.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: My stack description

Parameters:
  Environment:
    Type: String

Resources:
  # Add resources here
  
Outputs:
  # Add outputs for cross-stack references
```

### Create New Nested Stack

1. Create `infrastructure/stacks/my-new-stack.yaml`
2. Add to root `infrastructure/template.yaml`:

```yaml
Resources:
  MyNewStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: stacks/my-new-stack.yaml
      Parameters:
        Environment: !Ref Environment
```

## Common Resource Patterns

### Lambda Function (Node.js with esbuild)

```yaml
MyFunction:
  Type: AWS::Serverless::Function
  Metadata:
    BuildMethod: esbuild
    BuildProperties:
      EntryPoints:
        - src/index.ts
      External:
        - '@aws-sdk/*'
      Target: node20
      Format: esm
  Properties:
    FunctionName: !Sub "btl-run-my-function-${Environment}"
    Runtime: nodejs20.x
    Architectures:
      - arm64
    Handler: index.handler
    CodeUri: ../../path/to/function
    Timeout: 30
    MemorySize: 256
    Tracing: Active
    Environment:
      Variables:
        TABLE_NAME: !Ref MyTable
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref MyTable
```

### Lambda Function (Rust)

```yaml
RustFunction:
  Type: AWS::Serverless::Function
  Metadata:
    BuildMethod: rust-cargolambda
    BuildProperties:
      Binary: bootstrap
  Properties:
    FunctionName: !Sub "btl-run-rust-api-${Environment}"
    Runtime: provided.al2023
    Architectures:
      - arm64
    Handler: bootstrap
    CodeUri: ../../backend/functions/api
    Timeout: 30
    MemorySize: 256
    Tracing: Active
```

### DynamoDB Table

```yaml
MyTable:
  Type: AWS::DynamoDB::Table
  DeletionPolicy: Retain
  UpdateReplacePolicy: Retain
  Properties:
    TableName: !Sub "btl-run-my-table-${Environment}"
    BillingMode: PAY_PER_REQUEST
    AttributeDefinitions:
      - AttributeName: pk
        AttributeType: S
      - AttributeName: sk
        AttributeType: S
    KeySchema:
      - AttributeName: pk
        KeyType: HASH
      - AttributeName: sk
        KeyType: RANGE
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: true
    StreamSpecification:
      StreamViewType: NEW_AND_OLD_IMAGES
    Tags:
      - Key: Project
        Value: btl-run
      - Key: Environment
        Value: !Ref Environment
```

### S3 Bucket

```yaml
MyBucket:
  Type: AWS::S3::Bucket
  DeletionPolicy: Retain
  Properties:
    BucketName: !Sub "btl-run-my-bucket-${Environment}-${AWS::AccountId}"
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
    VersioningConfiguration:
      Status: Enabled
    LifecycleConfiguration:
      Rules:
        - Id: CleanupOldVersions
          Status: Enabled
          NoncurrentVersionExpiration:
            NoncurrentDays: 30
```

### Secrets Manager Secret

```yaml
MySecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: !Sub "btl-run/${Environment}/my-secret"
    Description: My secret description
    SecretString: '{"key":"PLACEHOLDER-UPDATE-AFTER-DEPLOYMENT"}'
    Tags:
      - Key: Project
        Value: btl-run

# Grant Lambda read access
MyFunction:
  Policies:
    - Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource: !Ref MySecret
  Environment:
    Variables:
      MY_SECRET_ARN: !Ref MySecret
```

### HTTP API Gateway

```yaml
MyHttpApi:
  Type: AWS::Serverless::HttpApi
  Properties:
    StageName: !Ref Environment
    Description: My HTTP API
    CorsConfiguration:
      AllowOrigins:
        - "*"
      AllowHeaders:
        - Content-Type
        - Authorization
      AllowMethods:
        - GET
        - POST
        - PUT
        - DELETE
      MaxAge: 600
    DefaultRouteSettings:
      ThrottlingBurstLimit: 100
      ThrottlingRateLimit: 50

# Connect Lambda to API
MyFunction:
  Events:
    ApiEvent:
      Type: HttpApi
      Properties:
        ApiId: !Ref MyHttpApi
        Path: /my-path
        Method: GET
```

### CloudFront Distribution

```yaml
MyDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Enabled: true
      HttpVersion: http2and3
      PriceClass: PriceClass_100
      DefaultRootObject: index.html
      Origins:
        - Id: S3Origin
          DomainName: !GetAtt MyBucket.RegionalDomainName
          OriginAccessControlId: !Ref MyOAC
      DefaultCacheBehavior:
        TargetOriginId: S3Origin
        ViewerProtocolPolicy: redirect-to-https
        Compress: true
        CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6  # Managed-CachingOptimized
```

## Deployment Commands

### Full Deployment

```powershell
# Build everything
.\scripts\build-frontend.ps1
.\scripts\build-services.ps1

# Deploy
.\scripts\deploy.ps1 -Environment dev

# Deploy to prod (with confirmation)
.\scripts\deploy.ps1 -Environment prod
```

### Partial Deployment (Individual Stacks)

```powershell
# Services only (AskAI + KVS)
.\scripts\deploy-stack.ps1 -Stack services -Environment dev

# API only (Rust game API)
.\scripts\deploy-stack.ps1 -Stack api -Environment dev

# Storage only (S3 buckets)
.\scripts\deploy-stack.ps1 -Stack storage -Environment dev

# CDN only (CloudFront)
.\scripts\deploy-stack.ps1 -Stack cdn -Environment dev
```

### View Deployment Status

```powershell
# Main stack
aws cloudformation describe-stacks `
    --stack-name "btl-run-dev" `
    --query "Stacks[0].{Status:StackStatus, Updated:LastUpdatedTime}"

# Nested stacks
aws cloudformation list-stacks `
    --query "StackSummaries[?contains(StackName, 'btl-run-') && StackStatus!='DELETE_COMPLETE'].{Name:StackName, Status:StackStatus}" `
    --output table

# Stack outputs
aws cloudformation describe-stacks `
    --stack-name "btl-run-dev" `
    --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" `
    --output table
```

## Parameter Management

### Environment-Specific Parameters

Edit `infrastructure/parameters/{env}.json`:

```json
{
  "Parameters": {
    "Environment": "dev",
    "DomainName": "",
    "HostedZoneId": "",
    "OpenAiApiKeySecretArn": "arn:aws:secretsmanager:...",
    "DefaultAiModel": "gpt-5-nano"
  },
  "Tags": {
    "Project": "btl-run",
    "Environment": "dev",
    "ManagedBy": "SAM"
  }
}
```

### Using Parameters in SAM Deploy

```powershell
# Via samconfig.toml
sam deploy --config-env dev

# Or explicit
sam deploy --parameter-overrides "Environment=dev OpenAiApiKeySecretArn=arn:..."
```

## SAM Best Practices

### 1. Use Globals for Common Settings

```yaml
Globals:
  Function:
    Runtime: nodejs20.x
    Architectures: [arm64]
    Timeout: 30
    MemorySize: 256
    Tracing: Active
    Environment:
      Variables:
        NODE_ENV: production
```

### 2. Always Tag Resources

```yaml
Resources:
  MyResource:
    Properties:
      Tags:
        - Key: Project
          Value: btl-run
        - Key: Environment
          Value: !Ref Environment
        - Key: ManagedBy
          Value: SAM
```

### 3. Use SAM Policies

```yaml
# Instead of raw IAM
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref Table
  - S3ReadPolicy:
      BucketName: !Ref Bucket
  - Statement:
      - Effect: Allow
        Action: logs:CreateLogGroup
        Resource: '*'
```

### 4. Deletion Policies for Stateful Resources

```yaml
MyTable:
  Type: AWS::DynamoDB::Table
  DeletionPolicy: Retain          # Don't delete data
  UpdateReplacePolicy: Retain     # Don't replace on updates
```

### 5. Outputs for Cross-Stack Communication

```yaml
Outputs:
  TableName:
    Description: DynamoDB table name
    Value: !Ref MyTable
    Export:
      Name: !Sub "${AWS::StackName}-TableName"
```

## Troubleshooting

### SAM Build Fails

**Docker not running:**
```powershell
# Start Docker Desktop, then:
docker ps
```

**Rust build fails:**
```powershell
# Use Docker builds (don't require local Zig)
sam build --use-container --beta-features
```

**TypeScript build fails:**
```powershell
# Build manually first
cd AskAi_KVS/services/askai
pnpm build  # Creates dist/index.js

cd ../kvs
pnpm build
```

### Deployment Fails

**Parameter missing:**
- Check `infrastructure/parameters/{env}.json` has all required values

**Insufficient permissions:**
- Ensure AWS credentials have CloudFormation, Lambda, S3, IAM permissions

**Resource already exists:**
- Check if resource name conflicts with existing resources
- Use unique names with `${AWS::AccountId}` suffix

### Stack Update Stuck

```powershell
# Check stack events
aws cloudformation describe-stack-events `
    --stack-name "btl-run-dev" `
    --max-items 20

# If truly stuck, may need to delete and recreate
aws cloudformation delete-stack --stack-name "btl-run-dev"
```

## Existing Resources

btl.run currently has these deployed (not managed by SAM yet):
- `battle-quest-prod-askai` - AskAI Lambda
- `battle-quest-prod-kvs` - KVS Lambda
- `battle-quest-kvs-prod` - DynamoDB table
- OpenAI Secret ARN (reused in prod parameters)

New SAM deployment creates separate `btl-run-*` resources.

## Integration Notes

The SAM infrastructure integrates with:
- **Frontend** (`frontend/`) - Built with Vite, deployed to S3
- **Rust API** (`backend/`) - Built with cargo-lambda
- **TypeScript Services** (`AskAi_KVS/services/`) - Built with esbuild

All builds happen via PowerShell scripts in `scripts/` before SAM deployment.
