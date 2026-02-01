/**
 * Push Notifications API Handler
 * 
 * Manages web push subscriptions and sends notifications via SNS.
 * 
 * Endpoints:
 * - POST /subscribe - Register a push subscription
 * - DELETE /subscribe - Unsubscribe from push notifications
 * - GET /vapid-public-key - Get VAPID public key for subscription
 * - POST /notify - Send a notification to specific users (internal)
 * - POST /broadcast - Send a notification to all users (internal)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME!;
const VAPID_KEYS_SECRET_ARN = process.env.VAPID_KEYS_SECRET_ARN!;
const GAME_NOTIFICATIONS_TOPIC_ARN = process.env.GAME_NOTIFICATIONS_TOPIC_ARN!;
const ANNOUNCEMENTS_TOPIC_ARN = process.env.ANNOUNCEMENTS_TOPIC_ARN!;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

// AWS clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const secretsClient = new SecretsManagerClient({});
const snsClient = new SNSClient({});

// Cache VAPID keys
let vapidKeysCache: { publicKey: string; privateKey: string; subject: string } | null = null;

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscribeRequest {
  userId: string;
  subscription: PushSubscription;
  deviceId?: string;
}

interface NotifyRequest {
  userIds: string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

interface BroadcastRequest {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

// CORS headers helper
function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS === '*' ? '*' : 
    (origin && ALLOWED_ORIGINS.split(',').includes(origin) ? origin : ALLOWED_ORIGINS.split(',')[0]);
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };
}

// Response helpers
function jsonResponse(statusCode: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

function errorResponse(statusCode: number, message: string, origin?: string): APIGatewayProxyResultV2 {
  return jsonResponse(statusCode, { error: message }, origin);
}

// Get VAPID keys from Secrets Manager
async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string; subject: string }> {
  if (vapidKeysCache) {
    return vapidKeysCache;
  }

  const response = await secretsClient.send(new GetSecretValueCommand({
    SecretId: VAPID_KEYS_SECRET_ARN,
  }));

  if (!response.SecretString) {
    throw new Error('VAPID keys secret is empty');
  }

  vapidKeysCache = JSON.parse(response.SecretString);
  return vapidKeysCache!;
}

// Store subscription in DynamoDB
async function storeSubscription(userId: string, subscription: PushSubscription, deviceId?: string): Promise<void> {
  const subscriptionId = Buffer.from(subscription.endpoint).toString('base64url').slice(0, 100);
  
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `PUSH#${userId}`,
      sk: `SUB#${subscriptionId}`,
      userId,
      deviceId: deviceId || 'default',
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year TTL
    },
  }));
}

// Remove subscription from DynamoDB
async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  const subscriptionId = Buffer.from(endpoint).toString('base64url').slice(0, 100);
  
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: `PUSH#${userId}`,
      sk: `SUB#${subscriptionId}`,
    },
  }));
}

// Get all subscriptions for a user
async function getUserSubscriptions(userId: string): Promise<Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>> {
  const response = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': `PUSH#${userId}`,
      ':sk': 'SUB#',
    },
  }));

  return (response.Items || []).map(item => ({
    endpoint: item.endpoint,
    keys: item.keys,
  }));
}

// Publish to SNS topic
async function publishToTopic(topicArn: string, message: Record<string, unknown>): Promise<void> {
  await snsClient.send(new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    MessageAttributes: {
      type: {
        DataType: 'String',
        StringValue: 'push-notification',
      },
    },
  }));
}

// Route handlers
async function handleGetVapidPublicKey(origin?: string): Promise<APIGatewayProxyResultV2> {
  try {
    const vapidKeys = await getVapidKeys();
    return jsonResponse(200, { publicKey: vapidKeys.publicKey }, origin);
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    return errorResponse(500, 'Failed to get VAPID public key', origin);
  }
}

async function handleSubscribe(body: string | undefined, origin?: string): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return errorResponse(400, 'Request body is required', origin);
  }

  let request: SubscribeRequest;
  try {
    request = JSON.parse(body);
  } catch {
    return errorResponse(400, 'Invalid JSON body', origin);
  }

  if (!request.userId || !request.subscription?.endpoint || !request.subscription?.keys) {
    return errorResponse(400, 'userId and subscription with endpoint and keys are required', origin);
  }

  try {
    await storeSubscription(request.userId, request.subscription, request.deviceId);
    return jsonResponse(200, { success: true, message: 'Subscription registered' }, origin);
  } catch (error) {
    console.error('Failed to store subscription:', error);
    return errorResponse(500, 'Failed to store subscription', origin);
  }
}

async function handleUnsubscribe(body: string | undefined, origin?: string): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return errorResponse(400, 'Request body is required', origin);
  }

  let request: { userId: string; endpoint: string };
  try {
    request = JSON.parse(body);
  } catch {
    return errorResponse(400, 'Invalid JSON body', origin);
  }

  if (!request.userId || !request.endpoint) {
    return errorResponse(400, 'userId and endpoint are required', origin);
  }

  try {
    await removeSubscription(request.userId, request.endpoint);
    return jsonResponse(200, { success: true, message: 'Subscription removed' }, origin);
  } catch (error) {
    console.error('Failed to remove subscription:', error);
    return errorResponse(500, 'Failed to remove subscription', origin);
  }
}

async function handleNotify(body: string | undefined, origin?: string): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return errorResponse(400, 'Request body is required', origin);
  }

  let request: NotifyRequest;
  try {
    request = JSON.parse(body);
  } catch {
    return errorResponse(400, 'Invalid JSON body', origin);
  }

  if (!request.userIds || !request.title || !request.body) {
    return errorResponse(400, 'userIds, title, and body are required', origin);
  }

  try {
    await publishToTopic(GAME_NOTIFICATIONS_TOPIC_ARN, {
      type: 'targeted',
      userIds: request.userIds,
      notification: {
        title: request.title,
        body: request.body,
        icon: request.icon,
        badge: request.badge,
        data: request.data,
        tag: request.tag,
      },
    });
    return jsonResponse(200, { success: true, message: 'Notification queued' }, origin);
  } catch (error) {
    console.error('Failed to publish notification:', error);
    return errorResponse(500, 'Failed to queue notification', origin);
  }
}

async function handleBroadcast(body: string | undefined, origin?: string): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return errorResponse(400, 'Request body is required', origin);
  }

  let request: BroadcastRequest;
  try {
    request = JSON.parse(body);
  } catch {
    return errorResponse(400, 'Invalid JSON body', origin);
  }

  if (!request.title || !request.body) {
    return errorResponse(400, 'title and body are required', origin);
  }

  try {
    await publishToTopic(ANNOUNCEMENTS_TOPIC_ARN, {
      type: 'broadcast',
      notification: {
        title: request.title,
        body: request.body,
        icon: request.icon,
        badge: request.badge,
        data: request.data,
      },
    });
    return jsonResponse(200, { success: true, message: 'Broadcast queued' }, origin);
  } catch (error) {
    console.error('Failed to publish broadcast:', error);
    return errorResponse(500, 'Failed to queue broadcast', origin);
  }
}

// Main Lambda handler
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const { requestContext, body } = event;
  const method = requestContext.http.method;
  const path = requestContext.http.path;
  const origin = event.headers?.origin;

  console.log(`${method} ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(origin),
      body: '',
    };
  }

  try {
    // Route requests
    if (path === '/vapid-public-key' && method === 'GET') {
      return handleGetVapidPublicKey(origin);
    }

    if (path === '/subscribe') {
      if (method === 'POST') {
        return handleSubscribe(body, origin);
      }
      if (method === 'DELETE') {
        return handleUnsubscribe(body, origin);
      }
    }

    if (path === '/notify' && method === 'POST') {
      return handleNotify(body, origin);
    }

    if (path === '/broadcast' && method === 'POST') {
      return handleBroadcast(body, origin);
    }

    return errorResponse(404, 'Not found', origin);
  } catch (error) {
    console.error('Unhandled error:', error);
    return errorResponse(500, 'Internal server error', origin);
  }
}
