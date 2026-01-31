---
id: aws-iam-permissions-debugging
category: aws
severity: high
keywords: [iam, permissions, access-denied, dynamodb, s3, lambda, policy]
related_rules: [50-infrastructure.mdc]
related_skills: [aws-infrastructure, dynamodb-modeling]
created: 2026-01-24
---

# IAM Permissions Debugging: Access Denied Errors

## Problem

Lambda function fails with Access Denied:

```
AccessDeniedException: User: arn:aws:sts::123456789:assumed-role/MyFunction-Role 
is not authorized to perform: dynamodb:GetItem on resource: arn:aws:dynamodb:us-east-1:123456789:table/MyTable
```

Or silent failures where operations just don't work.

## Root Cause

- Lambda's execution role doesn't have required permissions
- CDK `grant*` methods weren't called or were called incorrectly
- Resource ARN in policy doesn't match actual resource
- Condition keys restrict access unexpectedly
- Cross-account or cross-region access issues

## Solution

**1. Use CDK grant methods (preferred):**

```typescript
// CDK handles IAM policy creation automatically
const table = new dynamodb.Table(this, 'GameData', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
});

const apiHandler = new lambdaNodejs.NodejsFunction(this, 'ApiHandler', {
  // ... config
});

// Grant specific permissions
table.grantReadData(apiHandler);     // GetItem, Query, Scan
table.grantWriteData(apiHandler);    // PutItem, UpdateItem, DeleteItem
table.grantReadWriteData(apiHandler); // Both read and write

// For S3
bucket.grantRead(apiHandler);
bucket.grantPut(apiHandler);
bucket.grantReadWrite(apiHandler);

// For Secrets Manager
secret.grantRead(apiHandler);
```

**2. Check CloudWatch Logs for exact error:**

```typescript
// Add logging to see what's failing
console.log('Attempting DynamoDB operation:', {
  table: process.env.TABLE_NAME,
  operation: 'GetItem',
  key: { pk, sk },
});
```

**3. Verify environment variables are passed:**

```typescript
const apiHandler = new lambdaNodejs.NodejsFunction(this, 'ApiHandler', {
  environment: {
    TABLE_NAME: table.tableName,  // Must pass table name
    BUCKET_NAME: bucket.bucketName,
  },
});
```

**4. For GSI access, grant separately:**

```typescript
// GSI permissions aren't included in table grants
table.grantReadData(apiHandler);

// If using GSI, also add index permissions
apiHandler.addToRolePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:Query'],
  resources: [
    table.tableArn,
    `${table.tableArn}/index/*`,  // Include indexes
  ],
}));
```

**5. Debug IAM in AWS Console:**

- Go to IAM → Roles → Find Lambda's role
- Check "Permissions" tab for attached policies
- Use "Policy Simulator" to test specific actions

**6. Common permission sets for btl.run:**

```typescript
// KV Service Lambda needs:
table.grantReadWriteData(kvHandler);

// API Handler needs:
table.grantReadWriteData(apiHandler);
bucket.grantPut(apiHandler);  // For PDF uploads
secret.grantRead(apiHandler); // For API secrets

// PDF Generator needs:
bucket.grantPut(pdfHandler);
table.grantReadData(pdfHandler); // Read match logs
```

## Prevention

- [ ] Always use CDK `grant*` methods instead of manual IAM policies
- [ ] Pass resource names via environment variables
- [ ] Check CloudWatch Logs immediately after Access Denied
- [ ] Test with SAM local before deploying (uses your AWS credentials)
- [ ] Run `pnpm diff` to see IAM policy changes before deploy
- [ ] For GSI access, explicitly add index ARNs to policy

## References

- AWS IAM troubleshooting guide
- Related rule: `.cursor/rules/50-infrastructure.mdc`
- Related skill: `.cursor/skills/aws-infrastructure/SKILL.md`
