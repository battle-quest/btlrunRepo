# Screen 024: Alliance Encounter

A specialized turn resolution screen for social and alliance interactions.

## Purpose

- Visually distinct from combat/events (Magenta/Purple theme).
- Focuses on the other tribute's profile and intent.
- Presents social choices (Accept, Refuse, Betray).

## Key Elements

| Element | Description |
|---------|-------------|
| **Alliance Card** | Avatar, Name, and Status of the tribute. |
| **Narrative** | Describes the social interaction or offer. |
| **Choices** | 3 wide buttons for social responses. |

## Navigation

- **From**: `02-game-turn` (if an action triggers a social event).
- **To**: `02-game-turn` (after resolution).

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/024-encounter-alliance/index.html
```
