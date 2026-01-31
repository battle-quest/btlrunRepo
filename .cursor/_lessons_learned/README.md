# Lessons Learned

This folder captures recurring issues and their solutions to prevent agents from repeating the same mistakes.

## How This Works

When an agent encounters a problem that:
- Took multiple attempts to solve
- Has a high chance of recurring
- Involves a non-obvious fix

...the solution should be documented here as a lesson.

## Folder Structure

```
_lessons_learned/
├── README.md           # This file
├── _TEMPLATE.md        # Template for new lessons
├── typescript/         # TypeScript/type system issues
├── aws/               # AWS CDK, Lambda, DynamoDB issues
├── api/               # API design and implementation issues
├── zod/               # Schema validation issues
├── frontend/          # React, Vite, bundle issues
└── general/           # Cross-cutting concerns
```

## Lesson File Format

Each lesson uses this structure:

```markdown
---
id: category-short-name
category: typescript|aws|api|zod|frontend|general
severity: low|medium|high|critical
keywords: [keyword1, keyword2]
related_rules: [rule-file.mdc]
related_skills: [skill-folder]
---

# Title: Brief Description

## Problem
What went wrong? What error or unexpected behavior occurred?

## Root Cause
Why did this happen? What was the underlying issue?

## Solution
How was it fixed? Include code examples if relevant.

## Prevention
How can this be avoided in the future?

## References
- Links to docs, rules, or related lessons
```

## How Agents Should Use This

1. **Before starting a task**: Search lessons for relevant keywords
2. **When hitting an error**: Check if a lesson exists for that error type
3. **After solving a hard problem**: Create or update a lesson

## Adding a New Lesson

1. Copy `_TEMPLATE.md` to the appropriate category folder
2. Name the file descriptively: `import-order-cdk.md`, `zod-optional-vs-default.md`
3. Fill in all sections
4. Add relevant keywords for searchability

## Severity Levels

| Level | Description |
|-------|-------------|
| **critical** | Causes security issues, data loss, or deployment failures |
| **high** | Breaks functionality, requires rollback or significant rework |
| **medium** | Causes errors but has workarounds, wastes development time |
| **low** | Minor annoyance, style issue, or edge case |

## Cross-References

Lessons can reference:
- **Rules**: `.cursor/rules/*.mdc` for always-applied guidance
- **Skills**: `.cursor/skills/*/SKILL.md` for detailed how-to
- **Other lessons**: When issues are related
