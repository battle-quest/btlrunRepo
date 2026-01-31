# SAM Nested Stacks Best Practices

**Problem:** Managing complex CloudFormation templates becomes unwieldy; need modular deployment.

**Solution:** Use SAM nested stacks pattern for independent component deployment.

## Pattern

### Root Template Structure
```yaml
# infrastructure/template.yaml
Resources:
  ServicesStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: stacks/services.yaml
      Parameters:
        Environment: !Ref Environment
        OpenAiApiKeySecretArn: !Ref OpenAiApiKeySecretArn
      Tags:
        - Key: Project
          Value: btl-run

Outputs:
  ServiceEndpoint:
    Value: !GetAtt ServicesStack.Outputs.AskAiFunctionUrl
```

### Nested Stack Template
```yaml
# infrastructure/stacks/services.yaml
Parameters:
  Environment:
    Type: String
  OpenAiApiKeySecretArn:
    Type: String

Resources:
  AskAiFunction:
    Type: AWS::Serverless::Function
    # ...

Outputs:
  AskAiFunctionUrl:
    Value: !GetAtt AskAiFunction.FunctionUrl
    Export:
      Name: !Sub "${AWS::StackName}-AskAiUrl"
```

## Key Learnings

### 1. TemplateURL Paths

Must be relative to root template OR S3 URL:
```yaml
# ✅ Relative path (SAM packages automatically)
TemplateURL: stacks/services.yaml

# ❌ Absolute path - doesn't work
TemplateURL: /infrastructure/stacks/services.yaml
```

### 2. Implicit Dependencies

GetAtt creates implicit dependency - no need for DependsOn:
```yaml
# ✅ Good
CdnStack:
  Properties:
    Parameters:
      BucketName: !GetAtt StorageStack.Outputs.BucketName
  # GetAtt ensures StorageStack deploys first

# ❌ Redundant
CdnStack:
  DependsOn: StorageStack  # Not needed with GetAtt
```

### 3. Parameter Passing

All parameters must be explicitly passed:
```yaml
# Root template parameters
Parameters:
  Environment:
    Type: String

# Must pass to nested stack
Resources:
  MyStack:
    Properties:
      Parameters:
        Environment: !Ref Environment  # Explicitly pass down
```

### 4. Cross-Stack References

Use stack outputs, not exports:
```yaml
# ✅ Within same root stack
Value: !GetAtt NestedStack.Outputs.SomeValue

# ❌ Between independent stacks (use exports if needed)
Value: !ImportValue "other-stack-export"
```

### 5. Deployment Order

SAM automatically determines order based on GetAtt/Ref:
- StorageStack → creates S3 bucket
- ApiStack → can deploy in parallel
- ServicesStack → can deploy in parallel  
- CdnStack → depends on StorageStack and ApiStack (via GetAtt)

### 6. Independent Stack Updates

Can update individual stacks:
```powershell
# Update only services
.\scripts\deploy-stack.ps1 -Stack services -Environment dev

# Others remain unchanged
```

## Common Pitfalls

### Circular Dependencies
```yaml
# ❌ Bad - Circular reference
StackA:
  Parameters:
    ValueFromB: !GetAtt StackB.Outputs.Something

StackB:
  Parameters:
    ValueFromA: !GetAtt StackA.Outputs.Something

# ✅ Fix - Use SSM Parameter Store or redesign
```

### Missing Outputs
```yaml
# Nested stack must export values used by root
Outputs:
  BucketName:
    Value: !Ref MyBucket
    # Required if root uses !GetAtt NestedStack.Outputs.BucketName
```

### SAM Transform Scope
```yaml
# ✅ Each template needs transform
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31  # In root AND nested stacks

# ❌ Missing transform in nested stack = not recognized as SAM
```

## When to Use Nested Stacks

**Use when:**
- Components can be updated independently
- Logical separation (services vs storage vs CDN)
- Avoid 500-resource CloudFormation limit
- Team members own different stacks

**Don't use when:**
- Only 1-2 resources total
- Everything is tightly coupled
- Adds unnecessary complexity

## btl.run Stack Design

Our 4-stack design:
1. **services** - Self-contained (DynamoDB + Lambdas + secrets)
2. **api** - Self-contained (API Gateway + Rust Lambda)
3. **storage** - Foundation (S3 buckets)
4. **cdn** - Integrates all (CloudFront references storage + API)

This allows deploying API changes without touching CDN or services.
