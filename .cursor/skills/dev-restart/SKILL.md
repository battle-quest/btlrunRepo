---
name: dev-restart
description: Rebuild Battle Quest and restart all dev servers (web, API, mocks). Use when code changes require recompilation, when ports are blocked, or when the user asks to rebuild, recompile, restart dev servers, or run the app.
---

# Dev Server Restart

Safely rebuild and restart all Battle Quest dev servers after code changes.

## When to Use

- After making changes to TypeScript files
- When dev servers are unresponsive or showing stale code
- When ports are already in use (EADDRINUSE errors)
- User asks to "compile and run" or "restart dev servers"

## Quick Start

```bash
# 1. Stop any running dev servers
pnpm exec kill-port 8787 9000 9001 5173

# 2. Build all packages
pnpm build

# 3. Start all dev servers
pnpm dev:all
```

## Detailed Workflow

### Step 1: Stop Running Processes

Battle Quest uses these ports:
- **8787**: API server
- **9000**: Mock KVS server
- **9001**: Mock AskAI server
- **5173**: Vite web server (may auto-increment to 5174, 5175, etc.)

**Recommended approach** - Use kill-port if available:
```bash
pnpm exec kill-port 8787 9000 9001 5173
```

**Alternative** - PowerShell port cleanup:
```powershell
# Simple approach - check each port individually
$ports = @(8787, 9000, 9001, 5173)
foreach ($p in $ports) {
  $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Output "Killed process on port $p"
  }
}
```

**PowerShell Lessons Learned**:
- Avoid complex one-liners with nested quotes - they fail due to escaping issues
- Use simple loops instead of trying to inline everything
- Use `-ErrorAction SilentlyContinue` to avoid noise when ports are free
- Multi-line scripts are more reliable than single-line commands

### Step 2: Build Everything

Run full workspace build:
```bash
pnpm build
```

This compiles:
- `packages/shared` (TypeScript)
- `apps/web` (TypeScript + Vite bundle)
- `services/api` (esbuild bundle)
- `services/pdf` (esbuild bundle)
- `services/kvs` (esbuild bundle)
- `services/askai` (esbuild bundle)
- `infra` (TypeScript)

**Expected output**: All packages build successfully, no TypeScript errors.

**Common build failures**:
- TypeScript errors: Fix type issues before proceeding
- Missing dependencies: Run `pnpm install`
- Stale node_modules: Delete and reinstall

### Step 3: Start Dev Servers

```bash
pnpm dev:all
```

This starts (via concurrently):
- Mock KVS server on port 9000
- Mock AskAI server on port 9001
- API server on port 8787
- Vite web server on port 5173 (or next available)

**Set `block_until_ms: 0`** to background the command immediately.

### Step 4: Wait and Verify

Wait 2-3 seconds for servers to initialize:
```bash
Start-Sleep -Seconds 2
```

Then read the terminal output to verify:
- All servers started successfully
- No EADDRINUSE errors
- Vite shows "Local: http://localhost:5173/" (or 5174, etc.)
- API shows "Battle Quest API running at http://localhost:8787"

**Check terminal file**: Read from `terminals/<shell-id>.txt` to see actual output.

### Step 5: Test in Browser

If using browser tools, navigate to the Vite URL (check terminal for actual port):
```
http://localhost:5173/
# or http://localhost:5174/ if 5173 was taken
```

## Terminal Management

The `pnpm dev:all` command is a **long-running process**. It should:
- Be backgrounded with `block_until_ms: 0`
- Output to a terminal file for monitoring
- Be checked by reading the terminal file, not waiting inline

## Troubleshooting

### Build Fails with Type Errors
- Read the error output carefully
- Fix TypeScript issues in the reported files
- Re-run `pnpm build`

### Ports Still In Use After Kill
- Wait 1-2 seconds and try again
- Check for orphaned processes with `Get-Process`
- Reboot as last resort (rare)

### Vite Shows Different Port
- This is normal behavior when 5173 is occupied
- Check terminal output for actual port
- Use the actual port in browser navigation

### Mock Servers Fail to Start
- Ensure `.env` file exists with required variables
- Check `KVS_ENDPOINT` and `ASKAI_ENDPOINT` are set
- Verify no other services are using ports 9000/9001

## Project-Specific Notes

- This skill is for **Battle Quest** monorepo only
- Workspace uses pnpm with workspace protocol
- All TypeScript must be compiled before runtime
- Mock servers simulate production KVS and AskAI endpoints
