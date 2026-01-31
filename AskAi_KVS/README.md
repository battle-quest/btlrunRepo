# AskAI + KVS Export Package

A self-contained package for integrating the AskAI (OpenAI wrapper) and KVS (Key-Value Storage) Lambda services into any project.

## Overview

This export contains everything needed to deploy and use two core serverless services:

- **AskAI** - A Lambda-based OpenAI API wrapper with retry logic, rate limiting, and structured response handling
- **KVS** - A Lambda-based key-value storage service using DynamoDB

## Package Contents

```
export/
├── services/
│   ├── askai/           # AskAI Lambda function
│   └── kvs/             # KVS Lambda function
├── shared/
│   ├── clients/         # Client SDKs for calling the services
│   ├── schemas/         # Zod validation schemas
│   └── utils/           # Utility functions (logging, tokens, etc.)
├── mocks/               # Local development mock servers
├── swagger/             # OpenAPI documentation
├── examples/            # Usage examples
├── .env.example         # Environment variable template
└── README.md            # This file
```

## Quick Start

### 1. Install Dependencies

```bash
# Install in your project
pnpm add zod @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-secrets-manager
```

### 2. Set Environment Variables

Copy `.env.example` to your project's `.env`:

```bash
# Required for KVS
TABLE_NAME=YourDynamoDBTable

# Required for AskAI
OPENAI_API_KEY=sk-your-key
# OR use Secrets Manager
OPENAI_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...

# For clients
KVS_ENDPOINT=https://your-kvs-lambda-url.amazonaws.com
ASKAI_ENDPOINT=https://your-askai-lambda-url.amazonaws.com
```

### 3. Deploy Lambda Functions

Deploy using AWS CDK, SAM, or Serverless Framework. Example CDK:

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// KVS Lambda
const kvsFunction = new lambda.Function(this, 'KVS', {
  runtime: lambda.Runtime.NODEJS20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('path/to/export/services/kvs/dist'),
  environment: {
    TABLE_NAME: table.tableName,
  },
});
table.grantReadWriteData(kvsFunction);

// AskAI Lambda
const askaiFunction = new lambda.Function(this, 'AskAI', {
  runtime: lambda.Runtime.NODEJS20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('path/to/export/services/askai/dist'),
  environment: {
    OPENAI_API_KEY_SECRET_ARN: openaiSecret.secretArn,
  },
});
openaiSecret.grantRead(askaiFunction);
```

### 4. Use the Clients

```typescript
import { KVSClient } from './shared/clients/kvs-client';
import { AIClient } from './shared/clients/ai-client';

// Initialize clients
const kvs = new KVSClient({ endpoint: process.env.KVS_ENDPOINT });
const ai = new AIClient(process.env.ASKAI_ENDPOINT);

// KVS operations
await kvs.put('user:123', { name: 'John', score: 100 });
const user = await kvs.get<{ name: string; score: number }>('user:123');

// AI operations
const response = await ai.ask({
  systemPrompt: 'You are a helpful assistant.',
  input: 'What is the capital of France?',
  maxTokens: 100,
});
```

## API Reference

### KVS Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/{key}` | Get value by key |
| PUT | `/{key}` | Create or replace value |
| POST | `/{key}` | Create only (fail if exists) |
| PATCH | `/{key}` | Partial update (merge) |
| DELETE | `/{key}` | Delete key |

### AskAI Endpoint

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Send prompt to OpenAI |

**Request Body:**
```json
{
  "systemPrompt": "You are a helpful assistant.",
  "input": "User's question",
  "maxTokens": 500,
  "temperature": 0.7,
  "model": "gpt-5-nano"
}
```

**Response:**
```json
{
  "output": "AI response text",
  "tokensUsed": 150,
  "model": "gpt-5-nano"
}
```

## Local Development

### Using Mock Servers

Start the mock servers for local testing without AWS:

```bash
# Terminal 1: KVS Mock (in-memory storage)
PORT=9002 npx tsx mocks/kvs-server.ts
# Runs at http://localhost:9002

# Terminal 2: AskAI Mock (simulated responses)
npx tsx mocks/askai-server.ts
# Runs at http://localhost:9001
```

### Environment for Local Dev

```bash
KVS_ENDPOINT=http://localhost:9002
ASKAI_ENDPOINT=http://localhost:9001
```

## DynamoDB Table Schema

The KVS service expects a DynamoDB table with this structure:

| Attribute | Type | Description |
|-----------|------|-------------|
| `pk` | String | Partition key (the key) |
| `sk` | String | Sort key (default: "v0") |
| `value` | Any | The stored value |
| `updatedAt` | String | ISO timestamp |

**CDK Example:**
```typescript
const table = new dynamodb.Table(this, 'KVSTable', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});
```

## Security Considerations

1. **Never expose endpoints to browsers** - These services should only be called from your backend
2. **Use Secrets Manager for API keys** - Never hardcode OpenAI keys
3. **Enable API Gateway throttling** - Prevent abuse
4. **Set ALLOWED_ORIGINS** - Restrict CORS origins in production

## Customization

### Changing the Default AI Model

Edit `services/askai/src/index.ts`:

```typescript
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4-turbo';
```

### Adding TTL to KVS Items

Modify the KVS handler to include a TTL field for auto-expiration.

### Adding Authentication

Wrap the Lambda handlers with your auth middleware or use API Gateway authorizers.

## License

MIT License - Use freely in your projects.
