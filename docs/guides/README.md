# Living Guides

Current, maintained operational documentation for btl.run.

## Purpose

These guides document **how to do things** in btl.run. They should stay current as the system evolves.

## Available Guides

(Guides will be added as they're created)

### Development
- (To be created as needed)

### Deployment
- See `SETUP.md` and `DEPLOYMENT-CHECKLIST.md` in root for comprehensive deployment guidance

### Game Mechanics
- (To be created as game logic is implemented)

## Creating a New Guide

### When to Create a Guide

Create a guide in `docs/guides/` when:
- You need detailed how-to documentation for a specific task
- The information doesn't fit in root docs (too detailed/narrow)
- It's a living document that will need updates

### When to Use Root Docs Instead

Use root documentation files when:
- It's setup/deployment info → `SETUP.md`
- It's architectural info → `ARCHITECTURE.md`
- It's integration info → `INTEGRATION.md`
- It's a quick reference → `README.md`

### Guide Template

```markdown
# {Topic} Guide

Brief description of what this guide covers.

## Prerequisites

- What you need before following this guide

## Overview

High-level explanation of the process/feature

## Step-by-Step Instructions

### 1. First Step

Detailed instructions with code examples

### 2. Second Step

More instructions

## Common Issues

**Problem:** Description  
**Solution:** How to fix

## Related

- Links to other guides or docs
- Related skills in `.cursor/skills/`
```

## Maintenance

Guides are **living documents**:
- Update when processes change
- Remove when no longer relevant
- Consolidate if multiple guides cover same topic
- Keep examples working and paths current
