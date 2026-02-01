# Screen 023: Scout Encounter

A specialized turn resolution screen for exploration and scouting events.

## Purpose

- Visually distinct from combat/events (Teal/Green theme).
- Focuses on the map/location discovered.
- **Interactive**: Tapping the map card opens the full Map screen (`03`).

## Key Elements

| Element | Description |
|---------|-------------|
| **Scout Card** | Clickable mini-map visual with location name. |
| **Narrative** | Describes the terrain or discovery. |
| **Scout Choices** | 3 wide buttons for movement/resource options. |

## Navigation

- **From**: `02-game-turn` (if an action triggers scouting).
- **To**: `03-status-inventory-map` (tab=map) if card clicked.
- **To**: `02-game-turn` (after choice resolves).

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/023-encounter-scout/index.html
```
