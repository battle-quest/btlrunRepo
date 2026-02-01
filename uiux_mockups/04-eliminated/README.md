# Screen 04: Eliminated / Spectator Entry

Shown when the player's HP reaches 0, they encounter a fatal event, **OR** when a user tries to join a game that is already in progress.

## Purpose

- Clearly communicate the game over state (Red/Dark theme).
- Explain the cause of death (if eliminated).
- Explain why they can't play (if joining late).
- **Drive retention** by encouraging the player to:
  - Host a game for friends (Social/Viral loop)
  - Play again solo
  - Spectate the remaining match

## Key Elements

| Element | Description |
|---------|-------------|
| **Death Card** | Icon, "Eliminated" (or "Game in Progress") title, Rank, and Cause. |
| **Narrative** | Final story beat explaining the end (or current state). |
| **Action Buttons** | Host, Play Again, Spectate. |

## Use Cases

1.  **Player Death**: User was playing and died. Shows cause of death and rank.
2.  **Late Join**: User entered a code for a game that has already started. Shows "Game in Progress" message.
3.  **Expired Link**: User clicked a choice link for a game that started. Shows "Too Late" message.

In all cases, the user can choose to **Spectate** to watch the rest of the match.

## Navigation

- **Host**: Goes to `015-host-lobby`.
- **Play Again**: Goes to `01-tribute-setup` (Solo).
- **Spectate**: Goes to `08-spectator` (Watch mode).

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/04-eliminated/index.html
```
