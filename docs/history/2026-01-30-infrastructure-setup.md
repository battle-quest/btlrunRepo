# Infrastructure Setup and Repository Initialization

**Date:** 2026-01-30  
**Commits:** 1742690...c364036 (15 commits)

## Context

Set up complete development environment for btl.run, a hyper-efficient PWA battle-royale game built on AWS serverless infrastructure.

## What Was Built

### Infrastructure (AWS SAM)
- Root SAM template orchestrating 4 nested CloudFormation stacks:
  - `services.yaml` - AskAI (OpenAI wrapper) + KVS (DynamoDB storage)
  - `api.yaml` - Rust game API + HTTP API Gateway
  - `storage.yaml` - S3 buckets (frontend + artifacts)
  - `cdn.yaml` - CloudFront distribution + Route 53
- Modular deployment via PowerShell scripts
- Environment-specific parameters (dev/prod)

### Frontend (Preact PWA)
- Vite build system with PWA plugin
- 40KB bundle size (Preact 3KB runtime)
- Service worker for offline support
- Modern dark theme UI

### Backend
- **Rust Lambda** - Game API (optimal cold starts)
- **Node.js Lambda** - AskAI service (OpenAI integration)
- **Node.js Lambda** - KVS service (DynamoDB CRUD)
- Shared libraries for code reuse

### Developer Experience
- 13 specialized AI agents for different tasks
- 12 skills (reusable how-to guides)
- 12 Cursor rules (coding standards)
- 15 lessons learned (debugging patterns)
- Comprehensive documentation

### Tooling
- PowerShell deployment scripts (full + partial)
- Build scripts for each component
- OpenAI secret management script
- Git repository with clean history

## Key Decisions

**Preact over React:** 3KB vs 45KB runtime - significant performance gain for minimal learning curve

**Rust for Game API:** Fastest Lambda cold starts (100-200ms vs 300-500ms Node.js)

**SAM over CDK:** Simpler for serverless-focused applications, better Lambda support, less boilerplate

**Nested Stacks:** Enables independent deployment of components without touching entire infrastructure

**Function URLs vs API Gateway:** Used Function URLs for services (simpler, no API Gateway costs), API Gateway for main game API (better routing, future auth)

**Existing Services Integration:** Reused battle-quest OpenAI secret for prod, created new btl-run resources to avoid disrupting existing deployment

**PowerShell Scripts:** Windows development environment requires PowerShell-native deployment automation

## Integration with Existing Resources

Chose parallel deployment strategy:
- New btl-run-* resources deployed alongside existing battle-quest-* resources
- Reuses existing OpenAI Secrets Manager secret in prod
- No disruption to existing deployments
- Gradual migration path available

## Challenges & Solutions

**Challenge:** Visual Studio Build Tools required for cargo-lambda compilation  
**Solution:** Used pip-installed cargo-lambda (includes Zig bundled), relies on SAM Docker builds for production

**Challenge:** SAM CLI waiting for previous installer to complete  
**Solution:** Parallel installation via winget, sequential verification

**Challenge:** Git push protection blocked OpenAI API key in .env.example  
**Solution:** Removed actual key, replaced with placeholder

**Challenge:** CDK-focused documentation from previous project  
**Solution:** Systematic replacement of CDK → SAM across 50+ files

## Repository Organization

- All "Battle Quest" references replaced with "btl.run"
- Obsolete folder paths updated (apps/ → frontend/, etc.)
- CDK-specific agents/skills removed
- SAM-specific agents/skills created
- Documentation consolidated and organized

## Prerequisites Installed

- AWS CLI 2.32.18
- SAM CLI 1.153.1
- Rust 1.93.0
- Cargo Lambda 1.8.6 (pip)
- Node.js v24.13.0
- pnpm 10.28.1
- Docker 29.1.2
- GitHub CLI 2.85.0

## Build Verification

- **Frontend:** 40.46 KB (Preact + PWA) ✓
- **AskAI Service:** 7.77 KB ✓
- **KVS Service:** 6.25 KB ✓
- **Rust Backend:** Builds via SAM Docker ✓
- **SAM Templates:** Validated ✓

## Next Steps

### Immediate
- Create OpenAI secret for dev environment
- First deployment to AWS dev
- Test all service endpoints

### Short Term
- Implement game logic
- Integrate UI mockups into Preact
- Add authentication
- Create game state management

### Long Term
- Production deployment
- Custom domain setup
- Monitoring and alerting
- CI/CD pipeline

## Related

- See `SETUP.md` for deployment instructions
- See `ARCHITECTURE.md` for technical details
- See `INTEGRATION.md` for service integration strategy
- Commits: https://github.com/battle-quest/btlrunRepo
