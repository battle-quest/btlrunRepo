---
name: openai-endpoint-test
description: Tests live OpenAI calls through the btl.run AskAI endpoint and the API devtools AskAI route. Use when verifying real OpenAI traffic, reproducing DevTools AskAI behavior, or diagnosing endpoint request/response issues before or after deployment.
---

# OpenAI Endpoint Test

## Scope

- Validate real OpenAI requests **through btl.run endpoints**, not directly to OpenAI.
- Match **DevTools** behavior in local dev.
- Validate **live AskAI Lambda** behavior after deployment.

## Endpoint Map

- **DevTools path (local/dev only)**: `POST /v1/dev/askai` on the API service.
  - This is what the web DevTools panel calls.
  - Disabled when `NODE_ENV=production`.
- **AskAI Lambda path (local or deployed)**: `ASKAI_ENDPOINT` (Lambda URL).
  - This is what the API calls to reach OpenAI.

## Quick Start: DevTools Parity (Local API)

1. Start the API:
   - `pnpm dev:api`
2. Ensure the client base URL matches your API:
   - `VITE_API_BASE_URL=http://localhost:8787`
3. Send a DevTools-equivalent request:
   - `curl -v -X POST "http://localhost:8787/v1/dev/askai" -H "Content-Type: application/json" -d "{\"question\":\"What is btl.run?\",\"maxTokens\":200,\"temperature\":0.7}"`
4. Expect response fields:
   - `answer`, `rawOutput`, `attempts`, `usedFallback`

## Quick Start: Live AskAI Endpoint (Real OpenAI)

1. Set the real endpoint:
   - `ASKAI_ENDPOINT=https://<your-askai-lambda>.lambda-url.us-east-1.on.aws`
2. Send a direct AskAI request (same structure the API uses):
   - `curl -v -X POST "$ASKAI_ENDPOINT" -H "Content-Type: application/json" -d "{\"systemPrompt\":\"You are a helpful assistant. Output JSON only: { \\\"answer\\\": \\\"text\\\" }\",\"input\":\"Question: What is btl.run?\\n\\nAnswer:\",\"maxTokens\":200,\"temperature\":0.7}"`
3. Expect response fields:
   - `output`, `tokensUsed`, `model`

## Recommended: Pretty Output + Game-Parity Prompts

Run the script that mirrors game prompts and prints raw + pretty output:

- `pnpm test:askai`
- Modes:
  - `pnpm test:askai -- --mode devtools`
  - `pnpm test:askai -- --mode askai`
  - `pnpm test:askai -- --mode both`

Overrides:
- `--question "Your DevTools question"`
- Uses `VITE_API_BASE_URL` and `ASKAI_ENDPOINT`

This uses the same system prompts and inputs as the game’s AI client for:
- Narration generation
- Tribute decision generation

## Full Endpoint Verification (Recommended)

- Run the existing verification suite for real endpoints:
  - `pnpm test:endpoints`
- This validates AskAI connectivity, JSON quality, and performance.

## Troubleshooting

- `404` on `/v1/dev/askai`: API is running in production mode or wrong base URL.
- `400 Validation failed`: request body missing `question` or exceeds limits.
- AskAI returns non-JSON: retry with stricter `systemPrompt` and lower `temperature`.
- Slow responses: check AskAI Lambda cold starts and OpenAI rate limits.
