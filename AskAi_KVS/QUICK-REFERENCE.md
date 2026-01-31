# AskAI + KVS Quick Reference

## Installation

```bash
# In your project
pnpm add zod @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-secrets-manager
```

## Environment Variables

```bash
# .env
KVS_ENDPOINT=https://your-kvs-endpoint.amazonaws.com
ASKAI_ENDPOINT=https://your-askai-endpoint.amazonaws.com
TABLE_NAME=YourAppKVS
OPENAI_API_KEY=sk-your-key
# OR OPENAI_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...
ALLOWED_ORIGINS=https://your-app.com
```

## Client Usage

### KVS Client

```typescript
import { KVSClient } from './shared/clients';

const kvs = new KVSClient({ endpoint: process.env.KVS_ENDPOINT });

// CRUD operations
await kvs.put('key', { data: 'value' });
const data = await kvs.get<{ data: string }>('key');
await kvs.patch('key', { data: 'updated' });
await kvs.delete('key');

// Check existence
const exists = await kvs.exists('key');

// Get multiple
const map = await kvs.getMany(['key1', 'key2']);
```

### AI Client

```typescript
import { AIClient } from './shared/clients';

const ai = new AIClient(process.env.ASKAI_ENDPOINT);

// Simple ask
const response = await ai.ask({
  systemPrompt: 'You are helpful.',
  input: 'What is 2+2?',
  maxTokens: 100,
});

// JSON with fallback
const result = await ai.askJsonWithFallback<{ answer: string }>(
  { systemPrompt: '...', input: '...' },
  { answer: 'fallback' }
);

// Chat
const reply = await ai.chat([
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hello!' },
]);
```

## Local Development

```bash
# Start mock servers
pnpm dev:mocks

# Or separately
PORT=9002 npx tsx mocks/kvs-server.ts   # http://localhost:9002
npx tsx mocks/askai-server.ts           # http://localhost:9001
```

## Build Lambda Functions

```bash
# Build all
pnpm build

# Build individually
cd services/kvs && pnpm build
cd services/askai && pnpm build
```

## DynamoDB Table Schema

```
Partition Key: pk (String)
Sort Key: sk (String)

Item Structure:
{
  pk: "user:123",
  sk: "v0",
  value: { /* your data */ },
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

## API Endpoints

### KVS

| Method | Path | Description |
|--------|------|-------------|
| GET | `/{key}` | Get value |
| PUT | `/{key}` | Create/replace |
| POST | `/{key}` | Create only |
| PATCH | `/{key}` | Partial update |
| DELETE | `/{key}` | Delete |

### AskAI

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/` | `{ systemPrompt, input, maxTokens?, temperature?, model? }` | `{ output, tokensUsed?, model? }` |

## Key Patterns

```
user:{id}
session:{id}
config:{namespace}
cache:{type}:{id}
```

## Error Handling

```typescript
try {
  const data = await kvs.get('key');
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  }
  // Handle other errors
}
```

## Security Notes

1. **Never expose endpoints to browsers** - Backend only
2. **Use Secrets Manager** - For OpenAI API keys
3. **Set ALLOWED_ORIGINS** - Restrict CORS in production
4. **Enable throttling** - In API Gateway
