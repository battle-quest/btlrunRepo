---
id: aws-cdk-import-order
category: aws
severity: medium
keywords: [cdk, import, construct, aws-cdk-lib, L2, L1]
related_rules: [50-infrastructure.mdc]
related_skills: [aws-infrastructure]
created: 2026-01-24
---

# CDK Import Order: Use aws-cdk-lib Submodules

## Problem

Agent imported CDK constructs incorrectly, causing build failures or runtime errors:

```typescript
// Wrong: Old CDK v1 style imports
import { Bucket } from '@aws-cdk/aws-s3';
import { Table } from '@aws-cdk/aws-dynamodb';

// Wrong: Top-level import is massive and slow
import * as cdk from 'aws-cdk-lib';
const bucket = new cdk.aws_s3.Bucket(...); // Works but verbose
```

Errors seen:
```
Cannot find module '@aws-cdk/aws-s3'
Module not found: Error: Can't resolve '@aws-cdk/aws-s3'
```

## Root Cause

- AWS CDK v2 consolidated all modules into `aws-cdk-lib`
- Old examples/docs still show v1 style imports
- LLM training data includes both v1 and v2 patterns
- Some online resources haven't been updated

## Solution

Always use the submodule pattern from `aws-cdk-lib`:

```typescript
// Correct: CDK v2 submodule imports
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const bucket = new s3.Bucket(this, 'MyBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
    });
  }
}
```

**Common imports for Battle Quest:**

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
```

## Prevention

- [ ] Always use `aws-cdk-lib/aws-*` submodule imports
- [ ] Never use `@aws-cdk/*` (that's v1)
- [ ] `Construct` comes from `constructs`, not `aws-cdk-lib`
- [ ] Run `pnpm synth` to validate CDK code compiles
- [ ] Check `infra/package.json` for installed CDK version

## References

- AWS CDK v2 migration guide
- Related rule: `.cursor/rules/50-infrastructure.mdc`
- Related skill: `.cursor/skills/aws-infrastructure/SKILL.md`
