---
id: zod-ai-output-validation
category: zod
severity: high
keywords: [zod, ai, openai, validation, fallback, retry, json, structured]
related_rules: [40-ai.mdc]
related_skills: [zod-validation, openai-integration]
created: 2026-01-24
---

# AI Output Validation: Retry and Fallback Pattern

## Problem

AI outputs failed validation but agent didn't implement retry or fallback:

```typescript
// Missing retry logic - just crashes
const output = await callOpenAI(prompt);
const validated = EventOutputSchema.parse(output); // Throws on invalid
```

Or agent trusted AI output without any validation:

```typescript
// Dangerous: AI output used directly
const aiResponse = await callOpenAI(prompt);
return aiResponse.narration; // Could be anything!
```

## Root Cause

- AI outputs are inherently unpredictable
- Even with JSON schema instructions, AI can produce invalid structures
- Single validation without fallback leads to failures
- Per cursor rules: "AskAI prompt must request JSON output only. Validate with zod schema; if invalid, retry once with stricter prompt. If still invalid, fall back to deterministic local generator."

## Solution

**Standard pattern for AI output validation:**

```typescript
import { z } from 'zod';

// 1. Define strict schema
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

// 2. Create validated AI caller with retry and fallback
async function generateEventNarration(input: EventInput): Promise<EventOutput> {
  // First attempt
  const rawOutput = await callAskAI({
    purpose: 'event_narration',
    input,
    max_output_tokens: 800,
    json_schema: EventOutputSchema,
  });
  
  const firstResult = EventOutputSchema.safeParse(rawOutput);
  if (firstResult.success) {
    return firstResult.data;
  }
  
  // Log first failure
  console.warn({
    action: 'ai_validation_failed',
    attempt: 1,
    errors: firstResult.error.errors,
  });
  
  // Retry with stricter prompt
  const retryOutput = await callAskAI({
    purpose: 'event_narration',
    input,
    max_output_tokens: 800,
    json_schema: EventOutputSchema,
    system: `CRITICAL: You MUST return valid JSON matching this exact schema. 
Previous attempt failed validation. Common issues:
- narration must be 10-2000 characters
- effects.type must be one of: hp_change, item_gained, item_lost, status_effect, death
- tags must be from: comedic, serious, violent, romantic, absurd
Return ONLY the JSON object, no markdown or explanation.`,
  });
  
  const retryResult = EventOutputSchema.safeParse(retryOutput);
  if (retryResult.success) {
    console.info({ action: 'ai_validation_retry_success' });
    return retryResult.data;
  }
  
  // Log second failure
  console.error({
    action: 'ai_validation_failed_twice',
    errors: retryResult.error.errors,
    fallingBack: true,
  });
  
  // Fallback to deterministic generator
  return generateFallbackEvent(input);
}

// 3. Deterministic fallback (always valid)
function generateFallbackEvent(input: EventInput): EventOutput {
  const tribute = input.roster[Math.floor(Math.random() * input.roster.length)];
  
  return {
    narration: `${tribute.name} cautiously surveys the arena, alert for any signs of danger. The day passes without major incident.`,
    effects: [],
    casualties: [],
    tags: ['serious'],
  };
}
```

**For simpler validations:**

```typescript
// Moderation check with boolean fallback
async function checkModeration(text: string): Promise<boolean> {
  const ModerationSchema = z.object({
    appropriate: z.boolean(),
    reason: z.string().optional(),
  });
  
  try {
    const output = await callAskAI({
      purpose: 'moderation',
      input: { text },
    });
    
    const result = ModerationSchema.safeParse(output);
    if (result.success) {
      return result.data.appropriate;
    }
  } catch (error) {
    console.error({ action: 'moderation_failed', error });
  }
  
  // Conservative fallback: flag as inappropriate
  return false;
}
```

**Validation helper function:**

```typescript
async function validateAIOutput<T>(
  schema: z.ZodSchema<T>,
  primaryCall: () => Promise<unknown>,
  retryCall: () => Promise<unknown>,
  fallback: () => T,
): Promise<T> {
  // First attempt
  const primary = await primaryCall();
  const primaryResult = schema.safeParse(primary);
  if (primaryResult.success) {
    return primaryResult.data;
  }
  
  console.warn({ action: 'ai_validation_failed', attempt: 1 });
  
  // Retry
  const retry = await retryCall();
  const retryResult = schema.safeParse(retry);
  if (retryResult.success) {
    return retryResult.data;
  }
  
  console.error({ action: 'ai_validation_failed_twice', fallingBack: true });
  
  // Fallback
  return fallback();
}
```

## Prevention

- [ ] NEVER use AI output without validation
- [ ] ALWAYS implement retry with stricter prompt
- [ ] ALWAYS have deterministic fallback
- [ ] Use `safeParse`, not `parse`, for AI outputs
- [ ] Log validation failures for monitoring
- [ ] Fallback should produce valid output for the same schema
- [ ] Keep fallback simple and obviously correct

## References

- Related rule: `.cursor/rules/40-ai.mdc`
- Related skill: `.cursor/skills/openai-integration/SKILL.md`
- Related skill: `.cursor/skills/zod-validation/SKILL.md`
