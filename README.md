# btl.run

A hyper-efficient PWA game built with Preact, Rust Lambda, and AWS infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                           │
│  ┌─────────────────┐              ┌─────────────────────────┐   │
│  │  Static Assets  │──── S3 ─────│    Route 53 (DNS)       │   │
│  │  (Preact PWA)   │              └─────────────────────────┘   │
│  └─────────────────┘                                            │
│  ┌─────────────────┐                                            │
│  │   /api/*        │──── API Gateway ──── Rust Lambda           │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component      | Technology                          |
|----------------|-------------------------------------|
| Frontend       | Preact + Vite (PWA)                 |
| Game API       | Rust + Lambda (ARM64)               |
| AI Service     | Node.js Lambda + OpenAI             |
| KVS Service    | Node.js Lambda + DynamoDB           |
| Infrastructure | AWS SAM (CloudFormation)            |
| CDN            | CloudFront                          |
| DNS            | Route 53                            |
| Storage        | S3 + DynamoDB                       |

## Prerequisites

1. **AWS CLI** - Configured with appropriate credentials
   ```powershell
   aws configure
   ```

2. **SAM CLI** - For deploying infrastructure
   ```powershell
   winget install Amazon.SAM-CLI
   ```

3. **Rust** - With cargo-lambda for Lambda builds
   ```powershell
   # Install Rust
   winget install Rustlang.Rustup

   # Install cargo-lambda
   cargo install cargo-lambda
   ```

4. **Node.js 20+** - For frontend development
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

5. **pnpm** (recommended) - Fast package manager
   ```powershell
   npm install -g pnpm
   ```

## Project Structure

```
btlrunRepo/
├── .cursor/             # Cursor AI configuration
│   ├── agents/          # Specialized task agents
│   ├── skills/          # Reusable how-to guides
│   ├── rules/           # Coding standards
│   └── _lessons_learned/ # Technical patterns
├── frontend/            # Preact PWA
│   ├── src/             # Source code
│   ├── public/          # Static assets
│   └── dist/            # Build output (gitignored)
├── backend/             # Rust Lambda workspace
│   ├── functions/api/   # Game API Lambda handler
│   └── shared/          # Shared Rust library
├── AskAi_KVS/           # TypeScript Lambda services
│   ├── services/askai/  # OpenAI wrapper service
│   ├── services/kvs/    # Key-value storage service
│   ├── shared/          # Shared clients & schemas
│   ├── mocks/           # Local dev mock servers
│   └── examples/        # Usage examples
├── infrastructure/      # AWS SAM templates
│   ├── template.yaml    # Root orchestrator
│   ├── stacks/          # Nested CloudFormation stacks
│   │   ├── services.yaml # AskAI + KVS + DynamoDB
│   │   ├── api.yaml     # Rust game API + HTTP API Gateway
│   │   ├── storage.yaml # S3 buckets
│   │   └── cdn.yaml     # CloudFront + Route 53
│   └── parameters/      # Environment configs (dev, prod)
├── scripts/             # PowerShell deployment automation
├── uiux_mockups/        # HTML/CSS/JS UI prototypes
│   ├── assets/          # Shared images for mockups
│   ├── 00-start-screen/
│   ├── 01-tribute-setup/
│   ├── 02-game-turn/
│   └── 03-status-inventory-map/
├── assets/              # Game UI assets (images, icons)
├── docs/                # Project documentation
│   ├── guides/          # Living how-to guides
│   ├── history/         # Dated session summaries
│   └── spec/            # Game specification (future)
└── Documentation files  # README, ARCHITECTURE, SETUP, etc.
```

## Quick Start

### Setup OpenAI API Key

Before deploying, you need to configure the OpenAI API key:

**Option 1: Use existing secret (recommended for prod):**
The existing secret ARN is already configured in `infrastructure/parameters/prod.json`.

**Option 2: Create new secret for dev:**
```powershell
# Create the secret
aws secretsmanager create-secret `
    --name "btl-run/dev/openai-api-key" `
    --secret-string "YOUR_OPENAI_API_KEY"

# Update infrastructure/parameters/dev.json with the ARN
```

### Local Development

**Frontend:**
```powershell
cd frontend
pnpm install
pnpm dev
```

**TypeScript Services (local):**
```powershell
cd AskAi_KVS
pnpm install

# Terminal 1: KVS Mock Server
npx tsx mocks/kvs-server.ts

# Terminal 2: AskAI Mock Server  
npx tsx mocks/askai-server.ts
```

**Rust API (local Lambda):**
```powershell
cd backend
cargo lambda watch
```

### Deployment

**Deploy everything:**
```powershell
.\scripts\deploy.ps1 -Environment dev
```

**Deploy specific stack:**
```powershell
# Deploy only API (Lambda + API Gateway)
.\scripts\deploy-stack.ps1 -Stack api -Environment dev

# Deploy only storage (S3 buckets)
.\scripts\deploy-stack.ps1 -Stack storage -Environment dev

# Deploy only CDN (CloudFront)
.\scripts\deploy-stack.ps1 -Stack cdn -Environment dev
```

## Deployment Workflows

### Full Deployment
```powershell
.\scripts\deploy.ps1 -Environment dev
```

This will:
1. Build the frontend (Vite production build)
2. Build the backend (cargo-lambda ARM64)
3. Deploy all infrastructure via SAM
4. Upload frontend to S3
5. Invalidate CloudFront cache

### Partial Deployments

For faster iteration, deploy individual stacks:

| Command | What it does |
|---------|--------------|
| `deploy-stack.ps1 -Stack services` | Updates AskAI & KVS Lambda functions |
| `deploy-stack.ps1 -Stack api` | Updates Rust game API Lambda |
| `deploy-stack.ps1 -Stack storage` | Updates S3 bucket configuration |
| `deploy-stack.ps1 -Stack cdn` | Updates CloudFront settings |

### Frontend-Only Update
```powershell
.\scripts\build-frontend.ps1
# Then sync to S3 manually or use deploy.ps1 -SkipBuild
```

## Environment Configuration

Edit parameter files in `infrastructure/parameters/`:

- `dev.json` - Development environment (no custom domain)
- `prod.json` - Production environment (configured with btl.run domain)

**Production is pre-configured with:**
- Domain: btl.run
- Hosted Zone: Z064967319BVY1CFQ2IZX
- ACM Certificate: arn:aws:acm:...:79e671d3-7e77-4114-9edb-00530b310414
- OpenAI Secret: Existing secret ARN

Deploy with:
```powershell
.\scripts\deploy.ps1 -Environment prod
```

After deployment, access at: **https://btl.run**

## Service Endpoints

### Game API (Rust Lambda)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/health` | GET | API health check |
| `/api/*` | ANY | Game API routes |

### AskAI Service (OpenAI Wrapper)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Send prompt to OpenAI |

**Request:**
```json
{
  "systemPrompt": "You are a game narrator.",
  "input": "Describe a mysterious cave.",
  "maxTokens": 500,
  "model": "gpt-5-nano"
}
```

### KVS Service (Key-Value Storage)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/{key}` | GET | Get value |
| `/{key}` | PUT | Set value (create/replace) |
| `/{key}` | POST | Create only (fail if exists) |
| `/{key}` | PATCH | Partial update (merge) |
| `/{key}` | DELETE | Delete key |

## Cursor Cloud Agents

This project is configured for Cursor cloud agents. Rules in `.cursor/rules/` provide context:

- `general.mdc` - Project structure and conventions
- `rust-lambda.mdc` - Rust Lambda patterns

## Infrastructure Stacks

The infrastructure uses SAM nested stacks for modularity:

```
template.yaml (root)
├── stacks/storage.yaml  → S3 buckets
├── stacks/api.yaml      → API Gateway + Lambda
└── stacks/cdn.yaml      → CloudFront + Route53
```

## Cost Optimization

This architecture is designed for minimal cost:

- **Lambda ARM64** - Cheaper than x86
- **CloudFront** - PriceClass_100 (cheapest regions)
- **S3** - Standard storage with lifecycle rules
- **API Gateway** - HTTP API (cheaper than REST API)

## License

MIT
