---
id: general-never-delete-untracked-files
category: general
severity: critical
keywords: [git, commit, untracked, delete, data-loss, cursor, agent]
related_rules: [00-overview.mdc]
related_skills: []
---

# Never delete uncommitted files during “commit everything”

## Problem
While preparing a “commit everything” request, an agent deleted untracked files it believed were disposable (e.g. `.cursor/agents/*.md`). This caused irreversible loss of user-authored content.

## Root Cause
The agent attempted to produce a “clean working tree” by deleting untracked files, without confirming whether those files contained user content and without any backup/commit/stash.

## Solution
- **Do not delete** untracked / otherwise uncommitted files for cleanup.
- For tracked files: use `git restore` to revert unintended changes.
- For untracked files: **ask the user** whether to:
  - commit them,
  - add them to `.gitignore`, or
  - delete them (only with explicit confirmation).

## Prevention
- Treat all untracked/uncommitted files as potentially user-authored.
- Never delete anything in `.cursor/`, `.vs/`, or documentation folders unless explicitly requested.
- When asked to “commit everything”, stage relevant code and **pause** if untracked files exist.

## References
- `.cursor/rules/00-overview.mdc`
