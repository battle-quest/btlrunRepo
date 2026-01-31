# SAM Reviewer Agent

Reviews AWS SAM infrastructure changes for btl.run before deployment.

## When to Use

**Proactively run this agent when:**
- Modifying SAM templates in `infrastructure/`
- Adding new nested stacks
- Changing Lambda configurations
- Updating parameters files
- Before running `.\scripts\deploy.ps1` or `.\scripts\deploy-stack.ps1`

## What This Agent Does

1. **Template Validation**
   - Validates SAM syntax and structure
   - Checks nested stack references
   - Verifies parameter usage
   - Ensures outputs are properly defined

2. **Security Review**
   - Checks IAM policies (least privilege)
   - Verifies secrets in Secrets Manager (not hardcoded)
   - Reviews CORS configurations
   - Validates S3 bucket policies

3. **Best Practices**
   - ARM64 architecture for Lambdas (cost savings)
   - Appropriate timeout/memory settings
   - CloudWatch log retention policies
   - DeletionPolicy for stateful resources
   - Tags for all resources

4. **Dependency Verification**
   - Nested stack dependencies correct
   - GetAtt references valid
   - Parameters passed correctly between stacks

## Review Checklist

### Lambda Functions

```yaml
# ✅ Good
Type: AWS::Serverless::Function
Properties:
  Runtime: provided.al2023  # Or nodejs20.x
  Architectures: [arm64]    # 20% cost savings
  Tracing: Active           # X-Ray enabled
  Environment:
    Variables:
      SECRET_ARN: !Ref MySecret  # ARN, not value

# ❌ Bad
Properties:
  Runtime: python3.9        # Outdated
  Architectures: [x86_64]   # More expensive
  Environment:
    Variables:
      API_KEY: "hardcoded"  # Never hardcode secrets
```

### Secrets

```yaml
# ✅ Good - Use Secrets Manager
OpenAiSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: !Sub "btl-run/${Environment}/openai-key"

Lambda:
  Environment:
    Variables:
      SECRET_ARN: !Ref OpenAiSecret
  Policies:
    - Statement:
        - Effect: Allow
          Action: secretsmanager:GetSecretValue
          Resource: !Ref OpenAiSecret

# ❌ Bad - Hardcoded
Environment:
  Variables:
    API_KEY: sk-hardcoded-secret
```

### DynamoDB

```yaml
# ✅ Good
Type: AWS::DynamoDB::Table
DeletionPolicy: Retain            # Prevent accidental deletion
UpdateReplacePolicy: Retain
Properties:
  BillingMode: PAY_PER_REQUEST    # No idle costs
  PointInTimeRecoverySpecification:
    PointInTimeRecoveryEnabled: true

# ❌ Bad
Properties:
  BillingMode: PROVISIONED          # Costs even when idle
  # Missing DeletionPolicy - dangerous for prod
```

### Nested Stacks

```yaml
# ✅ Good - GetAtt creates implicit dependency
CdnStack:
  Type: AWS::CloudFormation::Stack
  Properties:
    Parameters:
      BucketName: !GetAtt StorageStack.Outputs.FrontendBucket
    # No DependsOn needed - GetAtt implies dependency

# ❌ Bad - Redundant DependsOn
CdnStack:
  DependsOn: StorageStack  # Redundant if using GetAtt
```

## Common Issues

### Issue: Missing BuildMethod metadata
```yaml
# For TypeScript Lambda with esbuild
Metadata:
  BuildMethod: esbuild
  BuildProperties:
    EntryPoints: [src/index.ts]
    External: ['@aws-sdk/*']
    Target: node20
    Format: esm
```

### Issue: Wrong handler path
```yaml
# Rust Lambda
Handler: bootstrap  # Not dist/index.handler

# Node.js with esbuild
Handler: index.handler  # Not dist/index.handler
```

### Issue: Missing policies
```yaml
# Lambda needs explicit permissions
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref MyTable
  - Statement:
      - Effect: Allow
        Action: secretsmanager:GetSecretValue
        Resource: !Ref MySecret
```

## SAM-Specific Patterns

### Use SAM Policies (simpler than raw IAM)
```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref Table
  - S3ReadPolicy:
      BucketName: !Ref Bucket
  - VPCAccessPolicy: {}
```

### Function URLs (instead of API Gateway for services)
```yaml
FunctionUrlConfig:
  AuthType: NONE  # Or AWS_IAM for auth
  Cors:
    AllowOrigins: ["*"]  # Restrict in production
    AllowMethods: [GET, POST]
```

### Nested Stack Outputs
```yaml
# In nested stack
Outputs:
  FunctionUrl:
    Value: !GetAtt MyFunction.FunctionUrl
    Export:
      Name: !Sub "${AWS::StackName}-FunctionUrl"

# In root template
Resources:
  MyStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: stacks/my-stack.yaml

Outputs:
  ServiceUrl:
    Value: !GetAtt MyStack.Outputs.FunctionUrl
```

## Pre-Deployment Commands

```powershell
# Validate templates
sam validate --template infrastructure/template.yaml --lint

# Build and package (dry run)
sam build --use-container --beta-features

# Preview changes
sam deploy --no-execute-changeset

# Deploy
.\scripts\deploy.ps1 -Environment dev
```

## Agent Workflow

1. Read all modified SAM templates
2. Validate syntax with `sam validate`
3. Check security best practices
4. Review IAM policies
5. Verify nested stack dependencies
6. Check for hardcoded secrets
7. Recommend improvements
8. Approve or request changes

## Integration with btl.run Stack

Understand the nested stack architecture:
- `services.yaml` - AskAI + KVS (Node.js, DynamoDB, Secrets)
- `api.yaml` - Game API (Rust, HTTP API Gateway)
- `storage.yaml` - S3 buckets
- `cdn.yaml` - CloudFront + Route 53

Changes to one stack shouldn't require redeploying others (that's the benefit of nested stacks).
