---
id: api-cors-configuration
category: api
severity: high
keywords: [cors, preflight, options, access-control, cross-origin, api-gateway]
related_rules: [10-architecture.mdc]
related_skills: [api-gateway-rest]
created: 2026-01-24
---

# CORS Configuration: Preflight and Response Headers

## Problem

Browser shows CORS errors despite adding CORS headers to Lambda response:

```
Access to fetch at 'https://api.example.com/match' from origin 'https://app.example.com' 
has been blocked by CORS policy: Response to preflight request doesn't pass access 
control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Or:
```
CORS policy: Request header field content-type is not allowed by Access-Control-Allow-Headers
```

## Root Cause

- CORS has two parts: preflight (OPTIONS) and actual response headers
- Browser sends OPTIONS request first for non-simple requests
- API Gateway must handle OPTIONS separately
- Lambda response headers aren't enough if OPTIONS isn't handled
- Header names are case-sensitive in some contexts

## Solution

**1. Configure CORS at API Gateway level (recommended):**

```typescript
// CDK - HTTP API (apigatewayv2)
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';

const httpApi = new apigatewayv2.HttpApi(this, 'GameApi', {
  corsPreflight: {
    allowOrigins: ['http://localhost:5173', 'https://btlrun.example.com'],
    allowMethods: [
      apigatewayv2.CorsHttpMethod.GET,
      apigatewayv2.CorsHttpMethod.POST,
      apigatewayv2.CorsHttpMethod.PUT,
      apigatewayv2.CorsHttpMethod.DELETE,
      apigatewayv2.CorsHttpMethod.OPTIONS,
    ],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Idempotency-Key',
      'X-Request-Id',
    ],
    maxAge: cdk.Duration.hours(1),
  },
});
```

**2. Also add headers in Lambda responses:**

API Gateway CORS config handles preflight, but Lambda must also return headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Credentials': 'true',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ... business logic
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,  // Include on errors too!
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
```

**3. Create a response helper:**

```typescript
// services/api/src/utils/response.ts
const getAllowedOrigin = (requestOrigin: string | undefined): string => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://btlrun.example.com',
  ];
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[0];
};

export const apiResponse = (
  statusCode: number,
  body: unknown,
  origin?: string
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Credentials': 'true',
  },
  body: JSON.stringify(body),
});

// Usage
return apiResponse(200, { matchId }, event.headers.origin);
return apiResponse(400, { error: 'Invalid request' }, event.headers.origin);
```

**4. For local development with SAM:**

```yaml
# template.yaml
Globals:
  Api:
    Cors:
      AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
      AllowHeaders: "'Content-Type,Authorization,X-Idempotency-Key'"
      AllowOrigin: "'http://localhost:5173'"
```

**5. Common gotchas:**

- `Authorization` header requires explicit allowlist (not covered by `*`)
- Custom headers like `X-Idempotency-Key` must be explicitly allowed
- Credentials mode requires specific origin, not `*`
- Preflight cache (`maxAge`) reduces OPTIONS requests

## Prevention

- [ ] Configure CORS at API Gateway level, not just Lambda
- [ ] Include CORS headers in ALL responses (success and error)
- [ ] List all custom headers explicitly in `allowHeaders`
- [ ] Test preflight with `curl -X OPTIONS` before assuming it works
- [ ] Set specific origins in production, not `*`
- [ ] Don't forget error responses need CORS headers too

## References

- MDN CORS documentation
- Related skill: `.cursor/skills/api-gateway-rest/SKILL.md`
