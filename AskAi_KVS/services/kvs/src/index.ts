/**
 * KVS (Key-Value Storage) Lambda
 *
 * A serverless Lambda function providing persistent key-value storage using DynamoDB.
 * Supports: GET, PUT, POST, PATCH, DELETE operations.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from 'aws-lambda';

type LambdaEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'AppKVS';
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGINS || '*').split(',')[0].trim() || '*';
const MAX_BODY_BYTES = 256 * 1024; // 256KB max
const KEY_REGEX = /^[a-zA-Z0-9:_\-.]+$/;
const DEFAULT_SORT_KEY = 'v0';

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function parseKey(event: LambdaEvent): string {
  if ('pathParameters' in event && event.pathParameters?.key) {
    return event.pathParameters.key;
  }
  if ('rawPath' in event && event.rawPath) {
    return decodeURIComponent(event.rawPath.slice(1));
  }
  if ('path' in event && event.path) {
    return event.path.slice(1);
  }
  return '';
}

function validateKey(key: string): string | null {
  if (!key) {
    return 'Key required';
  }
  if (key.length > 512) {
    return 'Key too long';
  }
  if (!KEY_REGEX.test(key)) {
    return 'Key contains invalid characters';
  }
  return null;
}

function validateBodySize(body: string | null): string | null {
  if (!body) {
    return null;
  }
  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    return 'Body too large';
  }
  return null;
}

/**
 * Lambda handler for KVS operations
 */
export async function handler(event: LambdaEvent): Promise<APIGatewayProxyResult> {
  const origin = getOrigin(event.headers);
  const headers = getHeaders(origin);
  const method = getMethod(event);

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Parse key from path
  const key = parseKey(event);
  const keyError = validateKey(key);
  if (keyError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: keyError, method }),
    };
  }

  try {
    const bodySizeError = validateBodySize(event.body || null);
    if (bodySizeError) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: bodySizeError }),
      };
    }

    switch (method) {
      case 'GET':
        return await handleGet(key, headers);

      case 'PUT':
        return await handlePut(key, event.body, headers);

      case 'POST':
        return await handlePost(key, event.body, headers);

      case 'PATCH':
        return await handlePatch(key, event.body, headers);

      case 'DELETE':
        return await handleDelete(key, headers);

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('KVS error', error);
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

async function handleGet(key: string, headers: Record<string, string>): Promise<APIGatewayProxyResult> {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: key, sk: DEFAULT_SORT_KEY },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item.value),
  };
}

async function handlePut(
  key: string,
  body: string | null,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  if (!body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Body required' }),
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: key,
      sk: DEFAULT_SORT_KEY,
      value,
      updatedAt: new Date().toISOString(),
    },
  });

  await docClient.send(command);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true }),
  };
}

async function handlePost(
  key: string,
  body: string | null,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  // POST = create only, fail if exists
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: key, sk: DEFAULT_SORT_KEY },
    })
  );

  if (existing.Item) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'Key already exists' }),
    };
  }

  return await handlePut(key, body, headers);
}

async function handlePatch(
  key: string,
  body: string | null,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  if (!body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Body required' }),
    };
  }

  let patch: unknown;
  try {
    patch = JSON.parse(body);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  // Get existing item
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: key, sk: DEFAULT_SORT_KEY },
    })
  );

  if (!existing.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  // Merge patch with existing value
  const currentValue = existing.Item.value;
  const newValue =
    typeof currentValue === 'object' &&
    currentValue !== null &&
    typeof patch === 'object' &&
    patch !== null
      ? { ...(currentValue as Record<string, unknown>), ...(patch as Record<string, unknown>) }
      : patch;

  // Update
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: key,
      sk: DEFAULT_SORT_KEY,
      value: newValue,
      updatedAt: new Date().toISOString(),
    },
  });

  await docClient.send(command);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true }),
  };
}

async function handleDelete(key: string, headers: Record<string, string>): Promise<APIGatewayProxyResult> {
  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { pk: key, sk: DEFAULT_SORT_KEY },
  });

  await docClient.send(command);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true }),
  };
}
