---
name: aws-infrastructure
description: Manage AWS resources using CDK. Use when creating, modifying, deploying, or destroying AWS infrastructure like S3 buckets, DynamoDB tables, Lambda functions, API Gateway, or CloudFront distributions.
---

# AWS Infrastructure Management

Manage AWS resources for Battle Quest using AWS CDK (TypeScript).

## Quick Reference

| Action | Command | Location |
|--------|---------|----------|
| Preview changes | `pnpm diff` | `infra/` |
| Deploy | `pnpm deploy` | `infra/` |
| Validate | `pnpm synth` | `infra/` |
| Destroy | `pnpm destroy` | `infra/` |

## Adding Resources

Edit `infra/src/stacks/battle-quest-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class BattleQuestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Add resources here
  }
}
```

## Common Resource Patterns

### S3 Bucket
```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

const bucket = new s3.Bucket(this, 'AssetsBucket', {
  bucketName: `battle-quest-assets-${this.account}`,
  removalPolicy: cdk.RemovalPolicy.DESTROY, // Use RETAIN for prod
  autoDeleteObjects: true, // Only with DESTROY policy
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});
```

### DynamoDB Table
```typescript
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const table = new dynamodb.Table(this, 'GameDataTable', {
  tableName: 'battlequest-kv',
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  timeToLiveAttribute: 'ttl',
});
```

### Lambda Function
```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

const fn = new nodejs.NodejsFunction(this, 'ApiHandler', {
  entry: '../services/api/src/handler.ts',
  handler: 'handler',
  runtime: lambda.Runtime.NODEJS_20_X,
  environment: {
    TABLE_NAME: table.tableName,
  },
  timeout: cdk.Duration.seconds(30),
});

// Grant permissions
table.grantReadWriteData(fn);
```

### API Gateway (HTTP API)
```typescript
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const api = new apigatewayv2.HttpApi(this, 'GameApi', {
  apiName: 'battle-quest-api',
  corsPreflight: {
    allowOrigins: ['*'],
    allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
    allowHeaders: ['*'],
  },
});

api.addRoutes({
  path: '/api/{proxy+}',
  methods: [apigatewayv2.HttpMethod.ANY],
  integration: new integrations.HttpLambdaIntegration('ApiIntegration', fn),
});
```

### CloudFront + S3 Static Site
```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  defaultRootObject: 'index.html',
  errorResponses: [{
    httpStatus: 404,
    responseHttpStatus: 200,
    responsePagePath: '/index.html', // SPA fallback
  }],
});
```

## Stack Outputs

Export important values for reference:

```typescript
new cdk.CfnOutput(this, 'ApiUrl', {
  value: api.url ?? 'undefined',
  description: 'API Gateway URL',
});

new cdk.CfnOutput(this, 'DistributionUrl', {
  value: `https://${distribution.distributionDomainName}`,
  description: 'CloudFront URL',
});
```

## Deployment Workflow

1. **Make changes** to stack files
2. **Preview**: `pnpm diff` - Review what will change
3. **Deploy**: `pnpm deploy` - Apply changes to AWS
4. **Verify**: Check outputs and test functionality

## Best Practices

- Always run `pnpm diff` before deploying
- Use `RemovalPolicy.DESTROY` for dev, `RETAIN` for prod data
- Grant least-privilege permissions
- Use environment variables for configuration
- Add `CfnOutput` for important resource identifiers
