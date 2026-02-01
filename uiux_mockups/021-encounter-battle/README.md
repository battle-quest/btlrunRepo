# Screen 021: Battle Encounter

A specialized turn resolution screen for combat encounters.

## Purpose

- Visually distinct from standard exploration turns (Red theme).
- Focuses on the opponent (Avatar, HP).
- Presents combat-specific choices (Attack, Defend, Flee).

## Key Elements

| Element | Description |
|---------|-------------|
| **Battle Card** | Displays Player vs Enemy status and HP bars. |
| **Narrative** | Describes the immediate combat action. |
| **Combat Choices** | 3 wide buttons for combat reactions. |

## Navigation

- **From**: `02-game-turn` (if an action triggers combat).
- **To**: `02-game-turn` (after combat resolves/flees).

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/021-encounter-battle/index.html
```
