---
name: dynamodb-modeling
description: Design and implement DynamoDB single-table patterns with partition/sort keys, GSIs, optimistic locking, and batch operations. Use when modeling data for the KV service, implementing queries, or optimizing DynamoDB access patterns.
---

# DynamoDB Data Modeling for btl.run

## Table Design

**Single table: `btlrun_kv`**

Primary key:
- `pk` (string) — partition key
- `sk` (string) — sort key

Standard attributes:
- `v` (binary or string) — value payload
- `ct` (string) — content type (e.g., `application/json`)
- `ver` (number) — version for optimistic locking
- `ttl` (number) — epoch seconds for auto-expiration
- `meta` (map) — optional metadata

## SAM Table Definition

```typescript
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const table = new dynamodb.Table(this, 'btlrunKV', {
  tableName: 'btlrun_kv',
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand for unpredictable traffic
  timeToLiveAttribute: 'ttl',
  pointInTimeRecovery: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect production data
});
```

## Key Naming Conventions

**Use stable prefixes for efficient querying:**

```typescript
// Match state
pk: `match#{matchId}`
sk: `state`

// Event logs (sortable by sequence)
pk: `match#{matchId}`
sk: `log#{seq.toString().padStart(6, '0')}`

// Daily summaries
pk: `match#{matchId}`
sk: `summary#{day}`

// Invite code mapping
pk: `invite#{code}`
sk: `meta`

// User profiles
pk: `user#{userId}`
sk: `profile`

// Rate limiting counters
pk: `rate#{userId}`
sk: `{route}#{window}`

// Locks
pk: `lock#match#{matchId}`
sk: `v`

// Idempotency
pk: `idem#{matchId}`
sk: `{idemKey}`

// Token budget tracking
pk: `budget#{matchId}`
sk: `tokens`
```

## Access Patterns

### 1. Get Match State

```typescript
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

async function getMatchState(matchId: string) {
  const result = await dynamodb.send(new GetItemCommand({
    TableName: 'btlrun_kv',
    Key: marshall({ pk: `match#${matchId}`, sk: 'state' }),
  }));
  
  if (!result.Item) return null;
  
  const item = unmarshall(result.Item);
  return JSON.parse(item.v);
}
```

### 2. Put Match State with Optimistic Locking

```typescript
import { PutItemCommand, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

async function updateMatchState(matchId: string, state: any, expectedVer?: number) {
  const newVer = (expectedVer || 0) + 1;
  
  try {
    await dynamodb.send(new PutItemCommand({
      TableName: 'btlrun_kv',
      Item: marshall({
        pk: `match#${matchId}`,
        sk: 'state',
        v: JSON.stringify(state),
        ct: 'application/json',
        ver: newVer,
      }),
      ConditionExpression: expectedVer !== undefined 
        ? 'ver = :expected' 
        : 'attribute_not_exists(pk)',
      ExpressionAttributeValues: expectedVer !== undefined
        ? marshall({ ':expected': expectedVer })
        : undefined,
    }));
    
    return newVer;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error('Concurrent modification detected. Retry with latest version.');
    }
    throw error;
  }
}
```

### 3. Append Event Log

```typescript
async function appendEventLog(matchId: string, seq: number, event: any) {
  await dynamodb.send(new PutItemCommand({
    TableName: 'btlrun_kv',
    Item: marshall({
      pk: `match#${matchId}`,
      sk: `log#${seq.toString().padStart(6, '0')}`,
      v: JSON.stringify(event),
      ct: 'application/json',
    }),
  }));
}
```

### 4. Query Event Logs (Pagination)

```typescript
import { QueryCommand } from '@aws-sdk/client-dynamodb';

async function getEventLogs(matchId: string, afterSeq?: number, limit = 50) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: 'btlrun_kv',
    KeyConditionExpression: 'pk = :pk AND sk >= :sk',
    ExpressionAttributeValues: marshall({
      ':pk': `match#${matchId}`,
      ':sk': afterSeq ? `log#${(afterSeq + 1).toString().padStart(6, '0')}` : 'log#',
    }),
    Limit: limit,
  }));
  
  return result.Items?.map(item => {
    const unmarshalled = unmarshall(item);
    return {
      seq: parseInt(unmarshalled.sk.replace('log#', '')),
      event: JSON.parse(unmarshalled.v),
    };
  }) || [];
}
```

### 5. Batch Get (Multiple Items)

```typescript
import { BatchGetItemCommand } from '@aws-sdk/client-dynamodb';

async function batchGetStates(matchIds: string[]) {
  const result = await dynamodb.send(new BatchGetItemCommand({
    RequestItems: {
      'btlrun_kv': {
        Keys: matchIds.map(id => marshall({
          pk: `match#${id}`,
          sk: 'state',
        })),
      },
    },
  }));
  
  return result.Responses?.['btlrun_kv']?.map(item => {
    const unmarshalled = unmarshall(item);
    return JSON.parse(unmarshalled.v);
  }) || [];
}
```

### 6. Atomic Counter Increment

```typescript
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';

async function incrementCounter(key: string, amount = 1): Promise<number> {
  const result = await dynamodb.send(new UpdateItemCommand({
    TableName: 'btlrun_kv',
    Key: marshall({ pk: key, sk: 'count' }),
    UpdateExpression: 'ADD #val :inc',
    ExpressionAttributeNames: { '#val': 'v' },
    ExpressionAttributeValues: marshall({ ':inc': amount }),
    ReturnValues: 'UPDATED_NEW',
  }));
  
  return unmarshall(result.Attributes!).v;
}
```

### 7. TTL for Rate Limiting

```typescript
async function setRateLimit(userId: string, route: string, count: number, ttlSeconds = 60) {
  const window = Math.floor(Date.now() / 1000 / ttlSeconds);
  const ttl = Math.floor(Date.now() / 1000) + ttlSeconds + 10; // +10s buffer
  
  await dynamodb.send(new PutItemCommand({
    TableName: 'btlrun_kv',
    Item: marshall({
      pk: `rate#${userId}`,
      sk: `${route}#${window}`,
      v: count,
      ttl, // DynamoDB will auto-delete after expiration
    }),
  }));
}
```

### 8. Delete Item

```typescript
import { DeleteItemCommand } from '@aws-sdk/client-dynamodb';

async function deleteItem(pk: string, sk: string) {
  await dynamodb.send(new DeleteItemCommand({
    TableName: 'btlrun_kv',
    Key: marshall({ pk, sk }),
  }));
}
```

## Hot Partition Prevention

**Avoid all writes hitting the same partition:**

### Problem: All events for a match share `pk = match#{matchId}`

**Solution**: Limit write rate per match (natural in turn-based game) or shard for extreme traffic:

```typescript
// Shard logs across multiple partitions
function getShardedLogKey(matchId: string, seq: number, shardCount = 4) {
  const shard = seq % shardCount;
  return {
    pk: `match#${matchId}#shard${shard}`,
    sk: `log#${seq.toString().padStart(6, '0')}`,
  };
}

// Query all shards when reading
async function getAllEventLogs(matchId: string, shardCount = 4) {
  const promises = Array.from({ length: shardCount }, (_, i) =>
    queryEventLogsForShard(matchId, i)
  );
  
  const results = await Promise.all(promises);
  return results.flat().sort((a, b) => a.seq - b.seq);
}
```

## Compression for Large Values

**Compress values > 10KB:**

```typescript
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

async function putLargeValue(pk: string, sk: string, value: any) {
  const json = JSON.stringify(value);
  
  if (json.length > 10_000) {
    const compressed = await gzipAsync(Buffer.from(json));
    
    await dynamodb.send(new PutItemCommand({
      TableName: 'btlrun_kv',
      Item: marshall({
        pk,
        sk,
        v: compressed,
        ct: 'application/json',
        meta: { compressed: true },
      }),
    }));
  } else {
    // Store uncompressed
    await dynamodb.send(new PutItemCommand({
      TableName: 'btlrun_kv',
      Item: marshall({ pk, sk, v: json, ct: 'application/json' }),
    }));
  }
}

async function getLargeValue(pk: string, sk: string) {
  const result = await dynamodb.send(new GetItemCommand({
    TableName: 'btlrun_kv',
    Key: marshall({ pk, sk }),
  }));
  
  if (!result.Item) return null;
  
  const item = unmarshall(result.Item);
  
  if (item.meta?.compressed) {
    const decompressed = await gunzipAsync(item.v);
    return JSON.parse(decompressed.toString());
  }
  
  return JSON.parse(item.v);
}
```

## Lightweight Lock Pattern

**For exclusive access (use sparingly):**

```typescript
async function acquireLock(matchId: string, ttlSeconds = 30): Promise<boolean> {
  const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;
  
  try {
    await dynamodb.send(new PutItemCommand({
      TableName: 'btlrun_kv',
      Item: marshall({
        pk: `lock#match#${matchId}`,
        sk: 'v',
        v: 'locked',
        ttl,
      }),
      ConditionExpression: 'attribute_not_exists(pk)',
    }));
    
    return true; // Lock acquired
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false; // Lock already held
    }
    throw error;
  }
}

async function releaseLock(matchId: string) {
  await deleteItem(`lock#match#${matchId}`, 'v');
}

// Usage
if (await acquireLock(matchId)) {
  try {
    // Perform exclusive operation
  } finally {
    await releaseLock(matchId);
  }
}
```

## Cost Optimization

1. **Use on-demand billing** for unpredictable traffic (MVP)
2. **Switch to provisioned + autoscaling** for high steady traffic
3. **Keep items < 100KB** to minimize RCU/WCU consumption
4. **Use eventual consistency** for reads when possible (half the cost)
5. **Batch operations** to reduce request count

## Error Handling

```typescript
try {
  await updateMatchState(matchId, state, version);
} catch (error) {
  if (error instanceof ConditionalCheckFailedException) {
    // Concurrent modification - reload and retry
    const latest = await getMatchState(matchId);
    // Merge changes and retry
  } else if (error.name === 'ProvisionedThroughputExceededException') {
    // Throttled - implement exponential backoff
    await exponentialBackoff(async () => updateMatchState(matchId, state, version));
  } else {
    throw error;
  }
}

async function exponentialBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 100); // 100ms, 200ms, 400ms
    }
  }
}
```

## Checklist

- [ ] Table created with pk/sk and TTL enabled
- [ ] Key naming follows prefix conventions
- [ ] Optimistic locking implemented for concurrent writes
- [ ] Event logs use sortable sequence numbers
- [ ] Hot partition risk assessed and mitigated
- [ ] Large values compressed
- [ ] Error handling includes retry logic
- [ ] IAM permissions grant least privilege
