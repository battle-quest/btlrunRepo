/**
 * AskAI Lambda - OpenAI API Wrapper
 *
 * A serverless Lambda function that wraps the OpenAI API with:
 * - Automatic retry logic for rate limits
 * - Token parameter compatibility across model versions
 * - CORS support
 * - Secrets Manager integration for API keys
 */

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

type LambdaEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_KEY_SECRET_ARN = process.env.OPENAI_API_KEY_SECRET_ARN;
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4-turbo';
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGINS || '*').split(',')[0].trim() || '*';
const secretsClient = new SecretsManagerClient({});
let cachedOpenAiKey: string | null = null;

/**
 * Determines if a model uses max_completion_tokens vs max_tokens
 */
function usesMaxCompletionTokens(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return normalized.startsWith('gpt-5') || normalized.startsWith('o');
}

/**
 * Checks if model is in the GPT-5 family (special handling for temperature/reasoning)
 */
function isGpt5FamilyModel(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return normalized.startsWith('gpt-5') || normalized.startsWith('o');
}

/**
 * Gets the appropriate reasoning effort level for GPT-5 models
 */
function getChatReasoningEffort(model: string): 'none' | 'minimal' | 'low' | 'medium' | 'high' {
  const normalized = model.trim().toLowerCase();
  if (normalized.startsWith('gpt-5.2')) return 'none';
  return 'minimal';
}

/**
 * Retrieves OpenAI API key from environment or Secrets Manager
 */
async function getOpenAiApiKey(): Promise<string> {
  if (cachedOpenAiKey) {
    return cachedOpenAiKey;
  }

  if (OPENAI_API_KEY_SECRET_ARN) {
    const secret = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: OPENAI_API_KEY_SECRET_ARN })
    );
    const secretValue =
      secret.SecretString ||
      (secret.SecretBinary ? Buffer.from(secret.SecretBinary as Uint8Array).toString('utf8') : '');
    if (!secretValue) {
      throw new Error('OpenAI secret is empty');
    }
    cachedOpenAiKey = secretValue;
    return cachedOpenAiKey;
  }

  if (OPENAI_API_KEY) {
    cachedOpenAiKey = OPENAI_API_KEY;
    return cachedOpenAiKey;
  }

  throw new Error('OPENAI_API_KEY or OPENAI_API_KEY_SECRET_ARN is required');
}

function getMethod(event: LambdaEvent): string {
  if ('requestContext' in event && 'http' in event.requestContext) {
    return event.requestContext.http.method || 'GET';
  }
  return event.httpMethod || 'GET';
}

function getOrigin(headers?: Record<string, string | undefined>): string | undefined {
  return headers?.origin || headers?.Origin;
}

function getHeaders(origin?: string): Record<string, string> {
  const resolvedOrigin =
    ALLOWED_ORIGIN === '*'
      ? '*'
      : origin && origin === ALLOWED_ORIGIN
      ? origin
      : ALLOWED_ORIGIN;
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

interface AskAIRequest {
  systemPrompt: string;
  input: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface AskAIResponse {
  output: string;
  tokensUsed?: number;
  model?: string;
}

/**
 * Extracts text content from various OpenAI response formats
 */
function extractTextFromCompletion(completion: unknown): string {
  const comp = completion as Record<string, unknown>;
  const choices = comp?.choices as Array<Record<string, unknown>> | undefined;
  const choice0 = choices?.[0];

  // Chat Completions: message.content
  const msg = choice0?.message as Record<string, unknown> | undefined;
  const content = msg?.content;
  if (typeof content === 'string') return content;
  
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const c = content as Record<string, unknown>;
    if (typeof c.text === 'string') return c.text;
    if (typeof c.content === 'string') return c.content;
    if (typeof c.value === 'string') return c.value;
  }
  
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === 'string') return part;
        const p = part as Record<string, unknown>;
        if (typeof p?.text === 'string') return p.text;
        if (typeof p?.content === 'string') return p.content;
        if (typeof p?.value === 'string') return p.value;
        return '';
      })
      .join('');
  }

  // Legacy Completions: choices[0].text
  if (typeof choice0?.text === 'string') return choice0.text;

  // Responses API style
  if (typeof comp?.output_text === 'string') return comp.output_text as string;

  // Refusals
  const refusal = msg?.refusal;
  if (typeof refusal === 'string' && refusal.trim().length > 0) return refusal;

  return '';
}

function parseRequest(body: string | null): AskAIRequest {
  if (!body) {
    throw new Error('Request body required');
  }
  try {
    return JSON.parse(body) as AskAIRequest;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Lambda handler for AskAI requests
 */
export async function handler(event: LambdaEvent): Promise<APIGatewayProxyResult> {
  const origin = getOrigin(event.headers);
  const headers = getHeaders(origin);
  const method = getMethod(event);

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed', receivedMethod: method }),
    };
  }

  try {
    const request = parseRequest(event.body || null);

    if (!request.systemPrompt || !request.input) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'systemPrompt and input are required' }),
      };
    }

    const model = request.model || DEFAULT_MODEL;
    const maxTokens = request.maxTokens || 500;
    const temperature =
      isGpt5FamilyModel(model) ? undefined : request.temperature !== undefined ? request.temperature : 0.7;
    const reasoningEffort = isGpt5FamilyModel(model) ? getChatReasoningEffort(model) : undefined;

    console.log('AskAI request', { model, maxTokens });

    const apiKey = await getOpenAiApiKey();
    const basePayload: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system' as const, content: request.systemPrompt },
        { role: 'user' as const, content: request.input },
      ],
      ...(temperature !== undefined ? { temperature } : {}),
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    };

    const payloadWithTokens: Record<string, unknown> = {
      ...basePayload,
      ...(usesMaxCompletionTokens(model) ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    };

    const makeRequest = async (payload: Record<string, unknown>): Promise<Response> =>
      fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    let openaiResponse = await makeRequest(payloadWithTokens);

    // Retry with alternate token parameter if needed
    if (!openaiResponse.ok) {
      const firstErrorText = await openaiResponse.text();
      let didRetry = false;
      try {
        const parsed = JSON.parse(firstErrorText) as {
          error?: { param?: string; code?: string; message?: string };
        };
        const param = parsed.error?.param;
        const code = parsed.error?.code;
        const message = parsed.error?.message || '';
        const looksLikeTokenParamMismatch =
          code === 'unsupported_parameter' &&
          (param === 'max_tokens' ||
            param === 'max_completion_tokens' ||
            message.includes('max_completion_tokens') ||
            message.includes('max_tokens'));

        if (looksLikeTokenParamMismatch) {
          console.warn('OpenAI token param mismatch; retrying', { model, param, code });
          const altPayload: Record<string, unknown> = {
            ...basePayload,
            ...(param === 'max_tokens' ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
          };
          openaiResponse = await makeRequest(altPayload);
          didRetry = true;
        }
      } catch {
        // Not JSON or unexpected error shape
      }

      if (!openaiResponse.ok) {
        const finalErrorText = didRetry ? await openaiResponse.text() : firstErrorText;
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${finalErrorText}`);
      }
    }

    const completion = await openaiResponse.json();
    const output = extractTextFromCompletion(completion);
    const usage = (completion as Record<string, unknown>)?.usage as Record<string, number> | undefined;
    const tokensUsed = usage?.total_tokens || 0;

    console.log('AskAI response', { chars: output.length, tokensUsed });

    if (!output || output.trim().length === 0) {
      throw new Error('OpenAI produced empty output');
    }

    const response: AskAIResponse = {
      output,
      tokensUsed,
      model: (completion as Record<string, unknown>)?.model as string,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('AskAI error', error);

    if (error instanceof Error && error.message.includes('rate_limit')) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests to OpenAI. Please try again later.',
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
