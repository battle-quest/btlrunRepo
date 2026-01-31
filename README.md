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
| Backend        | Rust + Lambda (ARM64)               |
| Infrastructure | AWS SAM (CloudFormation)            |
| CDN            | CloudFront                          |
| DNS            | Route 53                            |
| Storage        | S3                                  |

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
├── .cursor/rules/       # Cursor AI agent configuration
├── frontend/            # Preact PWA
│   ├── src/             # Source code
│   ├── public/          # Static assets
│   └── dist/            # Build output
├── backend/             # Rust Lambda workspace
│   ├── functions/api/   # API Lambda handler
│   └── shared/          # Shared library
├── infrastructure/      # AWS SAM templates
│   ├── template.yaml    # Root template
│   ├── stacks/          # Nested stacks
│   └── parameters/      # Environment configs
└── scripts/             # Deployment scripts
```

## Quick Start

### Local Development

**Frontend:**
```powershell
cd frontend
pnpm install
pnpm dev
```

**Backend (local Lambda):**
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
| `deploy-stack.ps1 -Stack api` | Updates Lambda function code |
| `deploy-stack.ps1 -Stack storage` | Updates S3 bucket configuration |
| `deploy-stack.ps1 -Stack cdn` | Updates CloudFront settings |

### Frontend-Only Update
```powershell
.\scripts\build-frontend.ps1
# Then sync to S3 manually or use deploy.ps1 -SkipBuild
```

## Environment Configuration

Edit parameter files in `infrastructure/parameters/`:

- `dev.json` - Development environment
- `prod.json` - Production environment

To use a custom domain:
```json
{
  "Parameters": {
    "Environment": "prod",
    "DomainName": "btl.run",
    "HostedZoneId": "Z1234567890ABC"
  }
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/health` | GET | API health check |
| `/api/*` | ANY | API routes |

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
