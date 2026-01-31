---
name: lambda-development
description: Develop, test, and optimize AWS Lambda functions with TypeScript. Use when creating Lambda handlers, implementing serverless functions, optimizing cold starts, or working with AWS SDK v3.
---

# Lambda Development & Testing

## Quick Start

btl.run uses multiple Lambda functions:
- **KV Store**: DynamoDB adapter for key-value operations
- **AskAI**: OpenAI integration endpoint
- **Orchestrator**: Game rules engine
- **Auth**: Token issuance/verification
- **Scheduler**: Long Play daily resolution

## Project Structure

```
services/
├── api/          # Orchestrator & Auth handlers
├── pdf/          # PDF generator
└── (add more as needed)
```

## Lambda Handler Pattern

Use this standard handler structure:

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  try {
    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    
    // Business logic here
    const result = await processRequest(body);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error({ requestId, error });
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

## Cold Start Optimization

**Critical for btl.run's performance requirements:**

1. **Minimize dependencies**: Only import what you need
   ```typescript
   // Good - specific imports
   import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
   
   // Bad - imports everything
   import * as AWS from 'aws-sdk';
   ```

2. **Initialize clients outside handler**: Reuse across invocations
   ```typescript
   // Initialize once (cold start only)
   const dynamodb = new DynamoDBClient({
     region: process.env.AWS_REGION,
   });
   
   export const handler = async (event) => {
     // Use pre-initialized client
     const result = await dynamodb.send(new GetItemCommand({...}));
   };
   ```

3. **Use HTTP keep-alive**:
   ```typescript
   import { NodeHttpHandler } from '@smithy/node-http-handler';
   import https from 'https';
   
   const dynamodb = new DynamoDBClient({
     requestHandler: new NodeHttpHandler({
       httpsAgent: new https.Agent({ keepAlive: true }),
     }),
   });
   ```

4. **Lazy load heavy dependencies**:
   ```typescript
   // Only load PDF library when actually generating PDFs
   let pdfLib: any = null;
   
   async function generatePDF(data: any) {
     if (!pdfLib) {
       pdfLib = await import('pdfkit');
     }
     // Use pdfLib...
   }
   ```

## Environment Variables

**Required for all Lambda functions:**

```typescript
const config = {
  tableName: process.env.TABLE_NAME!,
  region: process.env.AWS_REGION || 'us-east-1',
  openAiSecretName: process.env.OPENAI_SECRET_NAME,
};

// Validate at startup
if (!config.tableName) {
  throw new Error('TABLE_NAME environment variable required');
}
```

## Error Handling

**Follow btl.run standards:**

```typescript
class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export const handler = async (event: APIGatewayProxyEvent) => {
  const requestId = event.requestContext.requestId;
  
  try {
    // Business logic
  } catch (error) {
    // Log with correlation ID
    console.error({ requestId, error });
    
    if (error instanceof APIError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({
          error: error.message,
          code: error.code,
        }),
      };
    }
    
    // Unknown errors
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

## AWS SDK v3 Patterns

**DynamoDB operations:**

```typescript
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});

// GET
async function getItem(pk: string, sk: string) {
  const result = await client.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({ pk, sk }),
  }));
  
  return result.Item ? unmarshall(result.Item) : null;
}

// PUT with condition
async function putItem(pk: string, sk: string, data: any, expectedVer?: number) {
  await client.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: marshall({ pk, sk, ...data, ver: (expectedVer || 0) + 1 }),
    ConditionExpression: expectedVer !== undefined 
      ? 'ver = :expected' 
      : 'attribute_not_exists(pk)',
    ExpressionAttributeValues: expectedVer !== undefined
      ? marshall({ ':expected': expectedVer })
      : undefined,
  }));
}
```

**Secrets Manager:**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cachedSecret: string | null = null;

async function getOpenAIKey(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  
  const client = new SecretsManagerClient({});
  const result = await client.send(new GetSecretValueCommand({
    SecretId: process.env.OPENAI_SECRET_NAME,
  }));
  
  cachedSecret = result.SecretString!;
  return cachedSecret;
}
```

## Local Testing

**Use `esbuild` for fast local testing:**

```typescript
// services/api/src/local.ts
import { handler } from './index';

const mockEvent = {
  body: JSON.stringify({ matchId: 'test123' }),
  requestContext: { requestId: 'local-test' },
  // ... other required fields
} as any;

handler(mockEvent).then(console.log).catch(console.error);
```

**Run locally:**
```bash
cd services/api
tsx src/local.ts  # or ts-node
```

## Request ID Correlation

**Always log with requestId for debugging:**

```typescript
const log = {
  info: (data: any) => console.log(JSON.stringify({ ...data, requestId })),
  error: (data: any) => console.error(JSON.stringify({ ...data, requestId })),
};

log.info({ action: 'match_created', matchId: 'abc123' });
log.error({ action: 'match_advance_failed', matchId: 'abc123', error });
```

## Memory & Timeout Configuration

**Recommended Lambda settings for btl.run:**

- **KV Store**: 256MB, 10s timeout
- **AskAI**: 512MB, 30s timeout (streaming)
- **Orchestrator**: 512MB, 30s timeout
- **PDF Generator**: 1024MB, 60s timeout (large documents)
- **Auth**: 128MB, 3s timeout

Set in CDK:
```typescript
new lambda.Function(this, 'KVFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  memorySize: 256,
  timeout: cdk.Duration.seconds(10),
  // ...
});
```

## Deployment Checklist

Before deploying:
- [ ] TypeScript compiled with no errors
- [ ] Environment variables defined in CDK
- [ ] IAM permissions granted (least privilege)
- [ ] Error handling covers all paths
- [ ] Logging includes requestId
- [ ] Cold start optimizations applied
- [ ] Dependencies minimized
- [ ] Local testing passed

## Common Issues

**Issue**: Lambda timeout during cold start
- **Fix**: Move initialization outside handler, reduce bundle size

**Issue**: DynamoDB throttling
- **Fix**: Implement exponential backoff, check for hot partitions

**Issue**: Memory errors
- **Fix**: Increase memory allocation, check for memory leaks

**Issue**: Missing environment variables
- **Fix**: Verify CDK stack exports, check Lambda configuration
