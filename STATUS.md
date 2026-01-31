# btl.run Project Status

**Last Updated:** January 30, 2026  
**Repository:** https://github.com/btl-run/btlrunRepo

## Setup Complete ✓

All infrastructure and tooling is configured and ready for development.

### Prerequisites Installed

| Tool | Status |
|------|--------|
| AWS CLI | ✓ Installed |
| SAM CLI | ✓ Installed |
| Rust | ✓ Installed |
| Cargo Lambda (via pip) | ✓ Installed |
| Node.js | ✓ Installed |
| pnpm | ✓ Installed |
| Docker | ✓ Installed |
| GitHub CLI | ✓ Installed |

### Git Repository

- **Status:** Initialized and pushed to GitHub
- **Account:** btl-run
- Clean commit history with infrastructure setup

### Project Structure Created

```
✓ .cursor/               Agent configuration (rules, agents, skills, lessons)
✓ frontend/              Preact PWA with Vite
✓ backend/               Rust Lambda workspace
✓ AskAi_KVS/            TypeScript Lambda services
✓ infrastructure/        SAM templates with nested stacks
✓ scripts/               PowerShell deployment automation
✓ assets/                Game UI assets
✓ uiux_mockups/         UI/UX prototypes
✓ docs/                  Documentation (guides, history)
```

### Infrastructure Stacks Defined

| Stack | Purpose | Status |
|-------|---------|--------|
| `services.yaml` | AskAI + KVS Lambda | Ready to deploy |
| `api.yaml` | Rust game API Lambda | Ready to deploy |
| `storage.yaml` | S3 + DynamoDB | Ready to deploy |
| `cdn.yaml` | CloudFront + Route 53 | Ready to deploy |

### Build Process Verified

| Component | Build Status |
|-----------|--------------|
| Frontend (Preact) | ✓ Tested, optimized |
| Services (TypeScript) | ✓ Tested, esbuild bundling |
| Backend (Rust) | ✓ Ready for SAM Docker build |

**Note:** Rust builds via SAM use Docker for cross-compilation to Lambda ARM64.

### Existing AWS Resources

You have these resources already deployed:

```
btl-run-prod-askai      (Lambda, Node.js 20.x)
  └─ URL: https://5qxowokttms7px4cmtza4cugku0ovubz.lambda-url.us-east-1.on.aws/

btl-run-prod-kvs        (Lambda, Node.js 20.x)
  └─ URL: https://ajeqoveqydsyhxofa5kwb3bx6a0ptbcw.lambda-url.us-east-1.on.aws/

btl-run-kvs-prod        (DynamoDB Table)

btl-run/prod/openai-api-key (Secrets Manager)
  └─ ARN: arn:aws:secretsmanager:us-east-1:615821144597:secret:btl-run/prod/openai-api-key-LdzRqt
```

These will remain untouched. New btl-run infrastructure will deploy alongside them.

## Next Steps

### Before First Deployment

1. **Review integration strategy** (see `INTEGRATION.md`)
2. **Decide on environment:**
   - Dev: Needs new OpenAI secret
   - Prod: Uses existing secret (already configured)

3. **For dev deployment:**
   ```powershell
   # Create OpenAI secret
   .\scripts\setup-openai-secret.ps1 -Environment dev -ApiKey "sk-..."
   
   # Update dev.json with the ARN
   # (script will show the ARN)
   ```

4. **Test deployment:**
   ```powershell
   # Deploy to dev
   .\scripts\deploy.ps1 -Environment dev
   
   # Or just test individual stacks
   .\scripts\deploy-stack.ps1 -Stack services -Environment dev
   ```

### Development Workflow

1. **Local development:**
   ```powershell
   # Frontend
   cd frontend && pnpm dev
   
   # Mock services
   cd AskAi_KVS
   PORT=9002 npx tsx mocks/kvs-server.ts    # :9002
   npx tsx mocks/askai-server.ts            # :9001
   ```

2. **Make changes**

3. **Deploy specific stack:**
   ```powershell
   .\scripts\deploy-stack.ps1 -Stack services -Environment dev
   ```

## Project Health

**Infrastructure:** ✓ Complete  
**Build Tools:** ✓ Verified  
**Documentation:** ✓ Comprehensive  
**Version Control:** ✓ Clean  
**Ready for Development:** ✓ Yes  

## Documentation

- `README.md` - Overview and quick start
- `SETUP.md` - Detailed setup instructions
- `ARCHITECTURE.md` - Technical architecture
- `INTEGRATION.md` - AskAI/KVS integration strategy
- `DEPLOYMENT-CHECKLIST.md` - Pre-deployment verification
- `STATUS.md` - This file
- `docs/` - Guides, history, specifications
- `.cursor/` - Agent configuration

## Known Considerations

1. **Rust builds require Docker** - SAM will use `--use-container` flag
2. **OpenAI secret** - Must be configured before deploying services stack
3. **Function URLs** - Currently open (NONE auth), consider adding auth for prod
4. **CORS** - Currently allows all origins (`*`), restrict for production
5. **Line endings** - Git will normalize LF ↔ CRLF automatically

## Architecture Decision Record

- **Frontend:** Preact chosen for minimal bundle size
- **Game API:** Rust chosen for optimal Lambda cold starts
- **Services:** Node.js chosen for existing codebase compatibility
- **Infrastructure:** SAM nested stacks for modular deployment
- **Storage:** S3 (frontend) + DynamoDB (KVS) + CloudFront (CDN)
- **Secrets:** AWS Secrets Manager (never in code)

Ready to start building the game!
