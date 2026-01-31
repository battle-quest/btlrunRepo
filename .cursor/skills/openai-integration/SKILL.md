---
name: openai-integration
description: Integrate OpenAI API for narrative generation with structured outputs, JSON schemas, streaming, and cost controls. Use when implementing AskAI service, generating event narration, or working with LLM-based features.
---

# OpenAI Integration for btl.run

## ⚠️ CRITICAL MODEL REQUIREMENT

**ALWAYS use `gpt-5-nano` for ALL OpenAI requests - no exceptions.**

This is our standard model across the entire system. Never use any other model.

## Core Principle

**The AskAI service is the single backend endpoint for all LLM needs.**

Never expose OpenAI API keys to the browser. All AI calls go through your Lambda.

## OpenAI API Setup

**Use OpenAI SDK v4+ with Responses API:**

```typescript
import OpenAI from 'openai';

// Initialize once (outside handler for reuse)
const openai = new OpenAI({
  apiKey: await getSecretFromSecretsManager(),
});
```

## Structured Output Pattern

**btl.run requires JSON-validated outputs per cursor rules.**

```typescript
import { z } from 'zod';

// Define event schema
const EventOutputSchema = z.object({
  narration: z.string().min(10).max(2000),
  effects: z.array(z.object({
    tributeId: z.string(),
    type: z.enum(['hp_change', 'item_gained', 'item_lost', 'status_effect', 'death']),
    value: z.unknown(),
  })),
  casualties: z.array(z.string()),
  tags: z.array(z.enum(['comedic', 'serious', 'violent', 'romantic', 'absurd'])),
});

type EventOutput = z.infer<typeof EventOutputSchema>;
```

## OpenAI Structured Output Call

**CRITICAL: Always use `gpt-5-nano` - this is our standard model for all requests.**

```typescript
async function generateEventNarration(
  input: { theme: string; outcome: any; recentEvents: string[] }
): Promise<EventOutput> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-5-nano', // REQUIRED: Always use gpt-5-nano
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(input.theme),
      },
      {
        role: 'user',
        content: buildEventPrompt(input.outcome, input.recentEvents),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'event_output',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            narration: { type: 'string' },
            effects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tributeId: { type: 'string' },
                  type: { type: 'string', enum: ['hp_change', 'item_gained', 'item_lost', 'status_effect', 'death'] },
                  value: {},
                },
                required: ['tributeId', 'type'],
                additionalProperties: false,
              },
            },
            casualties: { type: 'array', items: { type: 'string' } },
            tags: {
              type: 'array',
              items: { type: 'string', enum: ['comedic', 'serious', 'violent', 'romantic', 'absurd'] },
            },
          },
          required: ['narration', 'effects', 'casualties', 'tags'],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.9,
    max_tokens: 800,
  });

  const rawOutput = JSON.parse(completion.choices[0].message.content || '{}');
  
  // Validate with zod (per cursor rule: validate all AI outputs)
  try {
    return EventOutputSchema.parse(rawOutput);
  } catch (validationError) {
    // Retry once with stricter prompt
    console.warn({ validationError, attemptingRetry: true });
    return await retryWithStricterPrompt(input);
  }
}
```

## Retry Logic with Stricter Prompt

**Per cursor rules: retry once if validation fails, then fall back.**

```typescript
async function retryWithStricterPrompt(input: any): Promise<EventOutput> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(input.theme) + '\n\nCRITICAL: Return ONLY valid JSON matching the exact schema. No extra fields.',
      },
      {
        role: 'user',
        content: buildEventPrompt(input.outcome, input.recentEvents),
      },
    ],
    response_format: { type: 'json_schema', json_schema: /* same as before */ },
    temperature: 0.7, // Lower temperature for stricter adherence
    max_tokens: 800,
  });

  const rawOutput = JSON.parse(completion.choices[0].message.content || '{}');
  
  try {
    return EventOutputSchema.parse(rawOutput);
  } catch (error) {
    // Fall back to deterministic template
    console.error({ error, fallingBackToTemplate: true });
    return generateFallbackEvent(input);
  }
}
```

## Fallback Templates

**When AI fails validation, use deterministic templates:**

```typescript
function generateFallbackEvent(input: any): EventOutput {
  return {
    narration: `A tense moment unfolds as ${input.outcome.primaryTribute} faces ${input.outcome.situation}.`,
    effects: input.outcome.effects || [],
    casualties: input.outcome.casualties || [],
    tags: ['serious'],
  };
}
```

## AskAI Purpose Presets

**Server-side presets prevent prompt injection and control costs:**

**CRITICAL: All presets MUST use `gpt-5-nano` - no exceptions.**

```typescript
const PURPOSE_PRESETS = {
  event_narration: {
    model: 'gpt-5-nano', // REQUIRED: Always use gpt-5-nano
    maxTokens: 800,
    temperature: 0.9,
    schema: EventOutputSchema,
  },
  finale: {
    model: 'gpt-5-nano', // REQUIRED: Always use gpt-5-nano
    maxTokens: 2000,
    temperature: 0.8,
    schema: FinaleOutputSchema,
  },
  persona_gen: {
    model: 'gpt-5-nano', // REQUIRED: Always use gpt-5-nano
    maxTokens: 300,
    temperature: 1.0,
    schema: PersonaOutputSchema,
  },
  moderation: {
    model: 'gpt-5-nano', // REQUIRED: Always use gpt-5-nano
    maxTokens: 50,
    temperature: 0.3,
    schema: ModerationOutputSchema,
  },
} as const;

function getPreset(purpose: keyof typeof PURPOSE_PRESETS) {
  const preset = PURPOSE_PRESETS[purpose];
  if (!preset) throw new Error(`Invalid purpose: ${purpose}`);
  return preset;
}
```

## System Prompt Builder

**Keep system prompts server-side to prevent injection:**

```typescript
function buildSystemPrompt(theme: { tone: string; arena: string }): string {
  const basePrompt = `You are the narrator for btl.run, a retro text-based battle royale.`;
  
  const toneInstructions = {
    classic: 'Write dramatic prose with occasional humor.',
    comedy: 'Write absurd, witty narration. Maximize comedic timing.',
    dark: 'Write tense, heavy prose with serious consequences.',
  }[theme.tone] || toneInstructions.classic;
  
  return `${basePrompt}

Arena: ${theme.arena}
Tone: ${toneInstructions}

Rules:
- Write in past tense
- Keep narration concise (1-3 paragraphs)
- Include vivid sensory details
- Match the tone setting
- Never break character
- Return ONLY valid JSON matching the schema`;
}
```

## Streaming for Terminal Experience

**For real-time log feel, stream the narration:**

```typescript
async function streamEventNarration(
  input: any,
  onChunk: (text: string) => void
): Promise<void> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-5-nano', // REQUIRED: Always use gpt-5-nano
    messages: [
      { role: 'system', content: buildSystemPrompt(input.theme) },
      { role: 'user', content: buildEventPrompt(input.outcome, input.recentEvents) },
    ],
    stream: true,
    temperature: 0.9,
    max_tokens: 800,
  });

  let fullText = '';
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullText += content;
      onChunk(content);
    }
  }
  
  return fullText;
}
```

## Cost Controls

**Critical for btl.run budget management:**

```typescript
interface MatchTokenBudget {
  matchId: string;
  tokensUsed: number;
  maxTokens: number; // e.g., 50,000 per match
}

async function checkBudget(matchId: string): Promise<boolean> {
  const budget = await getMatchBudget(matchId);
  return budget.tokensUsed < budget.maxTokens;
}

async function trackTokenUsage(matchId: string, usage: number): Promise<void> {
  await incrementKV(`budget:${matchId}`, usage);
  
  const total = await getKV(`budget:${matchId}`);
  console.log({ matchId, tokensUsed: total, action: 'token_tracking' });
}

// Before AI call
if (!await checkBudget(matchId)) {
  console.warn({ matchId, action: 'budget_exceeded' });
  return generateFallbackEvent(input);
}

// After AI call
const usage = completion.usage?.total_tokens || 0;
await trackTokenUsage(matchId, usage);
```

## Rate Limiting

**Per cursor rules: rate limit AI calls per user and match:**

```typescript
async function checkRateLimit(matchId: string, userId: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60000); // 1-minute windows
  const key = `rate:${userId}:askai:${window}`;
  
  const count = await incrementKV(key, 1, { ttl: 120 }); // 2-minute TTL
  
  const limit = 10; // 10 requests per minute
  return count <= limit;
}
```

## Content Moderation

**Filter user input before sending to OpenAI:**

```typescript
async function moderateInput(text: string): Promise<boolean> {
  const moderation = await openai.moderations.create({
    input: text,
  });
  
  const flagged = moderation.results[0].flagged;
  if (flagged) {
    console.warn({ action: 'content_flagged', categories: moderation.results[0].categories });
  }
  
  return !flagged;
}

// Before event generation
if (!await moderateInput(userAction.freeText)) {
  throw new APIError(400, 'Inappropriate content detected', 'CONTENT_VIOLATION');
}
```

## Memory Blob for Context Efficiency

**Summarize history every N turns to save tokens:**

```typescript
async function generateMemoryBlob(events: Event[]): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-5-nano', // REQUIRED: Always use gpt-5-nano
    messages: [
      {
        role: 'system',
        content: 'Summarize the following battle events into a concise memory blob (max 500 words).',
      },
      {
        role: 'user',
        content: events.map(e => e.narration).join('\n\n'),
      },
    ],
    temperature: 0.5,
    max_tokens: 600,
  });
  
  return completion.choices[0].message.content || '';
}

// Update match state every 10 events
if (match.logSeq % 10 === 0) {
  const recentEvents = await getRecentEvents(match.matchId, 10);
  match.memoryBlob = await generateMemoryBlob(recentEvents);
}
```

## Error Handling

```typescript
try {
  const result = await generateEventNarration(input);
  return result;
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error({
      action: 'openai_error',
      status: error.status,
      message: error.message,
    });
    
    // Rate limited by OpenAI
    if (error.status === 429) {
      await sleep(1000);
      return await generateEventNarration(input); // Retry once
    }
  }
  
  // Fall back to deterministic
  return generateFallbackEvent(input);
}
```

## Testing Locally

**Mock OpenAI for local development:**

```typescript
const mockOpenAI = process.env.NODE_ENV === 'development' ? {
  chat: {
    completions: {
      create: async () => ({
        choices: [{ message: { content: JSON.stringify({
          narration: 'Mock event narration for testing.',
          effects: [],
          casualties: [],
          tags: ['serious'],
        })}}],
        usage: { total_tokens: 100 },
      }),
    },
  },
} : openai;
```

## Deployment Checklist

- [ ] OpenAI API key stored in Secrets Manager
- [ ] Lambda has IAM permission to read secret
- [ ] All AI outputs validated with zod schemas
- [ ] Retry logic implemented for validation failures
- [ ] Fallback templates defined for all purposes
- [ ] Token budget tracking implemented
- [ ] Rate limiting configured
- [ ] Content moderation enabled
- [ ] System prompts keep user input constrained
- [ ] No API keys in browser code
