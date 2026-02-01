/**
 * Notification Dispatcher Lambda
 * 
 * Triggered by SNS events to send web push notifications.
 * Handles both targeted notifications (specific users) and broadcasts (all users).
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { SNSEvent, SNSEventRecord } from 'aws-lambda';
import webpush, { PushSubscription, WebPushError } from 'web-push';

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME!;
const VAPID_KEYS_SECRET_ARN = process.env.VAPID_KEYS_SECRET_ARN!;

// AWS clients
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const secretsClient = new SecretsManagerClient({});

// Cache VAPID keys
let vapidConfigured = false;

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

interface TargetedMessage {
  type: 'targeted';
  userIds: string[];
  notification: NotificationPayload;
}

interface BroadcastMessage {
  type: 'broadcast';
  notification: NotificationPayload;
}

type SNSMessage = TargetedMessage | BroadcastMessage;

interface StoredSubscription {
  pk: string;
  sk: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Configure web-push with VAPID keys
async function configureWebPush(): Promise<void> {
  if (vapidConfigured) {
    return;
  }

  const response = await secretsClient.send(new GetSecretValueCommand({
    SecretId: VAPID_KEYS_SECRET_ARN,
  }));

  if (!response.SecretString) {
    throw new Error('VAPID keys secret is empty');
  }

  const { publicKey, privateKey, subject } = JSON.parse(response.SecretString);
  
  if (publicKey.startsWith('PLACEHOLDER')) {
    throw new Error('VAPID keys not configured - update the secret with real keys');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

// Get subscriptions for specific users
async function getSubscriptionsForUsers(userIds: string[]): Promise<StoredSubscription[]> {
  const subscriptions: StoredSubscription[] = [];

  // Query each user's subscriptions (parallel)
  const queries = userIds.map(userId =>
    docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PUSH#${userId}`,
        ':sk': 'SUB#',
      },
    }))
  );

  const results = await Promise.all(queries);
  
  for (const result of results) {
    if (result.Items) {
      subscriptions.push(...(result.Items as StoredSubscription[]));
    }
  }

  return subscriptions;
}

// Get all subscriptions (for broadcast)
async function getAllSubscriptions(): Promise<StoredSubscription[]> {
  const subscriptions: StoredSubscription[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(pk, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'PUSH#',
      },
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    if (result.Items) {
      subscriptions.push(...(result.Items as StoredSubscription[]));
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return subscriptions;
}

// Remove invalid subscription
async function removeInvalidSubscription(subscription: StoredSubscription): Promise<void> {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: subscription.pk,
        sk: subscription.sk,
      },
    }));
    console.log(`Removed invalid subscription for user ${subscription.userId}`);
  } catch (error) {
    console.error(`Failed to remove invalid subscription:`, error);
  }
}

// Send push notification to a subscription
async function sendPushNotification(
  subscription: StoredSubscription,
  payload: NotificationPayload
): Promise<{ success: boolean; removed?: boolean }> {
  const pushSubscription: PushSubscription = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  };

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    data: payload.data || {},
    tag: payload.tag,
  });

  try {
    await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 86400, // 24 hours
    });
    return { success: true };
  } catch (error) {
    const pushError = error as WebPushError;
    
    // Handle expired/invalid subscriptions
    if (pushError.statusCode === 404 || pushError.statusCode === 410) {
      console.log(`Subscription expired/invalid (${pushError.statusCode}), removing...`);
      await removeInvalidSubscription(subscription);
      return { success: false, removed: true };
    }

    // Handle rate limiting
    if (pushError.statusCode === 429) {
      console.warn(`Rate limited for endpoint: ${subscription.endpoint}`);
      return { success: false };
    }

    console.error(`Failed to send notification to ${subscription.userId}:`, error);
    return { success: false };
  }
}

// Process a single SNS record
async function processRecord(record: SNSEventRecord): Promise<void> {
  const message: SNSMessage = JSON.parse(record.Sns.Message);
  
  console.log(`Processing ${message.type} notification`);

  // Get target subscriptions
  let subscriptions: StoredSubscription[];
  
  if (message.type === 'targeted') {
    subscriptions = await getSubscriptionsForUsers(message.userIds);
    console.log(`Found ${subscriptions.length} subscriptions for ${message.userIds.length} users`);
  } else {
    subscriptions = await getAllSubscriptions();
    console.log(`Found ${subscriptions.length} total subscriptions for broadcast`);
  }

  if (subscriptions.length === 0) {
    console.log('No subscriptions to notify');
    return;
  }

  // Send notifications in batches to avoid overwhelming the service
  const BATCH_SIZE = 100;
  const batches = [];
  
  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    batches.push(subscriptions.slice(i, i + BATCH_SIZE));
  }

  let successCount = 0;
  let failureCount = 0;
  let removedCount = 0;

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(sub => sendPushNotification(sub, message.notification))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successCount++;
        } else {
          failureCount++;
          if (result.value.removed) {
            removedCount++;
          }
        }
      } else {
        failureCount++;
      }
    }
  }

  console.log(`Notification results: ${successCount} sent, ${failureCount} failed, ${removedCount} removed`);
}

// Main Lambda handler
export async function handler(event: SNSEvent): Promise<void> {
  console.log(`Processing ${event.Records.length} SNS records`);

  // Configure web-push once per cold start
  await configureWebPush();

  // Process all records
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error('Failed to process record:', error);
      // Continue processing other records
    }
  }
}
