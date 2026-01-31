---
id: general-async-await-pitfalls
category: general
severity: high
keywords: [async, await, promise, concurrent, parallel, sequential, error-handling]
related_rules: [20-standards.mdc]
related_skills: []
created: 2026-01-24
---

# Async/Await Pitfalls: Common Mistakes

## Problem

Agent wrote inefficient or incorrect async code:

```typescript
// Sequential when could be parallel (slow)
const user = await getUser(userId);
const match = await getMatch(matchId);
const events = await getEvents(matchId);

// Missing await (promise not resolved)
const result = someAsyncFunction();
console.log(result); // Logs Promise, not the value

// Error not caught (unhandled rejection)
async function doSomething() {
  const data = await riskyOperation(); // Throws, crashes process
}
```

## Root Cause

- Not understanding when operations are independent
- Forgetting that async functions return Promises
- Not handling errors at appropriate levels
- Mixing callback and promise patterns incorrectly

## Solution

**1. Parallel vs sequential execution:**

```typescript
// BAD: Sequential when operations are independent (3x slower)
const user = await getUser(userId);
const match = await getMatch(matchId);
const events = await getEvents(matchId);

// GOOD: Parallel when operations don't depend on each other
const [user, match, events] = await Promise.all([
  getUser(userId),
  getMatch(matchId),
  getEvents(matchId),
]);

// GOOD: Sequential when operations depend on each other
const user = await getUser(userId);
const match = await getMatch(user.currentMatchId); // Depends on user
const events = await getEvents(match.id); // Depends on match
```

**2. Promise.all with error handling:**

```typescript
// Promise.all fails fast - one rejection rejects all
try {
  const [a, b, c] = await Promise.all([taskA(), taskB(), taskC()]);
} catch (error) {
  // One of them failed, but which?
}

// Promise.allSettled - get all results even if some fail
const results = await Promise.allSettled([
  getUser(userId),
  getMatch(matchId),
  getEvents(matchId),
]);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Task ${index} succeeded:`, result.value);
  } else {
    console.error(`Task ${index} failed:`, result.reason);
  }
});
```

**3. Don't forget await:**

```typescript
// BAD: Missing await
async function handler(event: APIGatewayProxyEvent) {
  const match = getMatch(matchId); // Returns Promise, not match!
  return { statusCode: 200, body: JSON.stringify(match) }; // Returns "[object Promise]"
}

// GOOD: Await the promise
async function handler(event: APIGatewayProxyEvent) {
  const match = await getMatch(matchId);
  return { statusCode: 200, body: JSON.stringify(match) };
}

// Also BAD: Returning without await in non-async function
function getMatchSync(id: string) {
  return getMatch(id); // Caller must await this!
}
```

**4. Error handling strategies:**

```typescript
// Option A: Try-catch at handler level
async function handler(event: APIGatewayProxyEvent) {
  try {
    const match = await getMatch(matchId);
    const events = await processMatch(match);
    return apiResponse(200, { match, events });
  } catch (error) {
    console.error('Handler failed:', error);
    return apiResponse(500, { error: 'Internal error' });
  }
}

// Option B: Error handling utilities
async function safeAsync<T>(
  promise: Promise<T>,
  errorValue: T
): Promise<T> {
  try {
    return await promise;
  } catch {
    return errorValue;
  }
}

const match = await safeAsync(getMatch(matchId), null);
if (!match) {
  return apiResponse(404, { error: 'Match not found' });
}

// Option C: Result type pattern
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

async function tryGetMatch(id: string): Promise<Result<Match>> {
  try {
    const match = await getMatch(id);
    return { ok: true, value: match };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}
```

**5. Loops and async:**

```typescript
// BAD: forEach doesn't await (runs all at once, no waiting)
tributes.forEach(async (tribute) => {
  await processAction(tribute); // These all start immediately
});
console.log('Done'); // Logs before any processAction completes!

// GOOD: for...of for sequential processing
for (const tribute of tributes) {
  await processAction(tribute);
}
console.log('Done'); // All actions complete

// GOOD: Promise.all for parallel processing
await Promise.all(tributes.map((tribute) => processAction(tribute)));
console.log('Done'); // All actions complete

// GOOD: Controlled concurrency (p-limit pattern)
import pLimit from 'p-limit';
const limit = pLimit(3); // Max 3 concurrent
await Promise.all(
  tributes.map((tribute) => limit(() => processAction(tribute)))
);
```

**6. Lambda handler pattern:**

```typescript
// Lambda handlers must return, not just await
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // This works - return awaited result
  return await handleRequest(event);
  
  // This also works - return promise directly
  // return handleRequest(event);
  
  // BAD: Missing return
  // await handleRequest(event); // Returns undefined!
};
```

## Prevention

- [ ] Use Promise.all for independent parallel operations
- [ ] Always await promises before using their values
- [ ] Handle errors at the appropriate level
- [ ] Don't use forEach with async callbacks
- [ ] Return from async Lambda handlers
- [ ] Use TypeScript strict mode to catch missing awaits

## References

- MDN async/await documentation
- Related rule: `.cursor/rules/20-standards.mdc`
