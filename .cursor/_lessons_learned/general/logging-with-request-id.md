---
id: general-logging-request-id
category: general
severity: medium
keywords: [logging, requestId, correlation, debugging, cloudwatch, structured]
related_rules: [20-standards.mdc]
related_skills: [lambda-development]
created: 2026-01-24
---

# Logging with Request ID: Correlation for Debugging

## Problem

Logs are impossible to correlate across multiple entries:

```
2024-01-15T10:00:01Z INFO: Processing match
2024-01-15T10:00:01Z INFO: Processing match
2024-01-15T10:00:02Z ERROR: Match not found
2024-01-15T10:00:02Z INFO: Match processed successfully
```

Which "Processing match" corresponds to which outcome? In concurrent Lambda invocations, logs interleave and become useless.

## Root Cause

- Multiple Lambda instances run concurrently
- Logs from different requests interleave in CloudWatch
- Without request ID, can't trace a single request's flow
- Error investigation requires correlating multiple log entries

## Solution

**1. Always include requestId:**

```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  console.log(JSON.stringify({
    requestId,
    action: 'handler_start',
    path: event.path,
    method: event.httpMethod,
  }));
  
  try {
    const result = await processRequest(event, requestId);
    
    console.log(JSON.stringify({
      requestId,
      action: 'handler_success',
      duration: Date.now() - startTime,
    }));
    
    return apiResponse(200, result);
  } catch (error) {
    console.error(JSON.stringify({
      requestId,
      action: 'handler_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }));
    
    return apiResponse(500, { error: 'Internal error' });
  }
};
```

**2. Create a logger utility:**

```typescript
// services/api/src/utils/logger.ts
type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  requestId: string;
  matchId?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext;
  
  constructor(requestId: string) {
    this.context = { requestId };
  }
  
  withContext(ctx: Partial<LogContext>): Logger {
    const newLogger = new Logger(this.context.requestId);
    newLogger.context = { ...this.context, ...ctx };
    return newLogger;
  }
  
  private log(level: LogLevel, action: string, data?: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      ...this.context,
      action,
      ...data,
    };
    
    const output = JSON.stringify(entry);
    
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
  
  info(action: string, data?: Record<string, unknown>) {
    this.log('info', action, data);
  }
  
  warn(action: string, data?: Record<string, unknown>) {
    this.log('warn', action, data);
  }
  
  error(action: string, error: Error | unknown, data?: Record<string, unknown>) {
    this.log('error', action, {
      ...data,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

export function createLogger(requestId: string): Logger {
  return new Logger(requestId);
}
```

**3. Usage in handlers:**

```typescript
import { createLogger } from './utils/logger';

export const handler = async (event: APIGatewayProxyEvent) => {
  const log = createLogger(event.requestContext.requestId);
  
  log.info('request_received', { path: event.path, method: event.httpMethod });
  
  const matchId = event.pathParameters?.matchId;
  const matchLog = log.withContext({ matchId });
  
  matchLog.info('fetching_match');
  
  try {
    const match = await getMatch(matchId);
    matchLog.info('match_fetched', { status: match.status, day: match.day });
    
    const result = await processMatch(match);
    matchLog.info('match_processed', { eventsGenerated: result.events.length });
    
    return apiResponse(200, result);
  } catch (error) {
    matchLog.error('match_processing_failed', error);
    return apiResponse(500, { error: 'Internal error' });
  }
};
```

**4. Structured log output:**

```json
{"timestamp":"2024-01-15T10:00:01.123Z","level":"info","requestId":"abc-123","action":"request_received","path":"/match/xyz","method":"POST"}
{"timestamp":"2024-01-15T10:00:01.125Z","level":"info","requestId":"abc-123","matchId":"xyz","action":"fetching_match"}
{"timestamp":"2024-01-15T10:00:01.234Z","level":"info","requestId":"abc-123","matchId":"xyz","action":"match_fetched","status":"active","day":3}
{"timestamp":"2024-01-15T10:00:01.456Z","level":"info","requestId":"abc-123","matchId":"xyz","action":"match_processed","eventsGenerated":5}
```

**5. CloudWatch Logs Insights query:**

```sql
fields @timestamp, @message
| filter requestId = 'abc-123'
| sort @timestamp asc

-- Find all errors for a match
fields @timestamp, action, error
| filter level = 'error' and matchId = 'xyz'
| sort @timestamp desc
| limit 100
```

**6. Standard action names:**

Use consistent action names for searchability:

```typescript
// Request lifecycle
log.info('request_received');
log.info('request_validated');
log.info('request_completed');

// Operations
log.info('match_fetched');
log.info('match_updated');
log.info('event_generated');
log.info('ai_called');
log.info('ai_response_validated');

// Errors
log.error('validation_failed', error);
log.error('ai_validation_failed', error);
log.error('database_error', error);
```

## Prevention

- [ ] Always include requestId from event.requestContext
- [ ] Use structured JSON logging, not string concatenation
- [ ] Add context (matchId, userId) as operations proceed
- [ ] Use consistent action names for searchability
- [ ] Log at start and end of operations
- [ ] Include duration for performance analysis
- [ ] Never log sensitive data (tokens, passwords)

## References

- Related rule: `.cursor/rules/20-standards.mdc` ("Always log with requestId correlation in API")
- Related skill: `.cursor/skills/lambda-development/SKILL.md`
