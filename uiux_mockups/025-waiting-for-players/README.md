# Screen 025: Waiting for Players

Shows the waiting state in Long Play mode after the user submits their choice. This is an intermediary screen that appears:
1. After clicking "Begin" on the tribute setup screen (`01`)
2. After selecting a choice on the game turn screen (`02`)

In Long Play mode, real players need to submit their choices before the turn can resolve.

## Purpose

- Display the user's submitted choice (with option to change it)
- Show which players have submitted vs still waiting
- Display a countdown timer to the daily cutoff (9 PM ET)
- Prompt user to enable notifications for turn resolution
- Provide quick-glance **stat bars** on the left rail (HP, Stamina, Hunger)

## Key Elements

| Element | Description |
|---------|-------------|
| **Left Rail** | Flush-left, vertically centered bar with 3 stacked mini-meters (HP/Stamina/Hunger). Tap anywhere to open the Status/Inventory/Map screen (`03`). |
| **Header** | Back button + "Awaiting Turn" title + type badge |
| **Turn Status** | Day/turn info + alive count + map name |
| **Your Choice** | Green-bordered card showing the user's submitted choice with a "Change" button |
| **Waiting Progress** | Progress bar + label showing "X of Y submitted" |
| **Player List** | Scrollable list of all players with their submission status |
| **Cutoff Timer** | Large countdown showing time until daily resolution (HH:MM:SS) |
| **Notification Prompt** | Toggle to enable push notifications for turn resolution |
| **Ad Banner** | 50px stub placeholder for AdMob banner |

## Long Play Mode

In Long Play mode (1 real day = 1 game day):

- Players have until the daily cutoff (9 PM ET) to submit their choice
- Turn resolves either when all players submit OR at the daily cutoff
- Players who don't submit by cutoff have AI make a choice for them
- This screen is shown after the user submits, while waiting for others

## URL Parameters

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `type` | classic, spicy, funny | classic | Game type (affects colors, player names) |
| `map` | arena-prime, inferno-pit, chaos-carnival | inferno-pit | Selected map |
| `count` | 6, 8, 12, 16, 24 | 6 | Number of tributes in the game |
| `choice` | 1, 2, 3 | 1 | User's submitted choice (1-3) |

## Navigation

- **From (game start)**: `01-tribute-setup/index.html` → "Begin" button
- **From (turn choice)**: `02-game-turn/index.html` → any of the 3 choice buttons
- **Change button**: `02-game-turn/index.html` (to change choice before cutoff)
- **Back button**: `02-game-turn/index.html`
- **Left rail tap**: `03-status-inventory-map/index.html` (status/inventory/map)
- **On resolution**: When turn resolves, navigates to `02-game-turn/index.html` with new results

## Navigation Flow Diagram

```
┌─────────────────┐      Begin       ┌─────────────────────────┐
│ 01-tribute-setup│ ───────────────► │ 025-waiting-for-players │
└─────────────────┘                  └─────────────────────────┘
                                               ▲    │
                                     Choice    │    │ Change/Back
                                     buttons   │    ▼
                                     ┌─────────────────┐
                                     │  02-game-turn   │
                                     └─────────────────┘
```

## Player Status States

| Status | Style | Description |
|--------|-------|-------------|
| **Submitted** | Green badge "✓ Submitted" | Player has made their choice |
| **Waiting** | Gray badge "Waiting..." | Player hasn't submitted yet |
| **You** | Green border highlight | Current user's row |

## Timer Behavior

The countdown timer shows time remaining until the daily cutoff:
- Ticks down in real-time (seconds)
- Separator colons blink for visual feedback
- When timer reaches 00:00:00, turn auto-resolves

## Notification Toggle

- **Enable**: Shows "Enable" button, tapping adds push notification permission
- **Enabled**: Shows "Enabled ✓" with green styling
- Persists preference (in real app would use browser Push API)

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure |
| `styles.css` | CSS styling (includes timer, player list, notification) |
| `script.js` | JavaScript behavior (countdown, player list, navigation) |
| `README.md` | This documentation |

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/025-waiting-for-players/index.html?type=classic&map=inferno-pit&count=6&choice=1
```

## Links

**Always use explicit filenames** (CloudFront/S3 compatibility):

```html
<!-- ✅ CORRECT -->
<a href="../02-game-turn/index.html">Link</a>

<!-- ❌ WRONG -->
<a href="../02-game-turn/">Link</a>
```
