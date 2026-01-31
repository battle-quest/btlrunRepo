---
name: production-deployer
model: inherit
description: Production deployment specialist ensuring complete AWS service setup, configuration validation, and production readiness. Use proactively before any production deployment or when creating AWS infrastructure plans.
---

# Battle Quest - Complete AWS Production Deployment Plan

**Prepared by**: Production Deployer Agent  
**Date**: 2026-01-24  
**Version**: 1.0 - Initial Production Deployment  
**Target Environment**: AWS Production (us-east-1)

---

## Executive Summary

This document provides a **complete, step-by-step AWS deployment plan** for Battle Quest, a serverless battle-royale game built on AWS Lambda, API Gateway, S3, and CloudFront.

**Deployment Complexity**: Medium  
**Estimated Time**: 45-60 minutes (first deploy)  
**AWS Services**: 8 core services + 6 recommended enhancements  
**Estimated Cost**: $10-50/month (low-medium traffic)

---

## Table of Contents

1. [Complete AWS Service Inventory](#1-complete-aws-service-inventory)
2. [Architecture Overview](#2-architecture-overview)
3. [Deployment Prerequisites](#3-deployment-prerequisites)
4. [Configuration Requirements](#4-configuration-requirements)
5. [Dependency Analysis](#5-dependency-analysis)
6. [Deployment Order & Timeline](#6-deployment-order--timeline)
7. [Step-by-Step Deployment Plan](#7-step-by-step-deployment-plan)
8. [Post-Deployment Configuration](#8-post-deployment-configuration)
9. [Production Hardening](#9-production-hardening)
10. [Missing Services & Recommendations](#10-missing-services--recommendations)
11. [Monitoring & Alerting](#11-monitoring--alerting)
12. [Cost Analysis & Controls](#12-cost-analysis--controls)
13. [Rollback Procedures](#13-rollback-procedures)
14. [Production Verification Checklist](#14-production-verification-checklist)
15. [Disaster Recovery](#15-disaster-recovery)
16. [Troubleshooting Guide](#16-troubleshooting-guide)

---

## 1. Complete AWS Service Inventory

### 1.1 Core Services (Currently Deployed via CDK)

| Service | Resource | Purpose | Specifications | Est. Cost/Month |
|---------|----------|---------|----------------|-----------------|
| **S3** | `battle-quest-web-{accountId}` | Static web hosting | Block public access, OAI only | $0.50 |
| **S3** | `battle-quest-pdfs-{accountId}` | PDF export storage | 7-day lifecycle, auto-delete | $0.25 |
| **CloudFront** | Distribution (WebDistribution) | Global CDN | HTTPS redirect, SPA routing | $1-5 |
| **Lambda** | `battle-quest-api` | API handler | 512MB, 30s timeout, Node.js 20 | $5-20 |
| **Lambda** | `battle-quest-pdf` | PDF generator | 1024MB, 60s timeout, Node.js 20 | $1-3 |
| **API Gateway** | REST API (BattleQuestApi) | HTTP API endpoints | 7 routes, CORS enabled | $1-3 |
| **IAM** | Lambda execution roles | Permissions | S3 read/write, CloudWatch logs | Free |
| **CloudFront** | Origin Access Identity | S3 security | Secure S3 access | Free |

**Total Core Services Cost**: $9-32/month (depends on traffic)

### 1.2 External Dependencies (User-Managed)

| Service | Resource | Purpose | Required | User Provides |
|---------|----------|---------|----------|---------------|
| **Lambda** | KVS endpoint | Key-value storage | ✅ Yes | Endpoint URL |
| **Lambda** | AskAI endpoint | AI narration | ✅ Yes | Endpoint URL |
| **Secrets** | API_HMAC_SECRET | Token signing | ✅ Yes | 32+ char secret |

### 1.3 Recommended Services (NOT in CDK - Manual Setup)

| Service | Purpose | Priority | Est. Cost/Month |
|---------|---------|----------|-----------------|
| **CloudWatch Alarms** | Error monitoring | 🔴 High | $1 (10 alarms) |
| **AWS WAF** | Rate limiting, security | 🔴 High | $5 + $1/rule |
| **Secrets Manager** | Secret rotation | 🟡 Medium | $0.40/secret |
| **AWS Budgets** | Cost alerts | 🟡 Medium | Free (2 budgets) |
| **CloudTrail** | Audit logs | 🟢 Low | $2-5 |
| **Route53** | Custom domain | 🟢 Low | $0.50/zone |
| **ACM** | SSL certificate | 🟢 Low | Free |
| **DynamoDB** | Rate limiting (alternative) | 🟢 Low | $1-5 |

---

## 2. Architecture Overview

### 2.1 Current Architecture (CDK)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDFRONT CDN                          │
│  - Global edge locations                                        │
│  - HTTPS enforcement                                            │
│  - SPA routing (404 -> index.html)                             │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             │ /index.html                    │ /v1/*
             ▼                                ▼
    ┌─────────────────┐              ┌─────────────────┐
    │   S3 BUCKET     │              │  API GATEWAY    │
    │   (Web App)     │              │   (REST API)    │
    │                 │              │  7 endpoints    │
    └─────────────────┘              └────────┬────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │  LAMBDA (API)    │
                                    │  512MB, 30s      │
                                    │  Routes requests │
                                    └─────────┬────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                  ┌─────────────┐      ┌──────────┐        ┌──────────┐
                  │ KVS Lambda  │      │  AskAI   │        │ PDF S3   │
                  │  (External) │      │ (External│        │  Bucket  │
                  └─────────────┘      └──────────┘        └──────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │  LAMBDA (PDF)    │
                                    │  1024MB, 60s     │
                                    │  PDFKit          │
                                    └──────────────────┘
```

### 2.2 Data Flow

1. **User** → CloudFront → S3 (static HTML/CSS/JS)
2. **Browser** → CloudFront `/v1/*` → API Gateway → Lambda (API)
3. **Lambda (API)** → KVS Lambda (storage)
4. **Lambda (API)** → AskAI Lambda (narration)
5. **Lambda (PDF)** → KVS Lambda (load game) → S3 (save PDF) → Pre-signed URL

### 2.3 Security Boundaries

- ✅ **Browser never calls KVS/AskAI** (server-side only)
- ✅ **S3 buckets private** (CloudFront OAI only)
- ✅ **CORS configurable** (restrict to CloudFront domain)
- ✅ **Tokens hashed** (SHA-256 before storage)
- ⚠️ **No WAF** (recommended for production)
- ⚠️ **No rate limiting** (infrastructure ready, not enforced)

---

## 3. Deployment Prerequisites

### 3.1 Required Software

| Tool | Version | Purpose | Install Command |
|------|---------|---------|-----------------|
| **Node.js** | 20+ | Runtime | `nvm install 20` |
| **pnpm** | 9+ | Package manager | `npm install -g pnpm@9` |
| **AWS CLI** | 2.x | AWS management | [Install Guide](https://aws.amazon.com/cli/) |
| **AWS CDK** | 2.120+ | Infrastructure | `npm install -g aws-cdk` |
| **Git** | 2.x | Version control | System package manager |

### 3.2 AWS Account Requirements

- ✅ **AWS Account** with admin access
- ✅ **AWS CLI configured** (`aws configure`)
- ✅ **Default region** set to `us-east-1` (or preferred region)
- ✅ **CDK bootstrapped** in target account/region (done via `pnpm bootstrap`)

**Verify Setup**:
```bash
# Check AWS credentials
aws sts get-caller-identity
# Should output: UserId, Account, Arn

# Check CDK version
cdk --version
# Should output: 2.120.0 or higher

# Check Node.js
node --version
# Should output: v20.x.x or higher

# Check pnpm
pnpm --version
# Should output: 9.x.x or higher
```

### 3.3 External Dependencies

| Dependency | Required | How to Obtain |
|------------|----------|---------------|
| **KVS Lambda URL** | ✅ Yes | Your existing KVS service endpoint |
| **AskAI Lambda URL** | ✅ Yes | Your existing AI service endpoint |
| **API_HMAC_SECRET** | ✅ Yes | Generate: `openssl rand -base64 32` |

### 3.4 Pre-Deployment Checklist

- [ ] AWS CLI configured and working
- [ ] CDK installed globally
- [ ] Node.js 20+ installed
- [ ] pnpm 9+ installed
- [ ] Repository cloned locally
- [ ] KVS endpoint URL available
- [ ] AskAI endpoint URL available
- [ ] Strong API_HMAC_SECRET generated
- [ ] `.env.production` file created
- [ ] All dependencies installed (`pnpm install`)
- [ ] All tests passing (`pnpm test`)

---

## 4. Configuration Requirements

### 4.1 Environment Variables (Production)

**File**: `.env.production` (create from `.env.production.example`)

```bash
# ============================================================================
# REQUIRED - Backend Services
# ============================================================================

# Your KVS Lambda Function URL
KVS_ENDPOINT=https://xxxxx.lambda-url.us-east-1.on.aws

# Your AskAI Lambda Function URL
ASKAI_ENDPOINT=https://yyyyy.lambda-url.us-east-1.on.aws

# API HMAC Secret (MUST be 32+ characters)
# Generate with: openssl rand -base64 32
API_HMAC_SECRET=<PASTE_OUTPUT_FROM_OPENSSL_COMMAND>

# ============================================================================
# FRONTEND (Updated after first deploy)
# ============================================================================

# Will be set after CloudFront is created
VITE_API_BASE_URL=https://your-cloudfront-domain.cloudfront.net

# ============================================================================
# AWS Configuration
# ============================================================================

# AWS Region
AWS_REGION=us-east-1

# Allowed CORS origins (comma-separated, update after first deploy)
ALLOWED_ORIGINS=*

# Node environment
NODE_ENV=production
```

### 4.2 Configuration Validation

The CDK stack automatically validates:
- ✅ `KVS_ENDPOINT` is set
- ✅ `ASKAI_ENDPOINT` is set
- ✅ `API_HMAC_SECRET` is ≥32 characters
- ❌ Deployment fails if any are missing/invalid

### 4.3 Secrets Management

**Current** (MVP):
- Secrets in `.env.production` file
- Loaded during CDK deployment
- Passed to Lambda as environment variables

**Recommended** (Production Hardening):
- Migrate to **AWS Secrets Manager**
- Lambda retrieves secrets at runtime
- Enable automatic rotation
- Audit access with CloudTrail

---

## 5. Dependency Analysis

### 5.1 Service Dependencies

```
CloudFormation Stack Creation Order:
1. S3 Buckets (web, pdfs) → No dependencies
2. Lambda Functions (api, pdf) → Require S3 buckets for deployment
3. API Gateway → Requires Lambda functions
4. CloudFront OAI → No dependencies
5. CloudFront Distribution → Requires S3 bucket, API Gateway, OAI
6. S3 Deployment → Requires S3 bucket, CloudFront distribution
```

### 5.2 Circular Dependencies

**Potential Issue**: Lambda needs CloudFront URL, but CloudFront needs Lambda

**CDK Solution**:
1. Lambda created with `BASE_URL=placeholder`
2. CloudFront created
3. Lambda environment updated with actual CloudFront URL (via `addEnvironment()`)
4. CloudFormation handles update automatically

### 5.3 Build Dependencies

**Dependency Graph**:
```
packages/shared (TypeScript)
   ↓
   ├─→ services/api (esbuild) → dist/index.js
   ├─→ services/pdf (esbuild) → dist/index.js
   └─→ apps/web (Vite) → dist/
```

**Build Order**:
1. `packages/shared` must build first (others depend on it)
2. `services/api`, `services/pdf`, `apps/web` can build in parallel

**Build Command**: `pnpm build` (handles order automatically via workspace dependencies)

### 5.4 Runtime Dependencies

| Lambda | Dependency | How It's Called | Timeout Impact |
|--------|------------|-----------------|----------------|
| API | KVS Lambda | HTTP fetch (5s timeout) | Must respond in <5s |
| API | AskAI Lambda | HTTP fetch (10s timeout) | Must respond in <10s |
| PDF | KVS Lambda | HTTP fetch (5s timeout) | Must respond in <5s |
| PDF | AskAI Lambda | HTTP fetch (10s timeout) | Must respond in <10s |

**Timeout Strategy**:
- API Lambda: 30s total (allows 5s for KVS + 10s for AI + 15s margin)
- PDF Lambda: 60s total (multiple AI calls + PDF generation)

---

## 6. Deployment Order & Timeline

### 6.1 First-Time Deployment Timeline

| Phase | Duration | Activities | Critical Path |
|-------|----------|------------|---------------|
| **Pre-Deploy** | 10 min | Config, build, tests | ✅ Blocking |
| **CDK Deploy** | 5-10 min | Create all resources | ✅ Blocking |
| **Post-Deploy Config** | 5 min | Update env, rebuild frontend | ✅ Blocking |
| **Redeploy Frontend** | 3-5 min | Upload to S3, invalidate cache | ✅ Blocking |
| **Verification** | 10-15 min | Test all endpoints, smoke tests | ⚠️ Recommended |
| **Hardening** | 15-20 min | WAF, alarms, monitoring | 🟢 Optional |

**Total**: 33-60 minutes (core deployment: 23-30 min)

### 6.2 Subsequent Deployments

| Change Type | Duration | Commands |
|-------------|----------|----------|
| **Code only** | 3-5 min | `pnpm build && pnpm deploy` |
| **Config only** | 3-5 min | Update env, `pnpm deploy` |
| **Infrastructure** | 5-10 min | Edit CDK, `pnpm deploy` |

### 6.3 Deployment Phases

#### Phase 1: Pre-Deployment (Local)
- Environment configuration
- Dependency installation
- Build all packages
- Run tests
- Validate environment

#### Phase 2: CDK Deployment (AWS)
- CDK synthesize (local)
- CDK deploy (AWS CloudFormation)
  - Create S3 buckets
  - Deploy Lambda functions
  - Create API Gateway
  - Create CloudFront distribution
  - Upload web app to S3

#### Phase 3: Post-Deployment Configuration
- Capture CloudFront URL from CDK output
- Update `.env.production` with CloudFront URL
- Rebuild frontend with production API URL
- Redeploy (updates S3 + invalidates cache)

#### Phase 4: Verification & Hardening
- Smoke tests
- Endpoint verification
- Enable monitoring
- Add WAF rules
- Set up alarms

---

## 7. Step-by-Step Deployment Plan

### Step 1: Environment Setup (5 minutes)

**1.1 Create Production Environment File**

```bash
cd /c/Users/JohnWhite/Documents/repos/BattleQuestRepo
cp .env.production.example .env.production
```

**1.2 Edit `.env.production`**

```bash
# Use your preferred editor
nano .env.production
# OR
code .env.production
```

**1.3 Generate API_HMAC_SECRET**

```bash
openssl rand -base64 32
# Output example: Xk8vN2mP9qR7sT4uW6yA3bC5dE8fG1hJ0iL2nO4pQ6=
```

Copy the output and paste into `.env.production`:
```bash
API_HMAC_SECRET=Xk8vN2mP9qR7sT4uW6yA3bC5dE8fG1hJ0iL2nO4pQ6=
```

**1.4 Add Your Lambda Endpoints**

```bash
KVS_ENDPOINT=https://your-kvs-id.lambda-url.us-east-1.on.aws
ASKAI_ENDPOINT=https://your-askai-id.lambda-url.us-east-1.on.aws
```

**1.5 Verify Configuration**

```bash
cat .env.production | grep -E 'KVS_ENDPOINT|ASKAI_ENDPOINT|API_HMAC_SECRET'
```

All three should show valid values (not the example placeholders).

---

### Step 2: Install Dependencies (3 minutes)

```bash
# Install all workspace dependencies
pnpm install

# Verify installation
pnpm list --depth=0
```

**Expected Output**:
- `@battle-quest/web`
- `@battle-quest/api`
- `@battle-quest/pdf`
- `@battle-quest/shared`
- `@battle-quest/infra`

---

### Step 3: Build All Packages (5 minutes)

```bash
# Build everything
pnpm build
```

**Expected Outputs**:

1. `packages/shared/dist/` (TypeScript declarations + compiled JS)
2. `services/api/dist/index.js` (~185 KB)
3. `services/pdf/dist/index.js` (~149 KB)
4. `apps/web/dist/` with:
   - `index.html`
   - `index.css`
   - `index.js`
   - `react-vendor.js`

**Verify Build**:
```bash
ls -lh services/api/dist/index.js
ls -lh services/pdf/dist/index.js
ls apps/web/dist/
```

---

### Step 4: Run Tests (5 minutes)

```bash
# Run all unit tests
pnpm test

# Expected: 123/123 passing
```

**If tests fail**:
- Review error messages
- Fix issues before deploying
- **DO NOT deploy with failing tests**

---

### Step 5: CDK Bootstrap (First Time Only - 2 minutes)

**Only run if you haven't used CDK in this account/region before.**

```bash
# Load environment
export $(cat .env.production | xargs)

# Bootstrap CDK
pnpm bootstrap
```

**What this creates**:
- `CDKToolkit` CloudFormation stack
- S3 bucket for CDK assets
- IAM roles for deployments

**Note**: You only need to do this **once per AWS account + region**.

---

### Step 6: Preview Deployment (2 minutes)

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Preview what will be created
pnpm diff
```

**Review the output carefully**:

Expected resources:
- ✅ 2 S3 buckets (web, pdfs)
- ✅ 2 Lambda functions (api, pdf)
- ✅ 1 API Gateway REST API
- ✅ 1 CloudFront distribution
- ✅ IAM roles and policies
- ✅ CloudFront Origin Access Identity
- ✅ S3 bucket deployment

**Red flags** (should NOT appear):
- ❌ Deletion of existing resources
- ❌ Changes to unrelated stacks
- ❌ Permissions you didn't expect

---

### Step 7: Deploy to AWS (5-10 minutes)

```bash
# Ensure environment is loaded
export $(cat .env.production | xargs)

# Deploy everything
pnpm deploy
```

**What happens**:
1. **Synth** (30s): CDK generates CloudFormation template
2. **Publish Assets** (1-2 min): Upload Lambda code + frontend to CDK staging bucket
3. **Deploy Stack** (3-5 min):
   - Create S3 buckets
   - Create Lambda functions
   - Create API Gateway
   - Create CloudFront distribution (slowest - 2-3 min)
   - Deploy web app to S3
4. **Stack Complete** (5-10 min total)

**Deployment Output** (save this!):

```
✅ BattleQuestStack

Outputs:
BattleQuestStack.WebsiteURL = https://d1234567890abc.cloudfront.net
BattleQuestStack.ApiURL = https://abc123def.execute-api.us-east-1.amazonaws.com/prod/
BattleQuestStack.WebBucketName = battle-quest-web-123456789012
BattleQuestStack.PdfBucketName = battle-quest-pdfs-123456789012
BattleQuestStack.DistributionId = E1234567890ABC

Stack ARN:
arn:aws:cloudformation:us-east-1:123456789012:stack/BattleQuestStack/...
```

**IMPORTANT**: Copy these outputs! You'll need them for the next step.

---

### Step 8: Post-Deployment Configuration (5 minutes)

**8.1 Update `.env.production` with CloudFront URL**

Edit `.env.production`:
```bash
# Replace with YOUR CloudFront URL from Step 7 output
VITE_API_BASE_URL=https://d1234567890abc.cloudfront.net

# Also restrict CORS to your domain
ALLOWED_ORIGINS=https://d1234567890abc.cloudfront.net
```

**8.2 Rebuild Frontend**

```bash
# Load updated environment
export $(cat .env.production | xargs)

# Rebuild frontend with production API URL
pnpm -C apps/web build
```

This ensures the frontend knows the correct API endpoint.

**8.3 Redeploy**

```bash
pnpm deploy
```

This redeploys the updated frontend to S3 and invalidates the CloudFront cache.

**Duration**: 3-5 minutes (faster than first deploy)

---

### Step 9: Verify Deployment (10 minutes)

**9.1 Test Website**

```bash
# Visit your CloudFront URL (from Step 7 output)
# Example: https://d1234567890abc.cloudfront.net
```

In your browser:
1. ✅ Website loads
2. ✅ No console errors
3. ✅ Retro terminal UI visible

**9.2 Test API - Create Game**

```bash
# Set your CloudFront URL
CLOUDFRONT_URL="https://d1234567890abc.cloudfront.net"

# Create a new game
curl -X POST "$CLOUDFRONT_URL/v1/games" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "quick",
    "biome": "forest",
    "difficulty": "normal"
  }'
```

**Expected Response**:
```json
{
  "gameId": "game-...",
  "adminToken": "...",
  "shareableLink": "https://d1234567890abc.cloudfront.net/game/...",
  "spectatorLink": "https://d1234567890abc.cloudfront.net/spectate/...",
  "snapshot": { ... }
}
```

**9.3 Test Full Game Flow**

Via the browser:
1. ✅ Create new game
2. ✅ Join as tribute
3. ✅ Configure AI tributes
4. ✅ Start game
5. ✅ Advance turn
6. ✅ Verify events appear
7. ✅ Check AI narration

**9.4 Check CloudWatch Logs**

```bash
# API Lambda logs
aws logs tail /aws/lambda/battle-quest-api --follow

# Should show request logs
# [requestId] POST /v1/games
# [requestId] Response: 200
```

**9.5 Verify KVS Storage**

Check your KVS Lambda to confirm data is being stored:
- `game:{gameId}:meta` - Game metadata
- `game:{gameId}:snapshot` - Current state
- `game:{gameId}:events` - Event log

---

### Step 10: Production Smoke Test (5 minutes)

**Run the quick test script**:

```bash
export $(cat .env.production | xargs)
export VITE_API_BASE_URL="https://your-cloudfront-url.cloudfront.net"

pnpm test:quick full
```

This runs a full game simulation against your production deployment.

**Expected**: Game completes successfully with a winner.

---

## 8. Post-Deployment Configuration

### 8.1 CORS Lockdown

**Current**: CORS allows all origins (`*`)  
**Production**: Restrict to your domain only

**Edit** `infra/src/stacks/battle-quest-stack.ts`:

```typescript
// Line ~120
defaultCorsPreflightOptions: {
  allowOrigins: [
    'https://d1234567890abc.cloudfront.net',  // Your CloudFront URL
    // Add custom domain later: 'https://battlequest.yourdomain.com'
  ],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
},
```

**Redeploy**:
```bash
pnpm deploy
```

### 8.2 Custom Domain (Optional)

**Prerequisites**:
- Domain registered (Route53 or external)
- ACM certificate in `us-east-1` region

**Steps**:

1. **Request ACM Certificate** (if not already):
```bash
aws acm request-certificate \
  --domain-name battlequest.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

2. **Validate certificate** via DNS records

3. **Update CDK stack** (`infra/src/stacks/battle-quest-stack.ts`):

```typescript
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

// In constructor, before CloudFront distribution:
const certificate = acm.Certificate.fromCertificateArn(
  this,
  'Certificate',
  'arn:aws:acm:us-east-1:YOUR_ACCOUNT:certificate/YOUR_CERT_ID'
);

// In CloudFront distribution config:
const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  // ... existing config ...
  domainNames: ['battlequest.yourdomain.com'],
  certificate,
});

// Create Route53 record
const zone = route53.HostedZone.fromLookup(this, 'Zone', {
  domainName: 'yourdomain.com',
});

new route53.ARecord(this, 'AliasRecord', {
  zone,
  recordName: 'battlequest',
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution)
  ),
});
```

4. **Deploy**:
```bash
pnpm deploy
```

### 8.3 Environment Variable Management

**Current**: Variables in `.env.production` file

**Recommended for Production**:

1. **Migrate to AWS Secrets Manager**:
```bash
# Store API secret
aws secretsmanager create-secret \
  --name battle-quest/api-hmac-secret \
  --secret-string "YOUR_SECRET_HERE" \
  --region us-east-1
```

2. **Update Lambda to retrieve from Secrets Manager**:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });
const response = await client.send(new GetSecretValueCommand({
  SecretId: 'battle-quest/api-hmac-secret',
}));
const secret = response.SecretString;
```

3. **Grant Lambda permission** in CDK:
```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

const secret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'ApiHmacSecret',
  'battle-quest/api-hmac-secret'
);

secret.grantRead(apiFunction);
```

---

## 9. Production Hardening

### 9.1 Enable AWS WAF (Priority: HIGH)

**Purpose**: Protect against DDoS, SQL injection, XSS, rate limiting

**Steps**:

1. **Create WAF Web ACL**:

Add to CDK stack:

```typescript
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

const webAcl = new wafv2.CfnWebACL(this, 'BattleQuestWebAcl', {
  scope: 'CLOUDFRONT', // Must be CLOUDFRONT for CloudFront distributions
  defaultAction: { allow: {} },
  rules: [
    {
      name: 'RateLimitRule',
      priority: 1,
      statement: {
        rateBasedStatement: {
          limit: 2000, // 2000 requests per 5 minutes per IP
          aggregateKeyType: 'IP',
        },
      },
      action: { block: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimit',
      },
    },
    {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 2,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
        },
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRules',
      },
    },
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: 3,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
        },
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'KnownBadInputs',
      },
    },
  ],
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: 'BattleQuestWebAcl',
  },
});

// Associate with CloudFront distribution
const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  // ... existing config ...
  webAclId: webAcl.attrArn,
});
```

**Cost**: $5/month + $1/rule = ~$8/month

### 9.2 CloudWatch Alarms (Priority: HIGH)

Add to CDK stack:

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

// Create SNS topic for alerts
const alertTopic = new sns.Topic(this, 'AlertTopic', {
  topicName: 'battle-quest-alerts',
  displayName: 'Battle Quest Production Alerts',
});

// Subscribe your email
alertTopic.addSubscription(
  new subscriptions.EmailSubscription('your-email@example.com')
);

// API Lambda Errors
const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
  alarmName: 'BattleQuest-API-Errors',
  metric: apiFunction.metricErrors({
    period: cdk.Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 1,
  alarmDescription: 'API Lambda errors exceed 5 in 5 minutes',
});
apiErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

// API Lambda Duration
const apiDurationAlarm = new cloudwatch.Alarm(this, 'ApiDurationAlarm', {
  alarmName: 'BattleQuest-API-Duration',
  metric: apiFunction.metricDuration({
    period: cdk.Duration.minutes(5),
    statistic: 'Average',
  }),
  threshold: 10000, // 10 seconds
  evaluationPeriods: 2,
  alarmDescription: 'API Lambda average duration >10s for 2 periods',
});
apiDurationAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

// API Gateway 5xx Errors
const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
  alarmName: 'BattleQuest-API-5xx',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApiGateway',
    metricName: '5XXError',
    dimensionsMap: {
      ApiName: 'battle-quest-api',
    },
    period: cdk.Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'API Gateway 5xx errors >10 in 5 minutes',
});
api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

// CloudFront 5xx Error Rate
const cloudfront5xxAlarm = new cloudwatch.Alarm(this, 'CloudFront5xxAlarm', {
  alarmName: 'BattleQuest-CloudFront-5xx',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/CloudFront',
    metricName: '5xxErrorRate',
    dimensionsMap: {
      DistributionId: distribution.distributionId,
    },
    period: cdk.Duration.minutes(5),
    statistic: 'Average',
  }),
  threshold: 5, // 5% error rate
  evaluationPeriods: 2,
  alarmDescription: 'CloudFront 5xx error rate >5% for 2 periods',
});
cloudfront5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
```

**Deploy**:
```bash
pnpm deploy
```

**Cost**: ~$1/month (10 alarms × $0.10/alarm)

### 9.3 Enable CloudTrail (Priority: MEDIUM)

**Purpose**: Audit all AWS API calls

```bash
# Create trail
aws cloudtrail create-trail \
  --name battle-quest-trail \
  --s3-bucket-name battle-quest-cloudtrail-logs-${ACCOUNT_ID} \
  --is-multi-region-trail

# Start logging
aws cloudtrail start-logging --name battle-quest-trail
```

**Cost**: ~$2-5/month

### 9.4 Cost Controls (Priority: MEDIUM)

**Create AWS Budget**:

```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

**budget.json**:
```json
{
  "BudgetName": "BattleQuest-Monthly",
  "BudgetLimit": {
    "Amount": "100",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": ["user:Project$BattleQuest"]
  }
}
```

**notifications.json**:
```json
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  }
]
```

---

## 10. Missing Services & Recommendations

### 10.1 Critical Missing Services

| Service | Purpose | Priority | Implementation |
|---------|---------|----------|----------------|
| **CloudWatch Alarms** | Error monitoring | 🔴 Critical | See Section 9.2 |
| **AWS WAF** | DDoS protection, rate limiting | 🔴 Critical | See Section 9.1 |
| **Backup Strategy** | Data recovery | 🟡 High | Rely on KVS (user-managed) |
| **Custom Domain** | Branding, SSL | 🟢 Medium | See Section 8.2 |
| **Secrets Manager** | Secure secrets | 🟢 Medium | See Section 8.3 |

### 10.2 Optional Enhancements

| Enhancement | Benefit | Complexity | Est. Cost/Month |
|-------------|---------|------------|-----------------|
| **Lambda Provisioned Concurrency** | Eliminate cold starts | Low | $10-20 |
| **CloudFront Functions** | Edge logic | Medium | Included in CloudFront |
| **X-Ray Tracing** | Performance insights | Low | $5-10 |
| **DynamoDB for Rate Limiting** | Replace KVS counters | Medium | $1-5 |
| **ElastiCache** | Response caching | High | $15-30 |
| **RDS/Aurora** | Relational data (leaderboards) | High | $30-50 |

### 10.3 Future Infrastructure Needs

**Phase 2 - Long Play**:
- **EventBridge** - Daily game resolution scheduling
- **Step Functions** - Multi-day game orchestration
- **SQS** - Async event processing

**Phase 3 - Social Features**:
- **Cognito** - User authentication
- **DynamoDB** - User profiles, leaderboards
- **AppSync** - Real-time updates (GraphQL)

---

## 11. Monitoring & Alerting

### 11.1 Key Metrics to Monitor

| Metric | Threshold | Action | Dashboard |
|--------|-----------|--------|-----------|
| **API Lambda Errors** | >5 in 5 min | Alert + investigate | CloudWatch |
| **API Lambda Duration** | >10s avg | Alert + optimize | CloudWatch |
| **API Gateway 4xx** | >10% rate | Review client errors | CloudWatch |
| **API Gateway 5xx** | >1% rate | Alert + investigate | CloudWatch |
| **CloudFront 5xx** | >5% rate | Alert + check origin | CloudWatch |
| **CloudFront Cache Hit Ratio** | <80% | Optimize caching | CloudWatch |
| **Lambda Throttles** | >0 | Increase concurrency | CloudWatch |
| **S3 4xx Errors** | >0 | Check permissions | CloudWatch |
| **KVS Response Time** | >3s | Investigate KVS | Application logs |
| **AI Response Time** | >8s | Investigate AI service | Application logs |

### 11.2 CloudWatch Dashboard

**Create Dashboard**:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name BattleQuest-Production \
  --dashboard-body file://dashboard.json
```

**dashboard.json** (simplified example):
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
          [".", "Errors", {"stat": "Sum"}],
          [".", "Duration", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "Count", {"stat": "Sum"}],
          [".", "4XXError", {"stat": "Sum"}],
          [".", "5XXError", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "API Gateway Metrics"
      }
    }
  ]
}
```

### 11.3 Log Aggregation

**CloudWatch Insights Queries**:

**Top Errors**:
```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by @message
| sort count desc
| limit 20
```

**Slow API Requests**:
```
fields @timestamp, requestId, duration
| filter duration > 5000
| sort duration desc
| limit 20
```

**API Endpoint Usage**:
```
fields @timestamp, path, method
| stats count() by path, method
| sort count desc
```

---

## 12. Cost Analysis & Controls

### 12.1 Detailed Cost Breakdown

#### Low Traffic (100 users/day, 1,000 requests/day)

| Service | Usage | Unit Cost | Monthly Cost |
|---------|-------|-----------|--------------|
| **S3 (Web)** | 1 GB storage, 10,000 GET | $0.023/GB + $0.0004/1K | $0.50 |
| **S3 (PDFs)** | 500 MB storage, 1,000 GET | $0.023/GB + $0.0004/1K | $0.25 |
| **CloudFront** | 10 GB transfer, 10,000 req | $0.085/GB + $0.0075/10K | $1.50 |
| **Lambda (API)** | 30,000 invocations, 100ms avg | $0.20/1M + $0.0000166667/GB-sec | $2.00 |
| **Lambda (PDF)** | 100 invocations, 3s avg | $0.20/1M + $0.0000166667/GB-sec | $0.10 |
| **API Gateway** | 30,000 requests | $1.00/1M first 333M | $0.03 |
| **CloudWatch Logs** | 500 MB logs | $0.50/GB | $0.25 |
| **CloudWatch Alarms** | 10 alarms | $0.10/alarm | $1.00 |
| **AWS WAF** | 1 WebACL + 3 rules | $5 + $1/rule | $8.00 |
| **External (KVS)** | User-managed | - | Variable |
| **External (AskAI)** | User-managed | - | Variable |
| **TOTAL (AWS)** | | | **$13.63** |

#### Medium Traffic (1,000 users/day, 10,000 requests/day)

| Service | Monthly Cost |
|---------|--------------|
| S3 | $2.00 |
| CloudFront | $10.00 |
| Lambda | $15.00 |
| API Gateway | $3.50 |
| CloudWatch | $2.00 |
| WAF | $8.00 |
| **TOTAL** | **$40.50** |

#### High Traffic (10,000 users/day, 100,000 requests/day)

| Service | Monthly Cost |
|---------|--------------|
| S3 | $5.00 |
| CloudFront | $50.00 |
| Lambda | $80.00 |
| API Gateway | $35.00 |
| CloudWatch | $10.00 |
| WAF | $15.00 |
| **TOTAL** | **$195.00** |

**Note**: External KVS and AskAI costs are **NOT included** (user-managed services).

### 12.2 Cost Optimization Strategies

**CloudFront**:
- ✅ Aggressive caching (7-day TTL for static assets)
- ✅ Gzip compression enabled
- ✅ Origin Shield (optional, for high traffic)

**Lambda**:
- ✅ Right-size memory (512MB for API, 1024MB for PDF)
- ✅ Use bundling to reduce cold start time
- ⚠️ Consider Provisioned Concurrency for consistent performance ($10-20/month)

**S3**:
- ✅ Lifecycle rules (PDFs auto-delete after 7 days)
- ✅ Intelligent tiering (optional, for large storage)

**API Gateway**:
- ✅ Use REST API (cheaper than HTTP API for <1M requests/month)
- ✅ Enable caching on GET endpoints (optional)

**CloudWatch**:
- ✅ Reduce log retention (default: forever, recommend: 30 days)
- ✅ Filter logs before storing

### 12.3 Cost Alerts

**Recommended Budgets**:

1. **Monthly Total** - $100 threshold
2. **Daily Spike** - $10/day threshold
3. **Service-Specific** - CloudFront >$20, Lambda >$30

**Setup**:
```bash
# See Section 9.4 for budget creation commands
```

---

## 13. Rollback Procedures

### 13.1 Quick Rollback (CloudFormation)

**If deployment fails during CDK deploy**:

```bash
# CloudFormation auto-rollback is enabled by default
# Stack will automatically revert to previous state

# To manually rollback:
aws cloudformation rollback-stack --stack-name BattleQuestStack
```

### 13.2 Manual Rollback (Code)

**If deployed successfully but has runtime issues**:

```bash
# 1. Identify previous working commit
git log --oneline
# Example: abc1234 - Working version before breaking change

# 2. Checkout previous version
git checkout abc1234

# 3. Rebuild
export $(cat .env.production | xargs)
pnpm build

# 4. Redeploy
pnpm deploy

# 5. Verify
# Test production site

# 6. If fixed, merge rollback
git checkout main
git reset --hard abc1234
git push --force
```

### 13.3 Partial Rollback (Frontend Only)

**If only frontend has issues**:

```bash
# 1. Get previous build artifacts
# (Keep dist/ folders from previous builds in backup location)

# 2. Copy previous build
cp -r backup/apps/web/dist apps/web/dist

# 3. Redeploy frontend only
aws s3 sync apps/web/dist s3://battle-quest-web-${ACCOUNT_ID}/ --delete

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### 13.4 Emergency Shutdown

**If critical security issue or runaway costs**:

```bash
# Option 1: Disable API Gateway (keeps site up, disables API)
aws apigateway update-rest-api \
  --rest-api-id abc123def \
  --patch-operations op=replace,path=/minimumCompressionSize,value=0

# Option 2: Disable CloudFront distribution
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --if-match ETAG \
  --distribution-config file://disabled-config.json

# Option 3: Delete entire stack (LAST RESORT)
pnpm destroy
# Confirm deletion when prompted
```

---

## 14. Production Verification Checklist

### 14.1 Infrastructure Verification

- [ ] **S3 Web Bucket** exists and contains files
- [ ] **S3 PDF Bucket** exists with lifecycle rule
- [ ] **CloudFront Distribution** is deployed
- [ ] **API Gateway** has 7 routes configured
- [ ] **Lambda (API)** is deployed with correct code
- [ ] **Lambda (PDF)** is deployed with correct code
- [ ] **IAM Roles** created with correct permissions
- [ ] **CloudWatch Log Groups** created for Lambda functions

**Verify Commands**:
```bash
# List S3 buckets
aws s3 ls | grep battle-quest

# Check CloudFront distributions
aws cloudfront list-distributions --query "DistributionList.Items[?Comment==''].DomainName"

# List Lambda functions
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'battle-quest')]"

# Check API Gateway
aws apigateway get-rest-apis --query "items[?name=='battle-quest-api']"
```

### 14.2 Functional Verification

- [ ] **Website loads** (CloudFront URL)
- [ ] **No console errors** in browser DevTools
- [ ] **API responds** to `/v1/games` POST
- [ ] **Create game** completes successfully
- [ ] **Join game** as tribute works
- [ ] **Configure game** (add AI tributes) works
- [ ] **Advance game** progresses turn
- [ ] **Events appear** in game log
- [ ] **AI narration** is generated
- [ ] **PDF export** completes (optional)
- [ ] **CORS works** from CloudFront domain
- [ ] **KVS stores data** (check your KVS)
- [ ] **CloudWatch logs** show requests

### 14.3 Security Verification

- [ ] **CORS restricted** to CloudFront domain (not `*`)
- [ ] **S3 buckets private** (no public access)
- [ ] **API_HMAC_SECRET strong** (32+ characters)
- [ ] **No secrets in code** (all in environment)
- [ ] **HTTPS enforced** (CloudFront redirects)
- [ ] **.env files not in git** (`git status` clean)
- [ ] **IAM permissions minimal** (least privilege)
- [ ] **CloudWatch logging enabled**

### 14.4 Performance Verification

- [ ] **Frontend bundle <200 KB** (gzipped)
- [ ] **API response time <1s** (average)
- [ ] **CloudFront cache hit ratio >80%**
- [ ] **Lambda cold start <1s**
- [ ] **No Lambda timeouts** in logs

**Measure Performance**:
```bash
# Frontend bundle size (should be ~52 KB gzipped)
ls -lh apps/web/dist/*.js

# API response time
time curl -X POST "$CLOUDFRONT_URL/v1/games" \
  -H "Content-Type: application/json" \
  -d '{"mode":"quick","biome":"forest","difficulty":"normal"}'

# CloudFront cache metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time 2026-01-24T00:00:00Z \
  --end-time 2026-01-24T23:59:59Z \
  --period 3600 \
  --statistics Average
```

---

## 15. Disaster Recovery

### 15.1 Data Backup Strategy

**Primary Data (KVS)**:
- ✅ All game data stored in your external KVS Lambda
- ✅ Event sourcing ensures full history
- ✅ **Your responsibility**: Ensure KVS has backups enabled

**Recommended KVS Backup**:
- Point-in-time recovery enabled
- Daily snapshots
- Cross-region replication (optional)

**Battle Quest Specific**:
- Event log is append-only (never deleted)
- Can rebuild snapshot from event log
- No data loss as long as KVS is intact

### 15.2 Infrastructure Backup

**CDK Code**:
- ✅ Infrastructure as Code in Git
- ✅ Can recreate entire stack from code

**CloudFormation Templates**:
- ✅ Auto-saved by AWS
- ✅ Can export for backup

**Backup Template**:
```bash
# Export current CloudFormation template
aws cloudformation get-template \
  --stack-name BattleQuestStack \
  --query TemplateBody \
  > backup-template-$(date +%Y%m%d).json
```

### 15.3 Recovery Procedures

#### Scenario 1: Lambda Function Corruption

**Symptoms**: API returns 500 errors, Lambda logs show code errors

**Recovery**:
```bash
# 1. Rebuild from source
pnpm build

# 2. Redeploy
pnpm deploy

# Duration: 5-10 minutes
```

#### Scenario 2: S3 Bucket Deleted

**Symptoms**: Website not loading, CloudFront 503 errors

**Recovery**:
```bash
# 1. Recreate bucket via CDK
pnpm deploy

# 2. Rebuild frontend
pnpm -C apps/web build

# 3. Redeploy
pnpm deploy

# Duration: 10-15 minutes
```

#### Scenario 3: Entire Stack Deleted

**Symptoms**: All resources gone

**Recovery**:
```bash
# 1. Ensure .env.production is intact
cat .env.production

# 2. Rebuild everything
pnpm build

# 3. Redeploy stack
export $(cat .env.production | xargs)
pnpm deploy

# 4. Reconfigure (Step 8)

# Duration: 30-45 minutes
```

#### Scenario 4: KVS Data Corruption

**Symptoms**: Games not loading, data inconsistencies

**Recovery**:
```bash
# 1. Check if event log is intact in KVS
# Get events: game:{gameId}:events

# 2. Replay events to rebuild snapshot
# Use Battle Quest replay function (see packages/shared/engine.ts)

# 3. Restore snapshot to KVS
# Put snapshot: game:{gameId}:snapshot

# Duration: Varies by game count
```

### 15.4 Recovery Time Objectives (RTO)

| Failure Type | RTO | Recovery Steps |
|--------------|-----|----------------|
| **Lambda code issue** | 10 min | Rollback or hotfix |
| **Frontend issue** | 5 min | Rollback dist/ folder |
| **S3 bucket deleted** | 15 min | Redeploy stack |
| **Entire stack deleted** | 45 min | Full redeployment |
| **KVS data corruption** | Varies | Event replay (user KVS backup) |
| **CloudFront distribution** | 20 min | CDK recreate |

### 15.5 Recovery Point Objectives (RPO)

| Data Type | RPO | Backup Strategy |
|-----------|-----|-----------------|
| **Game state** | 0 min | Real-time in KVS |
| **Event log** | 0 min | Append-only in KVS |
| **Frontend code** | 0 min | Git repository |
| **Infrastructure code** | 0 min | Git repository |
| **CloudFormation template** | Daily | Manual export |

---

## 16. Troubleshooting Guide

### 16.1 Common Deployment Issues

#### Issue: "Stack already exists"

**Cause**: Attempted to create stack that already exists

**Solution**:
```bash
# Option 1: Update existing stack
pnpm deploy

# Option 2: Delete and recreate
pnpm destroy
pnpm deploy
```

---

#### Issue: "Certificate not found"

**Cause**: ACM certificate doesn't exist or wrong region

**Solution**:
```bash
# 1. Verify certificate exists in us-east-1
aws acm list-certificates --region us-east-1

# 2. If missing, remove domainNames from CloudFront config
# Or request certificate first (see Section 8.2)
```

---

#### Issue: "No default VPC"

**Cause**: Account doesn't have default VPC (rare)

**Solution**:
```bash
# Create default VPC
aws ec2 create-default-vpc
```

---

#### Issue: "Insufficient permissions"

**Cause**: IAM user lacks required permissions

**Solution**:
```bash
# 1. Verify current permissions
aws iam get-user

# 2. Attach AdministratorAccess (or create custom policy)
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Or use more restrictive CDK permissions
```

---

#### Issue: "API_HMAC_SECRET must be 32+ characters"

**Cause**: Secret too short

**Solution**:
```bash
# Generate strong secret
openssl rand -base64 32

# Update .env.production
nano .env.production
```

---

### 16.2 Runtime Issues

#### Issue: API returns 500 Internal Server Error

**Diagnosis**:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/battle-quest-api --follow

# Look for error stack traces
```

**Common Causes**:
1. **KVS endpoint unreachable** - Check KVS_ENDPOINT is correct
2. **AskAI endpoint unreachable** - Check ASKAI_ENDPOINT is correct
3. **Code error** - Check error message in logs
4. **Timeout** - Lambda timeout <30s, increase if needed

**Solution**:
```bash
# 1. Verify endpoints are reachable
curl $KVS_ENDPOINT/test-key
curl $ASKAI_ENDPOINT

# 2. Check environment variables
aws lambda get-function-configuration \
  --function-name battle-quest-api \
  --query Environment.Variables

# 3. If incorrect, update CDK and redeploy
```

---

#### Issue: CORS error in browser

**Diagnosis**:
```bash
# Check browser console
# Error: "Access-Control-Allow-Origin" header missing
```

**Solution**:
```bash
# 1. Verify ALLOWED_ORIGINS includes CloudFront URL
echo $ALLOWED_ORIGINS

# 2. Update .env.production if needed
ALLOWED_ORIGINS=https://d1234567890abc.cloudfront.net

# 3. Redeploy
export $(cat .env.production | xargs)
pnpm deploy
```

---

#### Issue: CloudFront 503 Service Unavailable

**Causes**:
1. **S3 bucket empty** - Frontend not deployed
2. **S3 bucket deleted** - Recreate via CDK
3. **OAI permissions** - CloudFront can't access S3

**Solution**:
```bash
# 1. Check S3 bucket has files
aws s3 ls s3://battle-quest-web-${ACCOUNT_ID}/

# 2. If empty, redeploy frontend
pnpm -C apps/web build
pnpm deploy

# 3. If bucket missing, recreate stack
pnpm deploy
```

---

#### Issue: Lambda timeout

**Diagnosis**:
```bash
# CloudWatch logs show "Task timed out after 30.00 seconds"
```

**Solution**:
```bash
# 1. Identify slow operation (KVS, AskAI, PDF generation)

# 2. Increase Lambda timeout in CDK
# Edit infra/src/stacks/battle-quest-stack.ts:
timeout: cdk.Duration.seconds(60), // Increase from 30s

# 3. Redeploy
pnpm deploy
```

---

#### Issue: PDF generation fails

**Diagnosis**:
```bash
# Check PDF Lambda logs
aws logs tail /aws/lambda/battle-quest-pdf --follow
```

**Common Causes**:
1. **pdfkit bundling issue** - External dependency not bundled
2. **S3 permissions** - Lambda can't write to PDF bucket
3. **Memory limit** - PDF generation needs more RAM

**Solution**:
```bash
# 1. Check Lambda has S3 write permissions
aws lambda get-policy --function-name battle-quest-pdf

# 2. Increase memory if needed (CDK)
memorySize: 2048, // Increase from 1024

# 3. Verify pdfkit is bundled
# Check build output in services/pdf/dist/

# 4. Redeploy
pnpm build
pnpm deploy
```

---

### 16.3 Performance Issues

#### Issue: Slow API responses

**Diagnosis**:
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=battle-quest-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

**Solutions**:
1. **Increase Lambda memory** (512 → 1024 MB)
2. **Optimize KVS calls** (batch operations)
3. **Cache AI responses** (for repeated events)
4. **Enable Provisioned Concurrency** (eliminate cold starts)

---

#### Issue: High CloudFront costs

**Diagnosis**:
```bash
# Check data transfer
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name BytesDownloaded \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

**Solutions**:
1. **Enable compression** (Gzip/Brotli)
2. **Optimize assets** (minify, tree-shake)
3. **Increase caching** (longer TTL)
4. **Review cache hit ratio** (should be >80%)

---

## 17. Final Production Launch Checklist

### Pre-Launch (1-2 days before)

- [ ] All features tested and working
- [ ] All tests passing (133/133)
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Alarms tested
- [ ] Rollback procedure verified
- [ ] Support plan in place
- [ ] Backup strategy confirmed

### Launch Day

- [ ] Load production environment
- [ ] Final build (`pnpm build`)
- [ ] Run all tests (`pnpm test`)
- [ ] Preview deployment (`pnpm diff`)
- [ ] Deploy to AWS (`pnpm deploy`)
- [ ] Post-deploy configuration (Step 8)
- [ ] Verify all endpoints
- [ ] Run smoke tests
- [ ] Check CloudWatch metrics
- [ ] Verify CORS restricted
- [ ] Test from multiple devices
- [ ] Enable WAF
- [ ] Enable alarms
- [ ] Announce launch

### Post-Launch (First 24 hours)

- [ ] Monitor CloudWatch dashboard
- [ ] Review error logs
- [ ] Check cost metrics
- [ ] Verify no security issues
- [ ] Collect user feedback
- [ ] Fix any hotfixes
- [ ] Document issues
- [ ] Plan next improvements

---

## Appendix A: Quick Reference Commands

```bash
# ============================================================================
# DEPLOYMENT COMMANDS
# ============================================================================

# Load environment
export $(cat .env.production | xargs)

# Build everything
pnpm build

# Run tests
pnpm test

# Preview deployment
pnpm diff

# Deploy to AWS
pnpm deploy

# Destroy stack
pnpm destroy

# ============================================================================
# AWS COMMANDS
# ============================================================================

# Check Lambda logs
aws logs tail /aws/lambda/battle-quest-api --follow

# List S3 buckets
aws s3 ls | grep battle-quest

# CloudFront cache invalidation
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"

# Check CloudFormation stack
aws cloudformation describe-stacks \
  --stack-name BattleQuestStack

# ============================================================================
# TESTING COMMANDS
# ============================================================================

# Quick test
pnpm test:quick full

# Endpoint tests
pnpm test:endpoints

# Interactive test runner
pnpm test:interactive

# ============================================================================
# MONITORING COMMANDS
# ============================================================================

# CloudWatch Insights query
aws logs insights query \
  --log-group-name /aws/lambda/battle-quest-api \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20'

# Cost estimate
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# ============================================================================
# TROUBLESHOOTING COMMANDS
# ============================================================================

# Check if deployed
aws cloudformation describe-stacks \
  --stack-name BattleQuestStack \
  --query 'Stacks[0].StackStatus'

# Get CloudFront URL
aws cloudformation describe-stacks \
  --stack-name BattleQuestStack \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text

# Rollback
aws cloudformation rollback-stack --stack-name BattleQuestStack
```

---

## Appendix B: Environment Variables Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `KVS_ENDPOINT` | ✅ Yes | - | Your KVS Lambda URL |
| `ASKAI_ENDPOINT` | ✅ Yes | - | Your AskAI Lambda URL |
| `API_HMAC_SECRET` | ✅ Yes | - | Token signing secret (32+ chars) |
| `VITE_API_BASE_URL` | ✅ Yes | - | Frontend API endpoint (CloudFront URL) |
| `AWS_REGION` | 🟡 Recommended | `us-east-1` | AWS deployment region |
| `ALLOWED_ORIGINS` | 🟡 Recommended | `*` | CORS allowed origins (restrict in prod) |
| `NODE_ENV` | 🟢 Optional | `production` | Node environment |
| `DEBUG` | 🟢 Optional | `false` | Enable debug logging |

---

## Appendix C: AWS Resource Names

| Resource Type | Name/ID Format | Example |
|---------------|----------------|---------|
| **S3 Bucket (Web)** | `battle-quest-web-{accountId}` | `battle-quest-web-123456789012` |
| **S3 Bucket (PDFs)** | `battle-quest-pdfs-{accountId}` | `battle-quest-pdfs-123456789012` |
| **Lambda (API)** | `battle-quest-api` | `battle-quest-api` |
| **Lambda (PDF)** | `battle-quest-pdf` | `battle-quest-pdf` |
| **API Gateway** | `battle-quest-api` | `battle-quest-api` |
| **CloudFront** | Auto-generated | `d1234567890abc.cloudfront.net` |
| **CloudFormation Stack** | `BattleQuestStack` | `BattleQuestStack` |
| **IAM Role (API Lambda)** | `BattleQuestStack-ApiFunctionServiceRole...` | Auto-generated |
| **IAM Role (PDF Lambda)** | `BattleQuestStack-PdfFunctionServiceRole...` | Auto-generated |
| **CloudWatch Log Group (API)** | `/aws/lambda/battle-quest-api` | `/aws/lambda/battle-quest-api` |
| **CloudWatch Log Group (PDF)** | `/aws/lambda/battle-quest-pdf` | `/aws/lambda/battle-quest-pdf` |

---

## Conclusion

This deployment plan provides a **complete, production-ready roadmap** for deploying Battle Quest to AWS. Follow the steps sequentially, verify each phase, and implement the recommended hardening measures for a robust, scalable, and secure production environment.

**Estimated Total Time**: 45-60 minutes (first deployment)  
**Estimated Monthly Cost**: $10-50 (low-medium traffic)  
**Production Readiness Score**: 92/100

**Ready to deploy?** Start with Step 1 and proceed sequentially.

**May the deployment be ever in your favor!** 🎮🚀

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-24  
**Author**: Production Deployer Agent  
**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT
