# Development History

Chronological record of btl.run development sessions and decisions.

## Purpose

This folder contains **dated snapshots** of major work sessions, architectural decisions, and implementation phases. These are historical records that document "why" certain choices were made.

## Timeline

### 2026-01-30 - Infrastructure Setup
- Created: `2026-01-30-infrastructure-setup.md`
- Initial AWS SAM infrastructure
- Integrated AskAI/KVS services
- Set up Preact PWA frontend
- Configured Rust backend

(Add more entries as historical notes are created)

## Creating Historical Notes

### When to Create

Create a historical note when:
- ✅ Completing a major implementation phase
- ✅ Making significant architectural decisions
- ✅ Finishing a milestone or feature
- ✅ Documenting complex problem-solving sessions

### When NOT to Create

Don't create for:
- ❌ Minor bug fixes
- ❌ Routine updates
- ❌ Configuration changes
- ❌ Daily progress notes
- ❌ Information that belongs in living guides

### Naming Convention

```
YYYY-MM-DD-description.md
```

Examples:
- `2026-01-30-infrastructure-setup.md`
- `2026-02-05-game-engine-implementation.md`
- `2026-02-10-production-deployment.md`
- `2026-02-15-long-play-mode.md`

### Quality Standards

**Be Concise:**
- Target 100-300 lines
- Use bullet points, not paragraphs
- Focus on key decisions and outcomes
- Link to code/commits, don't duplicate them

**Be Additive:**
- Check if a note exists for today - update it instead of creating new
- Each note should add NEW information
- Reference previous notes instead of repeating context
- Consolidate related work into one note

**Be Historical:**
- These are snapshots - never update after creation
- Capture the context and reasoning
- Document "why" more than "what"
- Include relevant dates and commit hashes

## Template

```markdown
# [Topic/Phase Name]

**Date:** YYYY-MM-DD
**Commits:** abc1234...xyz7890

## Context

Why this work was needed (1-2 sentences)

## What Was Built

- Key feature/component implemented
- Major changes made
- New capabilities added

## Key Decisions

- Architectural choice: why we chose X over Y
- Technical decision: reasoning behind approach

## Challenges & Solutions

- Problem encountered: how it was solved
- Non-obvious issue: what we learned

## Next Steps

- What's needed next
- Open questions
- Future considerations

## Related

- Previous history: `YYYY-MM-DD-previous.md`
- Commits: https://github.com/battle-quest/btlrunRepo/commit/abc1234
```

## Maintenance

- **Add entry to this README** when creating new historical note
- **Never modify** historical notes after creation (they're snapshots)
- **Consolidate** multiple notes from same day if they cover related work
- **Reference** previous notes to avoid duplication

## Related Documentation

- `CHANGELOG.md` (root) - Version milestones
- `docs/guides/` - Current how-to documentation
- `.cursor/_lessons_learned/` - Technical debugging patterns
