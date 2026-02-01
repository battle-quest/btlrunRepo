# Screen 022: Event Encounter

A specialized turn resolution screen for non-combat events (discoveries, traps, social interactions).

## Purpose

- Visually distinct from standard turns and battles (Blue/Gold theme).
- Focuses on the event object (Icon, Type).
- Presents event-specific choices (Inspect, Loot, Leave).

## Key Elements

| Element | Description |
|---------|-------------|
| **Event Card** | Displays large icon and event meta info. |
| **Narrative** | Describes the discovery or situation. |
| **Event Choices** | 3 wide buttons for interaction options. |

## Navigation

- **From**: `02-game-turn` (if an action triggers an event).
- **To**: `02-game-turn` (after event resolves).

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/022-encounter-event/index.html
```
