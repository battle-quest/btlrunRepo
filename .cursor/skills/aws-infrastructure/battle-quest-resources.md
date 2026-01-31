# Battle Quest AWS Resources Reference

This document describes the AWS resources needed for Battle Quest.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CloudFront    │────▶│   S3 Bucket     │     │   DynamoDB      │
│   (CDN)         │     │   (Static Web)  │     │   (KV Store)    │
└────────┬────────┘     └─────────────────┘     └────────▲────────┘
         │                                               │
         │ /api/*                                        │
         ▼                                               │
┌─────────────────┐     ┌─────────────────┐             │
│   API Gateway   │────▶│   Lambda        │─────────────┘
│   (HTTP API)    │     │   (API Handler) │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   OpenAI API    │
                        │   (AskAI)       │
                        └─────────────────┘
```

## Required Resources

### 1. Static Web Hosting
- **S3 Bucket**: Store built React app (`apps/web/dist`)
- **CloudFront Distribution**: CDN with HTTPS, SPA routing

### 2. KV Service (DynamoDB)
Single table design for all game data:

| Key Pattern | Description |
|-------------|-------------|
| `pk=game#{id}` `sk=meta` | Game metadata |
| `pk=game#{id}` `sk=snapshot` | Current game state |
| `pk=game#{id}` `sk=event#{seq}` | Append-only event log |
| `pk=rate#{userId}` `sk={route}#{window}` | Rate limiting |
| `pk=idem#{id}` `sk={key}` | Idempotency records |

### 3. API Service (Lambda + API Gateway)
- HTTP API with Lambda integration
- Routes: `/api/kv/*`, `/api/askai/*`, `/api/game/*`
- CORS configured for CloudFront domain

### 4. PDF Service (Lambda)
- Separate Lambda for PDF generation
- Invoked async from API Lambda
- Stores output to S3

## Environment Variables

Lambda functions need:

```
TABLE_NAME=battlequest-kv
OPENAI_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...
ALLOWED_ORIGINS=https://d123abc.cloudfront.net
```

## Secrets Management

Store sensitive values in AWS Secrets Manager:
- OpenAI API key
- Any other API keys

Access in Lambda:
```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
const client = new SecretsManager({});
const secret = await client.getSecretValue({ SecretId: 'battlequest/openai' });
```

## Cost Optimization

- DynamoDB: On-Demand billing (scales to zero)
- Lambda: Pay per invocation
- CloudFront: Caches static assets
- S3: Minimal cost for static files

Estimated monthly cost for low traffic: $1-5/month
