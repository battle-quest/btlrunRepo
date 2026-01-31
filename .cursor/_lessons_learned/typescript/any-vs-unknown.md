---
id: typescript-any-vs-unknown
category: typescript
severity: high
keywords: [any, unknown, type-safety, zod, parse, validation]
related_rules: [20-standards.mdc]
related_skills: [zod-validation]
created: 2026-01-24
---

# Any vs Unknown: Always Use Unknown with Zod Parse

## Problem

Agent used `any` type for external data (API responses, JSON parse results, user input) which bypasses TypeScript's type checking:

```typescript
// This compiles but crashes at runtime
const data: any = JSON.parse(event.body);
const name = data.user.name; // No compile error, but crashes if user is undefined
```

Worse, `any` propagates through the codebase, infecting other types:

```typescript
function processData(data: any) {
  return data.value; // return type is 'any', infection spreads
}
```

## Root Cause

- Habit from JavaScript or looser TypeScript configs
- Quick fix mentality: "any makes the error go away"
- Not understanding that `any` disables type checking entirely
- Cursor rule 20-standards explicitly forbids this: "No any; use unknown + zod parse"

## Solution

Always use `unknown` and validate with zod:

```typescript
import { z } from 'zod';

// Define the expected shape
const RequestBodySchema = z.object({
  user: z.object({
    name: z.string(),
  }),
});

// Parse as unknown first
const body: unknown = JSON.parse(event.body || '{}');

// Validate and get typed result
const result = RequestBodySchema.safeParse(body);
if (!result.success) {
  return { statusCode: 400, body: JSON.stringify({ error: result.error.errors }) };
}

// Now fully typed
const { user } = result.data;
console.log(user.name); // TypeScript knows this is a string
```

## Prevention

- [ ] Never type external data as `any`
- [ ] All `JSON.parse()` results should be typed as `unknown`
- [ ] All API request bodies are `unknown` until validated
- [ ] All AI outputs are `unknown` until validated with retry logic
- [ ] Use `safeParse` for graceful error handling, `parse` when you want to throw
- [ ] Run TypeScript with strict mode (already configured in this project)

## References

- Related rule: `.cursor/rules/20-standards.mdc`
- Related skill: `.cursor/skills/zod-validation/SKILL.md`
