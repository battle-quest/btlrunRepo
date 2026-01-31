---
id: api-validation-order
category: api
severity: medium
keywords: [validation, auth, zod, order, request, security]
related_rules: [30-security.mdc, 20-standards.mdc]
related_skills: [api-gateway-rest, zod-validation]
created: 2026-01-24
---

# API Validation Order: Auth Before Business Logic

## Problem

Agent implemented validation in wrong order, causing security issues or confusing errors:

```typescript
// Wrong: Validate body before checking auth
export const handler = async (event: APIGatewayProxyEvent) => {
  const body = CreateMatchRequestSchema.parse(JSON.parse(event.body || '{}'));
  
  // Now check auth - but we already processed untrusted input!
  const token = event.headers.authorization;
  if (!validateToken(token)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  
  // Continue with business logic...
};
```

Issues:
- Parsing untrusted input before auth check
- Error messages leak validation details to unauthenticated users
- Wasted compute on invalid requests

## Root Cause

- Natural tendency to validate "input first"
- Not thinking about security as first gate
- Treating validation as one step instead of multiple phases

## Solution

**Correct order for request processing:**

```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  // 1. CORS headers (always, even for errors)
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  };
  
  // 2. Auth check FIRST (for protected endpoints)
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  
  const authResult = validateToken(token);
  if (!authResult.valid) {
    console.log({ requestId, action: 'auth_failed', reason: authResult.reason });
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  
  // 3. Basic request structure validation
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  
  // 4. Schema validation (now we know request is authenticated)
  const parseResult = CreateMatchRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    console.log({ requestId, action: 'validation_failed', errors: parseResult.error.errors });
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Validation failed',
        details: parseResult.error.errors,
      }),
    };
  }
  
  // 5. Rate limiting (after auth, before expensive operations)
  const rateLimitOk = await checkRateLimit(authResult.userId, 'createMatch');
  if (!rateLimitOk) {
    return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: 'Rate limited' }) };
  }
  
  // 6. Business logic (finally!)
  try {
    const matchId = await createMatch(parseResult.data, authResult.userId);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ matchId }),
    };
  } catch (error) {
    console.error({ requestId, action: 'create_match_failed', error });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
```

**Create middleware pattern for consistency:**

```typescript
type HandlerContext = {
  requestId: string;
  userId: string;
  body: unknown;
};

type ProtectedHandler<T> = (ctx: HandlerContext, validated: T) => Promise<APIGatewayProxyResult>;

function withAuth<T extends z.ZodSchema>(
  schema: T,
  handler: ProtectedHandler<z.infer<T>>
) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestId = event.requestContext.requestId;
    
    // Auth
    const token = event.headers.authorization?.replace('Bearer ', '');
    const authResult = token ? validateToken(token) : { valid: false };
    if (!authResult.valid) {
      return apiResponse(401, { error: 'Unauthorized' });
    }
    
    // Parse JSON
    let rawBody: unknown;
    try {
      rawBody = JSON.parse(event.body || '{}');
    } catch {
      return apiResponse(400, { error: 'Invalid JSON' });
    }
    
    // Validate
    const parseResult = schema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiResponse(400, { error: 'Validation failed', details: parseResult.error.errors });
    }
    
    // Call actual handler
    return handler(
      { requestId, userId: authResult.userId, body: rawBody },
      parseResult.data
    );
  };
}

// Usage
export const createMatchHandler = withAuth(CreateMatchRequestSchema, async (ctx, data) => {
  const matchId = await createMatch(data, ctx.userId);
  return apiResponse(200, { matchId });
});
```

## Prevention

- [ ] Always check auth before parsing request body (for protected endpoints)
- [ ] Don't leak validation details to unauthenticated users
- [ ] Rate limit after auth but before expensive operations
- [ ] Use consistent middleware pattern across all handlers
- [ ] Log with requestId at each validation step

## References

- Related rule: `.cursor/rules/30-security.mdc`
- Related skill: `.cursor/skills/api-gateway-rest/SKILL.md`
