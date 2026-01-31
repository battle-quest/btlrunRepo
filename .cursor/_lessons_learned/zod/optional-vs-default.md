---
id: zod-optional-vs-default
category: zod
severity: medium
keywords: [zod, optional, default, undefined, nullable, schema]
related_rules: [20-standards.mdc]
related_skills: [zod-validation]
created: 2026-01-24
---

# Zod Optional vs Default: Understanding the Difference

## Problem

Agent confused `.optional()` with `.default()`, leading to unexpected `undefined` values:

```typescript
// Schema allows undefined, doesn't provide default
const ConfigSchema = z.object({
  maxDays: z.number().optional(),
});

const config = ConfigSchema.parse({});
console.log(config.maxDays); // undefined - no default!
console.log(config.maxDays + 1); // NaN!
```

Or tried to use default on a required field:

```typescript
// Wrong: default without optional means the field must be provided
const Schema = z.object({
  value: z.number().default(10), // Still required in input!
});

Schema.parse({}); // Throws: "value is required"
```

## Root Cause

- `.optional()` makes field not required but doesn't set a value
- `.default()` provides a value but field is still required in input
- Need both for "optional with default"
- TypeScript inferred types differ between approaches

## Solution

**Understanding each modifier:**

```typescript
import { z } from 'zod';

// 1. .optional() - field can be omitted, but no default value
const OptionalSchema = z.object({
  value: z.number().optional(),
});
type Optional = z.infer<typeof OptionalSchema>;
// Type: { value?: number | undefined }
OptionalSchema.parse({}).value; // undefined
OptionalSchema.parse({ value: 5 }).value; // 5

// 2. .default() - provides default, but field still expected in input (pre-transform)
// NOTE: In zod, .default() actually DOES make the field optional in input!
const DefaultSchema = z.object({
  value: z.number().default(10),
});
type Default = z.infer<typeof DefaultSchema>;
// Type: { value: number } - guaranteed to have value
DefaultSchema.parse({}).value; // 10 (default applied)
DefaultSchema.parse({ value: 5 }).value; // 5

// 3. .nullable() - allows null but not undefined
const NullableSchema = z.object({
  value: z.number().nullable(),
});
type Nullable = z.infer<typeof NullableSchema>;
// Type: { value: number | null }
NullableSchema.parse({ value: null }).value; // null
NullableSchema.parse({}).value; // Throws! Field required

// 4. .nullish() - allows null or undefined
const NullishSchema = z.object({
  value: z.number().nullish(),
});
type Nullish = z.infer<typeof NullishSchema>;
// Type: { value?: number | null | undefined }
```

**For Battle Quest use cases:**

```typescript
// Match rules with sensible defaults
const MatchRulesSchema = z.object({
  crafting: z.boolean().default(false),
  sponsors: z.boolean().default(false),
  items: z.boolean().default(true),
  maxDays: z.number().int().min(1).max(30).default(10),
});

// Parse with defaults applied
const rules = MatchRulesSchema.parse({});
// { crafting: false, sponsors: false, items: true, maxDays: 10 }

// Tribute alliance - can be null (no alliance)
const TributeSchema = z.object({
  id: z.string(),
  name: z.string(),
  allianceId: z.string().nullable().default(null),
});

// API input where field is truly optional
const UpdateMatchSchema = z.object({
  matchId: z.string(),
  // Only update what's provided
  theme: z.object({
    tone: z.enum(['classic', 'comedy', 'dark']),
  }).optional(),
  rules: MatchRulesSchema.partial().optional(),
});
```

**Type inference comparison:**

```typescript
// Input type vs output type
const Schema = z.object({
  required: z.string(),
  withDefault: z.number().default(10),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
});

// Input type (before parsing)
type Input = z.input<typeof Schema>;
// {
//   required: string;
//   withDefault?: number | undefined; // Optional in input
//   optional?: string | undefined;
//   nullable: string | null;
// }

// Output type (after parsing)
type Output = z.infer<typeof Schema>;
// {
//   required: string;
//   withDefault: number;              // Guaranteed
//   optional?: string | undefined;
//   nullable: string | null;
// }
```

## Prevention

- [ ] Use `.default()` when you want a guaranteed value after parsing
- [ ] Use `.optional()` when the field can truly be absent with no default
- [ ] Use `.nullable()` for database fields that can be NULL
- [ ] Check both `z.input<>` and `z.infer<>` types when confused
- [ ] Remember: `.default()` makes input optional AND guarantees output value
- [ ] For "optional but no default", use `.optional()` alone

## References

- Zod documentation on optional/default
- Related skill: `.cursor/skills/zod-validation/SKILL.md`
