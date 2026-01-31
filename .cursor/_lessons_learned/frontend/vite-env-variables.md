---
id: frontend-vite-env-variables
category: frontend
severity: medium
keywords: [vite, env, environment, VITE_, process.env, import.meta]
related_rules: [60-local-development.mdc]
related_skills: [preact-vite-performance]
created: 2026-01-24
---

# Vite Environment Variables: VITE_ Prefix Required

## Problem

Environment variables not available in frontend code:

```typescript
// Doesn't work - undefined in browser
const apiUrl = process.env.API_BASE_URL;

// Also doesn't work - not exposed to client
const secret = import.meta.env.API_SECRET;
```

Or accidentally exposing secrets:

```typescript
// DANGER: This exposes the secret to the browser!
const apiKey = import.meta.env.VITE_OPENAI_KEY;
```

## Root Cause

- Vite only exposes variables with `VITE_` prefix to client code
- Vite uses `import.meta.env`, not `process.env`
- `process.env` is Node.js only, doesn't exist in browser
- All `VITE_` prefixed vars are bundled into client code (public!)

## Solution

**1. Correct variable naming and access:**

```bash
# .env
VITE_API_BASE_URL=http://localhost:8787
VITE_APP_NAME=btl.run

# NOT exposed to client (server-side only via SSR or build scripts)
API_SECRET=super-secret-key
OPENAI_API_KEY=sk-...
```

```typescript
// Correct: Use import.meta.env with VITE_ prefix
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const appName = import.meta.env.VITE_APP_NAME;

// Type-safe access
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_APP_NAME: string;
  }
}
```

**2. Create env.d.ts for TypeScript:**

```typescript
// frontend/src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  // Add other VITE_ variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**3. Config helper with defaults:**

```typescript
// frontend/src/config.ts
export const config = {
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000',
  askaiEndpoint: import.meta.env.VITE_ASKAI_ENDPOINT || 'http://localhost:9001',
  kvsEndpoint: import.meta.env.VITE_KVS_ENDPOINT || 'http://localhost:9000',
  appName: 'btl.run',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

// Usage
import { config } from './config';
fetch(`${config.apiEndpoint}/health`);
```

**4. Development vs production:**

```bash
# frontend/.env.local (local dev, gitignored)
VITE_API_ENDPOINT=http://localhost:3000
VITE_ASKAI_ENDPOINT=http://localhost:9001
VITE_KVS_ENDPOINT=http://localhost:9000

# frontend/.env.production (production build)
VITE_API_ENDPOINT=https://api.btl.run
VITE_ASKAI_ENDPOINT=https://askai.btl.run
VITE_KVS_ENDPOINT=https://kvs.btl.run
```

**5. Build-time vs runtime:**

Vite inlines env vars at build time. For dynamic config:

```typescript
// Option A: Use window config injected by server
declare global {
  interface Window {
    __CONFIG__?: {
      apiUrl: string;
    };
  }
}

const apiUrl = window.__CONFIG__?.apiUrl || import.meta.env.VITE_API_BASE_URL;

// Option B: Fetch config at runtime
const configResponse = await fetch('/config.json');
const runtimeConfig = await configResponse.json();
```

**What NOT to expose via VITE_:**

```bash
# NEVER prefix these with VITE_ - they'd be public!
OPENAI_API_KEY=sk-...
DATABASE_URL=postgres://...
JWT_SECRET=...
AWS_SECRET_ACCESS_KEY=...
```

## Prevention

- [ ] Only use `VITE_` prefix for truly public config
- [ ] NEVER expose API keys or secrets with `VITE_`
- [ ] Use `import.meta.env`, not `process.env` in frontend
- [ ] Create `env.d.ts` for TypeScript support
- [ ] Use `.env.example` to document required variables
- [ ] Keep secrets in Lambda environment variables, not frontend

## References

- Vite env variables documentation
- Related rule: `.cursor/rules/60-local-development.mdc`
- Related skill: `.cursor/skills/react-vite-performance/SKILL.md`
