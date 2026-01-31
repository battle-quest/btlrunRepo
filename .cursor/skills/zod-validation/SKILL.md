---
name: zod-validation
description: Validate data with zod schemas for type-safe runtime validation across API inputs, AI outputs, and state transitions. Use when parsing unknown data, validating AI responses, or implementing API request validation.
---

# Zod Schema Validation for btl.run

## Core Principle

**Per cursor rules:**
- TypeScript strict mode everywhere
- No `any`; use `unknown` + zod parse
- All AI outputs validated with zod; retry once, then fallback

## Installation

```bash
pnpm add zod
```

## Basic Pattern

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  name: z.string().min(1).max(50),
  age: z.number().int().min(0).max(120),
});

// Infer TypeScript type
type User = z.infer<typeof UserSchema>;

// Parse and validate
const data: unknown = { name: 'Alice', age: 25 };
const user: User = UserSchema.parse(data); // Throws on invalid

// Safe parse (no throw)
const result = UserSchema.safeParse(data);
if (result.success) {
  const user: User = result.data;
} else {
  console.error(result.error.errors);
}
```

## Shared Schemas Location

```
AskAi_KVS/shared/schemas/
└── index.ts  # Add game-specific schemas here

backend/shared/src/
└── lib.rs  # Rust types with serde validation
```

## Game State Schema (Example)

```typescript
// AskAi_KVS/shared/schemas/index.ts
import { z } from 'zod';

export const TributeSchema = z.object({
  id: z.string(),
  type: z.enum(['human', 'ai', 'hybrid']),
  name: z.string().min(1).max(50),
  stats: z.object({
    vitality: z.number().int().min(0).max(10),
    wits: z.number().int().min(0).max(10),
    combat: z.number().int().min(0).max(10),
    stealth: z.number().int().min(0).max(10),
    charm: z.number().int().min(0).max(10),
  }),
  hp: z.number().int().min(0),
  maxHp: z.number().int().min(1),
  alive: z.boolean(),
  inventory: z.array(z.string()).default([]),
  allianceId: z.string().nullable().default(null),
  statusEffects: z.array(z.string()).default([]),
  persona: z.object({
    archetype: z.string(),
    quirks: z.array(z.string()),
    catchphrase: z.string().optional(),
  }),
});

export const MatchStateSchema = z.object({
  matchId: z.string(),
  createdAt: z.number(),
  mode: z.enum(['quick', 'standard', 'long']),
  rules: z.object({
    crafting: z.boolean().default(false),
    sponsors: z.boolean().default(false),
    items: z.boolean().default(true),
  }),
  theme: z.object({
    tone: z.enum(['classic', 'comedy', 'dark']),
    arena: z.string(),
  }),
  status: z.enum(['lobby', 'active', 'ended']),
  day: z.number().int().min(1),
  turn: z.number().int().min(0),
  maxDays: z.number().int().min(1).max(30),
  roster: z.array(TributeSchema),
  pendingActions: z.record(z.string(), z.string()),
  logSeq: z.number().int().min(0),
  memoryBlob: z.string().default(''),
  version: z.number().int().min(0).default(0),
});

export type Tribute = z.infer<typeof TributeSchema>;
export type MatchState = z.infer<typeof MatchStateSchema>;
```

## API Request Schemas

```typescript
// AskAi_KVS/shared/schemas/index.ts

export const CreateGameRequestSchema = z.object({
  mode: z.enum(['quick', 'standard', 'long']),
  theme: z.object({
    tone: z.enum(['classic', 'comedy', 'dark']),
    arena: z.string().min(1).max(50),
  }),
  rules: z.object({
    crafting: z.boolean().default(false),
    sponsors: z.boolean().default(false),
    items: z.boolean().default(true),
  }).default({}),
  maxDays: z.number().int().min(1).max(30).default(10),
});

export const JoinMatchRequestSchema = z.object({
  matchId: z.string(),
  tributeName: z.string().min(1).max(50),
  type: z.enum(['human', 'ai']).default('human'),
});

export const SubmitActionRequestSchema = z.object({
  matchId: z.string(),
  tributeId: z.string(),
  action: z.enum(['scavenge', 'hide', 'seek_alliance', 'hunt', 'craft', 'explore', 'rest']),
  freeText: z.string().max(200).optional(),
});

export type CreateMatchRequest = z.infer<typeof CreateMatchRequestSchema>;
export type JoinMatchRequest = z.infer<typeof JoinMatchRequestSchema>;
export type SubmitActionRequest = z.infer<typeof SubmitActionRequestSchema>;
```

## AI Output Schemas

```typescript
// AskAi_KVS/shared/schemas/index.ts

export const EventOutputSchema = z.object({
  narration: z.string().min(10).max(2000),
  effects: z.array(z.object({
    tributeId: z.string(),
    type: z.enum(['hp_change', 'item_gained', 'item_lost', 'status_effect', 'death']),
    value: z.unknown(), // Can be number, string, etc.
  })),
  casualties: z.array(z.string()),
  tags: z.array(z.enum(['comedic', 'serious', 'violent', 'romantic', 'absurd'])),
});

export const PersonaOutputSchema = z.object({
  archetype: z.string().min(1).max(50),
  quirks: z.array(z.string().min(1).max(100)).min(1).max(3),
  motivation: z.string().min(1).max(200),
  fear: z.string().min(1).max(200),
  catchphrase: z.string().max(100).optional(),
});

export const ModerationOutputSchema = z.object({
  appropriate: z.boolean(),
  reason: z.string().optional(),
});

export type EventOutput = z.infer<typeof EventOutputSchema>;
export type PersonaOutput = z.infer<typeof PersonaOutputSchema>;
export type ModerationOutput = z.infer<typeof ModerationOutputSchema>;
```

## Validating AI Outputs with Retry

```typescript
async function generateEventNarration(input: any): Promise<EventOutput> {
  const rawOutput = await callOpenAI(input);
  
  // First attempt
  const result = EventOutputSchema.safeParse(rawOutput);
  if (result.success) {
    return result.data;
  }
  
  // Log validation error
  console.warn({
    action: 'ai_validation_failed',
    errors: result.error.errors,
    retrying: true,
  });
  
  // Retry with stricter prompt
  const retryOutput = await retryWithStricterPrompt(input);
  const retryResult = EventOutputSchema.safeParse(retryOutput);
  
  if (retryResult.success) {
    return retryResult.data;
  }
  
  // Fall back to deterministic template
  console.error({
    action: 'ai_validation_failed_twice',
    errors: retryResult.error.errors,
    fallingBack: true,
  });
  
  return generateFallbackEvent(input);
}
```

## API Handler Validation

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Parse body as unknown
    const body: unknown = JSON.parse(event.body || '{}');
    
    // Validate with zod
    const validated = CreateMatchRequestSchema.parse(body);
    
    // Now type-safe
    const matchId = await createMatch(validated);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ matchId }),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Validation failed',
          details: error.errors,
        }),
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
```

## Custom Refinements

```typescript
// Custom validation logic
const TributeNameSchema = z
  .string()
  .min(1)
  .max(50)
  .refine(
    (name) => !name.includes('admin'),
    { message: 'Name cannot contain "admin"' }
  )
  .refine(
    (name) => /^[a-zA-Z0-9\s]+$/.test(name),
    { message: 'Name can only contain letters, numbers, and spaces' }
  );

// Conditional validation
const MatchRulesSchema = z.object({
  crafting: z.boolean(),
  maxCraftingSlots: z.number().int().min(1).max(4).optional(),
}).refine(
  (data) => !data.crafting || data.maxCraftingSlots !== undefined,
  { message: 'maxCraftingSlots required when crafting enabled' }
);
```

## Transformations

```typescript
// Transform data during parsing
const DateSchema = z
  .string()
  .datetime()
  .transform((str) => new Date(str));

const MatchWithDateSchema = z.object({
  matchId: z.string(),
  createdAt: z.number().transform((epoch) => new Date(epoch)),
});

const parsed = MatchWithDateSchema.parse({
  matchId: 'abc',
  createdAt: 1704067200000,
});

// parsed.createdAt is now a Date object
```

## Union Types

```typescript
const TributeActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('menu'),
    action: z.enum(['scavenge', 'hide', 'rest']),
  }),
  z.object({
    type: z.literal('freetext'),
    text: z.string().max(200),
  }),
]);

type TributeAction = z.infer<typeof TributeActionSchema>;

// Usage
const action: TributeAction = { type: 'menu', action: 'scavenge' };
```

## Default Values

```typescript
const MatchConfigSchema = z.object({
  mode: z.enum(['quick', 'standard', 'long']).default('standard'),
  maxDays: z.number().default(10),
  rules: z.object({
    crafting: z.boolean().default(false),
    items: z.boolean().default(true),
  }).default({}),
});

// Applies defaults if missing
const config = MatchConfigSchema.parse({});
// { mode: 'standard', maxDays: 10, rules: { crafting: false, items: true } }
```

## Partial & Pick

```typescript
// Make all fields optional
const PartialMatchSchema = MatchStateSchema.partial();

// Pick specific fields
const MatchSummarySchema = MatchStateSchema.pick({
  matchId: true,
  status: true,
  day: true,
});

type MatchSummary = z.infer<typeof MatchSummarySchema>;
```

## Error Formatting

```typescript
try {
  TributeSchema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    const formatted = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    console.error({ validationErrors: formatted });
    // [{ field: 'name', message: 'String must contain at least 1 character(s)' }]
  }
}
```

## Testing Schemas

```typescript
describe('TributeSchema', () => {
  it('should accept valid tribute', () => {
    const valid = {
      id: 't1',
      type: 'human',
      name: 'Alice',
      stats: { vitality: 7, wits: 5, combat: 6, stealth: 4, charm: 5 },
      hp: 10,
      maxHp: 10,
      alive: true,
      inventory: [],
      allianceId: null,
      statusEffects: [],
      persona: { archetype: 'Warrior', quirks: ['Brave'] },
    };
    
    expect(() => TributeSchema.parse(valid)).not.toThrow();
  });
  
  it('should reject invalid name', () => {
    const invalid = { ...valid, name: '' };
    
    expect(() => TributeSchema.parse(invalid)).toThrow(z.ZodError);
  });
});
```

## Integration with TypeScript

```typescript
// schemas/index.ts - export all schemas
export * from './match';
export * from './api';
export * from './ai';

// backend/functions/api/src/main.rs - import schemas if using TypeScript validation
// Or use serde for Rust-side validation

async function createMatch(body: unknown): Promise<string> {
  const validated = CreateMatchRequestSchema.parse(body);
  // validated is now type-safe CreateMatchRequest
}
```

## Checklist

- [ ] All API inputs validated (Zod for TypeScript, serde for Rust)
- [ ] All AI outputs validated with retry logic
- [ ] Schemas defined in AskAi_KVS/shared/schemas/ (TypeScript)
- [ ] TypeScript types inferred from schemas
- [ ] Error messages formatted for API responses
- [ ] Default values set where appropriate
- [ ] Custom refinements for business rules
- [ ] No `any` types in codebase
- [ ] Unknown data parsed with safeParse
- [ ] Schemas tested with unit tests
