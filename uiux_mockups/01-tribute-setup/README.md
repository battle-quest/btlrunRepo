# Screen 01: Tribute Setup

Quick setup screen that lets users configure and start a game in **2 taps**. All options are prepopulated with sensible defaults.

## Purpose

- Receive game type from previous screen (via `?type=` URL param)
- Let user choose a map pack (optional)
- Let user choose tribute count (optional)
- Show prepopulated AI tribute roster
- Single "Begin" button to start the game

## Key Elements

| Element | Description |
|---------|-------------|
| **Header** | Back button, "Quick Setup" title, type badge |
| **Map Pack** | Swipeable cards with map previews; default selected based on type |
| **Tribute Count** | Buttons: 6 (default), 8, 12, 16, 24 |
| **Roster** | Scrollable list of tributes with avatar, name, persona |
| **Begin Button** | Large CTA using wide button sprite |
| **Ad Banner** | 50px stub placeholder |

## Game Type Variations

Type is passed via URL: `?type=classic|spicy|funny`

| Type | Default Map | Tribute Style |
|------|-------------|---------------|
| Classic | Arena Prime | Tactical warriors (Steel Vanguard, Silent Arrow...) |
| Spicy | Inferno Pit | Ruthless killers (Bone Crusher, Backstabber...) |
| Funny | Chaos Carnival | Absurd characters (Sir Trips-a-Lot, Duck Commander...) |

## Tribute Roster

- First slot is always "You" (the player)
- Remaining slots filled with AI tributes matching the game type
- Roster adjusts dynamically when tribute count changes

## User Flow

1. User taps option on Start Screen → navigates here with `?type=X`
2. Defaults already selected (map + 6 tributes + AI roster)
3. User can customize OR just tap "Begin"
4. **Minimum friction: 2 taps from app open to gameplay**

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure with semantic markup |
| `styles.css` | All CSS styling |
| `script.js` | Type detection, roster rendering, selection handling |
| `README.md` | This documentation |

## Implementation Notes

**For future React conversion:**

1. Read `type` from app state or URL params
2. Fetch AI tribute names/personas from config or AI
3. Allow adding human players (invite flow)
4. "Begin" creates game in backend and routes to Turn Hub
5. Replace ad stub with real AdMob component

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/01-tribute-setup/index.html?type=classic
# Try: ?type=spicy or ?type=funny
```

## Navigation

```html
<!-- From 00-start-screen to here -->
<a href="../01-tribute-setup/index.html?type=classic">Continue</a>

<!-- Back to start screen -->
<a href="../00-start-screen/index.html">← Back</a>
```
