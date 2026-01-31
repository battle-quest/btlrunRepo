---
id: aws-lambda-esm-issues
category: aws
severity: high
keywords: [lambda, esm, commonjs, import, require, esbuild, bundle]
related_rules: []
related_skills: [lambda-development]
created: 2026-01-24
---

# Lambda ESM Issues: CommonJS vs ES Modules

## Problem

Lambda function fails to start or throws import errors:

```
Error: require() of ES Module not supported
```

```
SyntaxError: Cannot use import statement outside a module
```

```
Error [ERR_REQUIRE_ESM]: require() of ES Module
```

## Root Cause

- Node.js has two module systems: CommonJS (require) and ES Modules (import)
- AWS Lambda Node.js 18+ supports both, but configuration matters
- Dependencies might be ESM-only or CommonJS-only
- Build tool (esbuild) output format must match runtime expectations
- `package.json` type field affects module resolution

## Solution

**Option 1: CommonJS (recommended for Lambda)**

Most reliable for Lambda compatibility:

```json
// package.json
{
  "type": "commonjs"
}
```

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

**Option 2: ESM (if you need it)**

```json
// package.json
{
  "type": "module"
}
```

Handler file needs `.mjs` extension or configure esbuild:

```typescript
// CDK Lambda definition
new lambdaNodejs.NodejsFunction(this, 'Handler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: 'src/handler.ts',
  bundling: {
    format: lambdaNodejs.OutputFormat.ESM,
    banner: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
  },
});
```

**Option 3: Let CDK handle it (easiest)**

Use `NodejsFunction` which bundles with esbuild:

```typescript
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

new lambdaNodejs.NodejsFunction(this, 'ApiHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  # SAM uses esbuild metadata in template, not CDK bundling
  handler: 'handler',
  bundling: {
    minify: true,
    sourceMap: true,
    // esbuild handles module format automatically
  },
});
```

**For SAM Local:**

```yaml
# template.yaml
Globals:
  Function:
    Runtime: nodejs20.x
    Architectures:
      - x86_64

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: dist/handler.handler
      CodeUri: ./
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: "es2020"
        Format: cjs  # CommonJS for compatibility
        Sourcemap: true
        EntryPoints:
          - src/handler.ts
```

## Prevention

- [ ] Decide on module format (CommonJS recommended) and be consistent
- [ ] Set `type` in package.json explicitly
- [ ] Use `NodejsFunction` CDK construct for automatic bundling
- [ ] Test locally with SAM before deploying
- [ ] Check dependency compatibility with your chosen format
- [ ] Don't mix `require()` and `import` in the same file

## References

- AWS Lambda Node.js runtime docs
- Related skill: `.cursor/skills/lambda-development/SKILL.md`
