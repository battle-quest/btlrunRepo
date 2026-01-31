/**
 * API Handler Integration Example
 *
 * Shows how to integrate the KVS and AI clients into your API handlers.
 * This example uses the pattern from Battle Quest's API structure.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { KVSClient, AIClient } from '../shared/clients';
import { DevAskAIRequestSchema, DevKVSRequestSchema } from '../shared/schemas';
import { createLogger, generateId } from '../shared/utils';

// Initialize clients from environment
const kvsClient = new KVSClient({
  endpoint: process.env.KVS_ENDPOINT || 'http://localhost:9002',
  timeout: 8000,
});

const aiClient = new AIClient(
  process.env.ASKAI_ENDPOINT || 'http://localhost:9001',
  15000
);

// ============================================================================
// HTTP HELPERS
// ============================================================================

function getRequestOrigin(
  headers?: Record<string, string | undefined> | null
): string | undefined {
  return headers?.origin || headers?.Origin;
}

function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map((o) => o.trim());
  const resolvedOrigin =
    allowedOrigins.includes('*')
      ? '*'
      : origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(
  statusCode: number,
  payload: unknown,
  origin?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
    body: JSON.stringify(payload),
  };
}

function parseJsonBody(body: string | null): unknown {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

// ============================================================================
// DEV ASKAI TEST HANDLER
// ============================================================================

/**
 * POST /dev/askai - Test the AskAI service
 *
 * Example handler that demonstrates the retry-once pattern for AI responses.
 */
export async function devAskAIHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = getRequestOrigin(event.headers);
  const logger = createLogger(event.requestContext.requestId);

  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return jsonResponse(404, { error: 'Not found' }, origin);
  }

  try {
    const body = parseJsonBody(event.body || null);
    const request = DevAskAIRequestSchema.parse(body);

    logger.info('AskAI test request', { questionLength: request.question.length });

    const systemPrompt = request.systemPrompt || 'You are a helpful assistant.';
    const input = `Question: ${request.question}\n\nAnswer:`;

    // First attempt
    const firstOutput = await aiClient.ask({
      systemPrompt: `${systemPrompt}\nOutput JSON only with structure: { "answer": "text" }`,
      input,
      maxTokens: request.maxTokens ?? 200,
      temperature: request.temperature ?? 0.7,
      model: request.model,
    });

    try {
      const parsed = JSON.parse(firstOutput);
      if (parsed.answer) {
        return jsonResponse(
          200,
          {
            answer: parsed.answer,
            rawOutput: firstOutput,
            attempts: 1,
            usedFallback: false,
          },
          origin
        );
      }
    } catch {
      // JSON parse failed, retry
    }

    // Retry with stricter prompt
    logger.warn('AskAI JSON validation failed, retrying');

    const retryOutput = await aiClient.ask({
      systemPrompt: `${systemPrompt}\nIMPORTANT: Output ONLY valid JSON: { "answer": "text" }. No extra text.`,
      input,
      maxTokens: request.maxTokens ?? 200,
      temperature: 0.4, // Lower temperature for reliability
      model: request.model,
    });

    try {
      const parsed = JSON.parse(retryOutput);
      if (parsed.answer) {
        return jsonResponse(
          200,
          {
            answer: parsed.answer,
            rawOutput: retryOutput,
            attempts: 2,
            usedFallback: false,
          },
          origin
        );
      }
    } catch {
      // Still failed
    }

    // Fallback
    logger.error('AskAI failed after retry, using fallback');
    return jsonResponse(
      200,
      {
        answer: 'AI response failed validation. Please retry.',
        rawOutput: retryOutput,
        attempts: 2,
        usedFallback: true,
      },
      origin
    );
  } catch (error) {
    logger.error('AskAI test failed', error);
    return jsonResponse(
      500,
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      origin
    );
  }
}

// ============================================================================
// DEV KVS TEST HANDLER
// ============================================================================

/**
 * POST /dev/kvs - Test the KVS service
 *
 * Example handler that demonstrates a round-trip test (put, get, delete).
 */
export async function devKVSHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = getRequestOrigin(event.headers);
  const logger = createLogger(event.requestContext.requestId);

  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return jsonResponse(404, { error: 'Not found' }, origin);
  }

  try {
    const body = parseJsonBody(event.body || null);
    const request = DevKVSRequestSchema.parse(body);

    // Generate key if not provided
    const key = request.key || `devtools:${generateId('kvs')}`;
    const deleteAfter = request.deleteAfter ?? true;

    const stored = {
      value: request.value,
      savedAt: new Date().toISOString(),
      requestId: event.requestContext.requestId,
    };

    logger.info('KVS test write', { key, deleteAfter });

    // Write
    await kvsClient.put(key, stored);

    // Read
    const retrieved = await kvsClient.get(key);

    // Delete if requested
    if (deleteAfter) {
      await kvsClient.delete(key);
    }

    return jsonResponse(
      200,
      {
        key,
        stored,
        retrieved,
        deleted: deleteAfter,
      },
      origin
    );
  } catch (error) {
    logger.error('KVS test failed', error);
    return jsonResponse(
      500,
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      origin
    );
  }
}

// ============================================================================
// EXAMPLE: USER CRUD HANDLERS
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /users/:id
 */
export async function getUserHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = getRequestOrigin(event.headers);
  const userId = event.pathParameters?.id;

  if (!userId) {
    return jsonResponse(400, { error: 'User ID required' }, origin);
  }

  const user = await kvsClient.get<User>(`user:${userId}`);

  if (!user) {
    return jsonResponse(404, { error: 'User not found' }, origin);
  }

  return jsonResponse(200, { user }, origin);
}

/**
 * POST /users
 */
export async function createUserHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = getRequestOrigin(event.headers);

  try {
    const body = parseJsonBody(event.body || null) as { name: string; email: string };

    if (!body.name || !body.email) {
      return jsonResponse(400, { error: 'Name and email required' }, origin);
    }

    const userId = generateId('user');
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      name: body.name,
      email: body.email,
      createdAt: now,
      updatedAt: now,
    };

    await kvsClient.put(`user:${userId}`, user);

    return jsonResponse(201, { user }, origin);
  } catch (error) {
    return jsonResponse(
      500,
      { error: 'Failed to create user', message: (error as Error).message },
      origin
    );
  }
}

/**
 * PUT /users/:id
 */
export async function updateUserHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = getRequestOrigin(event.headers);
  const userId = event.pathParameters?.id;

  if (!userId) {
    return jsonResponse(400, { error: 'User ID required' }, origin);
  }

  const existing = await kvsClient.get<User>(`user:${userId}`);

  if (!existing) {
    return jsonResponse(404, { error: 'User not found' }, origin);
  }

  const body = parseJsonBody(event.body || null) as Partial<User>;

  const updatedUser: User = {
    ...existing,
    ...body,
    id: userId, // Prevent ID change
    updatedAt: new Date().toISOString(),
  };

  await kvsClient.put(`user:${userId}`, updatedUser);

  return jsonResponse(200, { user: updatedUser }, origin);
}

/**
 * DELETE /users/:id
 */
export async function deleteUserHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = getRequestOrigin(event.headers);
  const userId = event.pathParameters?.id;

  if (!userId) {
    return jsonResponse(400, { error: 'User ID required' }, origin);
  }

  await kvsClient.delete(`user:${userId}`);

  return jsonResponse(200, { success: true }, origin);
}
