/**
 * Zod Schemas for AskAI and KVS
 *
 * Runtime validation schemas for API requests and responses.
 */

import { z } from 'zod';

// ============================================================================
// ASKAI SCHEMAS
// ============================================================================

/**
 * AskAI request schema
 */
export const AskAIRequestSchema = z.object({
  systemPrompt: z.string().min(1).max(10000),
  input: z.string().min(1).max(50000),
  maxTokens: z.number().min(1).max(4000).optional().default(500),
  temperature: z.number().min(0).max(1).optional().default(0.7),
  model: z.string().min(1).max(100).optional(),
});

export type AskAIRequest = z.infer<typeof AskAIRequestSchema>;

/**
 * AskAI response schema
 */
export const AskAIResponseSchema = z.object({
  output: z.string().min(1),
  tokensUsed: z.number().optional(),
  model: z.string().optional(),
});

export type AskAIResponse = z.infer<typeof AskAIResponseSchema>;

// ============================================================================
// KVS SCHEMAS
// ============================================================================

/**
 * Valid KVS key pattern
 */
export const KVSKeySchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[a-zA-Z0-9:_\-.]+$/, 'Key contains invalid characters');

export type KVSKey = z.infer<typeof KVSKeySchema>;

/**
 * KVS success response
 */
export const KVSSuccessResponseSchema = z.object({
  success: z.literal(true),
});

/**
 * KVS error response
 */
export const KVSErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

// ============================================================================
// DEV/TEST SCHEMAS
// ============================================================================

/**
 * Dev AskAI test request
 */
export const DevAskAIRequestSchema = z.object({
  question: z.string().min(1).max(500),
  systemPrompt: z.string().min(1).max(1000).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(1).max(1000).optional(),
  model: z.string().min(1).max(100).optional(),
});

export type DevAskAIRequest = z.infer<typeof DevAskAIRequestSchema>;

/**
 * Dev AskAI test response
 */
export const DevAskAIResponseSchema = z.object({
  answer: z.string().min(1).max(1000),
  rawOutput: z.string().min(1),
  attempts: z.number().min(1).max(2),
  usedFallback: z.boolean(),
});

export type DevAskAIResponse = z.infer<typeof DevAskAIResponseSchema>;

/**
 * Dev KVS test request
 */
export const DevKVSRequestSchema = z.object({
  key: z.string().min(1).max(120).regex(/^[a-zA-Z0-9:_-]+$/).optional(),
  value: z.unknown(),
  deleteAfter: z.boolean().optional().default(true),
});

export type DevKVSRequest = z.infer<typeof DevKVSRequestSchema>;

/**
 * Dev KVS test response
 */
export const DevKVSResponseSchema = z.object({
  key: z.string(),
  stored: z.unknown(),
  retrieved: z.unknown().nullable(),
  deleted: z.boolean(),
});

export type DevKVSResponse = z.infer<typeof DevKVSResponseSchema>;

// ============================================================================
// AI OUTPUT SCHEMAS (for JSON response validation)
// ============================================================================

/**
 * Simple answer output from AI
 */
export const AIAnswerOutputSchema = z.object({
  answer: z.string().min(1).max(2000),
});

export type AIAnswerOutput = z.infer<typeof AIAnswerOutputSchema>;

/**
 * Narration output from AI
 */
export const AINarrationOutputSchema = z.object({
  narration: z.string().min(1).max(500),
});

export type AINarrationOutput = z.infer<typeof AINarrationOutputSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate unknown data with fallback on failure
 */
export function validateWithFallback<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T
): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.error('Validation failed:', result.error);
  return fallback;
}

/**
 * Parse and throw on failure
 */
export function parseStrict<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe parse that returns null on failure
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
