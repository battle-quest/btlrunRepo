---
name: api-gateway-rest
description: Design and implement REST APIs with API Gateway, Lambda integration, authentication, CORS, rate limiting, and error responses. Use when creating API endpoints, implementing auth, or configuring API Gateway.
---

# API Gateway & REST API for Battle Quest

## Architecture

**API Gateway HTTP API → Lambda functions**

Endpoints:
- Public (no auth): GET match state, GET logs, resolve invite codes
- Authenticated: Create match, join, submit actions, advance turns
- Privileged: GM actions, export PDF

## CDK Setup

```typescript
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

// Create HTTP API
const httpApi = new apigateway.HttpApi(this, 'BattleQuestAPI', {
  apiName: 'battle-quest-api',
  description: 'Battle Quest game API',
  corsPreflight: {
    allowOrigins: ['https://battlequest.example.com'],
    allowMethods: [
      apigateway.CorsHttpMethod.GET,
      apigateway.CorsHttpMethod.POST,
      apigateway.CorsHttpMethod.PUT,
      apigateway.CorsHttpMethod.DELETE,
    ],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    maxAge: cdk.Duration.hours(1),
  },
});

// Lambda integration
const lambdaIntegration = new integrations.HttpLambdaIntegration(
  'OrchestratorIntegration',
  orchestratorFunction
);

// Add routes
httpApi.addRoutes({
  path: '/match',
  methods: [apigateway.HttpMethod.POST],
  integration: lambdaIntegration,
});

httpApi.addRoutes({
  path: '/match/{matchId}',
  methods: [apigateway.HttpMethod.GET],
  integration: lambdaIntegration,
});
```

## Route Design

### Public Routes (No Auth)

```typescript
// GET /match/{matchId} - Read match state
// GET /match/{matchId}/log?after={seq}&limit={n} - Read event log
// GET /invite/{code} - Resolve invite code to matchId
```

### Authenticated Routes

```typescript
// POST /match - Create new match
// POST /match/{matchId}/join - Join as tribute
// POST /match/{matchId}/start - Start match (creator only)
// POST /match/{matchId}/action - Submit tribute action
// POST /match/{matchId}/advance - Advance one turn
// POST /match/{matchId}/end - End match
```

### GM Routes (Privileged)

```typescript
// POST /match/{matchId}/gm/rules - Toggle rule settings
// POST /match/{matchId}/gm/announce - Post arena announcement
// POST /match/{matchId}/gm/inject - Inject custom event (rate-limited)
```

### Export Routes

```typescript
// POST /match/{matchId}/export/pdf - Generate PDF export
```

## Lambda Handler Pattern

**Route all requests through single handler with routing:**

```typescript
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const requestId = event.requestContext.requestId;
  const { method, path } = event.requestContext.http;
  
  console.log({ requestId, method, path });
  
  try {
    // Route to appropriate handler
    const result = await route(event);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return handleError(error, requestId);
  }
};

function route(event: APIGatewayProxyEventV2): Promise<any> {
  const { method, path } = event.requestContext.http;
  
  if (method === 'POST' && path === '/match') {
    return createMatch(event);
  } else if (method === 'GET' && path.startsWith('/match/')) {
    return getMatch(event);
  } else if (method === 'POST' && path.endsWith('/action')) {
    return submitAction(event);
  }
  
  throw new APIError(404, 'Route not found');
}
```

## Authentication

**Use JWT tokens for stateless auth:**

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!; // From Secrets Manager

interface TokenPayload {
  userId: string;
  matchId?: string;
  role: 'player' | 'gm' | 'admin';
  exp: number;
}

function verifyToken(authHeader: string | undefined): TokenPayload {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new APIError(401, 'Missing or invalid authorization header');
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    if (payload.exp < Date.now() / 1000) {
      throw new APIError(401, 'Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new APIError(401, 'Invalid token');
  }
}

// Issue token
function issueToken(userId: string, role: 'player' | 'gm' | 'admin', matchId?: string): string {
  return jwt.sign(
    {
      userId,
      matchId,
      role,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h expiry
    },
    JWT_SECRET
  );
}

// Use in handler
async function submitAction(event: APIGatewayProxyEventV2) {
  const token = verifyToken(event.headers.authorization);
  
  // Authorize action
  if (token.matchId !== event.pathParameters?.matchId) {
    throw new APIError(403, 'Not authorized for this match');
  }
  
  // Process action...
}
```

## Rate Limiting

**Implement per-user and per-route limits:**

```typescript
async function checkRateLimit(
  userId: string,
  route: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rate#${userId}#${route}#${window}`;
  
  const count = await incrementKV(key, 1, { ttl: windowSeconds + 10 });
  
  if (count > limit) {
    throw new APIError(429, 'Rate limit exceeded', 'RATE_LIMIT');
  }
}

// Apply to handlers
async function submitAction(event: APIGatewayProxyEventV2) {
  const token = verifyToken(event.headers.authorization);
  
  // 20 actions per minute
  await checkRateLimit(token.userId, 'submit_action', 20, 60);
  
  // Process action...
}

// Stricter for GM/AI calls
async function injectEvent(event: APIGatewayProxyEventV2) {
  const token = verifyToken(event.headers.authorization);
  
  if (token.role !== 'gm') {
    throw new APIError(403, 'GM role required');
  }
  
  // 5 custom events per hour
  await checkRateLimit(token.userId, 'gm_inject', 5, 3600);
  
  // Process injection...
}
```

## Request Validation

**Validate all inputs with zod:**

```typescript
import { z } from 'zod';

const CreateMatchSchema = z.object({
  mode: z.enum(['quick', 'standard', 'long']),
  theme: z.object({
    tone: z.enum(['classic', 'comedy', 'dark']),
    arena: z.string().min(1).max(50),
  }),
  rules: z.object({
    crafting: z.boolean().default(false),
    sponsors: z.boolean().default(false),
    items: z.boolean().default(true),
  }),
  maxDays: z.number().int().min(1).max(30).default(10),
});

async function createMatch(event: APIGatewayProxyEventV2) {
  const token = verifyToken(event.headers.authorization);
  
  // Parse and validate body
  const body = JSON.parse(event.body || '{}');
  const validated = CreateMatchSchema.parse(body);
  
  // Create match...
  const matchId = generateId();
  await initializeMatch(matchId, validated, token.userId);
  
  return { matchId };
}
```

## Idempotency

**Support Idempotency-Key header for safe retries:**

```typescript
async function submitAction(event: APIGatewayProxyEventV2) {
  const token = verifyToken(event.headers.authorization);
  const idempotencyKey = event.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    throw new APIError(400, 'Idempotency-Key header required');
  }
  
  const matchId = event.pathParameters!.matchId;
  
  // Check if already processed
  const cached = await getIdempotencyRecord(matchId, idempotencyKey);
  if (cached) {
    return cached.response; // Return cached result
  }
  
  // Process action
  const result = await processAction(matchId, token.userId, event.body);
  
  // Cache response
  await storeIdempotencyRecord(matchId, idempotencyKey, {
    response: result,
    processedAt: Date.now(),
  });
  
  return result;
}
```

## Error Handling

**Consistent error responses:**

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

function handleError(error: unknown, requestId: string): APIGatewayProxyResultV2 {
  console.error({ requestId, error });
  
  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        code: error.code,
        requestId,
      }),
    };
  }
  
  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation failed',
        details: error.errors,
        requestId,
      }),
    };
  }
  
  // Unknown errors
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: 'Internal server error',
      requestId,
    }),
  };
}
```

## Response Formats

**Consistent JSON responses:**

```typescript
// Success
{
  "matchId": "abc123",
  "status": "lobby",
  "createdAt": 1704067200000
}

// Error
{
  "error": "Match not found",
  "code": "MATCH_NOT_FOUND",
  "requestId": "xyz789"
}

// Paginated
{
  "items": [...],
  "nextToken": "log#000100",
  "hasMore": true
}
```

## CORS Configuration

**Handle preflight and actual requests:**

```typescript
// CDK handles OPTIONS preflight automatically with corsPreflight config

// Lambda adds CORS headers to responses
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://battlequest.example.com',
  },
  body: JSON.stringify(result),
};
```

## Testing APIs Locally

**Use AWS SAM or direct Lambda invocation:**

```typescript
// test/api.test.ts
import { handler } from '../src/index';

const mockEvent = {
  requestContext: {
    requestId: 'test-123',
    http: { method: 'POST', path: '/match' },
  },
  headers: { authorization: 'Bearer test-token' },
  body: JSON.stringify({ mode: 'quick' }),
} as any;

const result = await handler(mockEvent);
console.log(result);
```

## Deployment Checklist

- [ ] All routes defined in CDK
- [ ] Lambda permissions configured
- [ ] CORS properly configured
- [ ] Authentication implemented
- [ ] Rate limiting applied
- [ ] Input validation with zod
- [ ] Idempotency support for mutations
- [ ] Error handling consistent
- [ ] Request logging with correlation IDs
- [ ] API Gateway throttling configured
