# Screen 02: Game Turn

Shows the game in progress after the user clicks "Begin" on the tribute setup screen. AI tributes make their choices automatically with an animated sequence, then the AI-generated story narrative is displayed, followed by the next question for the user.

## Purpose

- Display AI tributes making their choices (animated sequence)
- Show the AI-generated story narrative based on all choices
- Present collapsible event log with key happenings
- Ask the user their next question with 3 options
- Provide quick-glance **stat bars** on the left rail (HP, Stamina, Hunger)

## Key Elements

| Element | Description |
|---------|-------------|
| **Left Rail** | Flush-left, vertically centered bar with 3 stacked mini-meters (HP/Stamina/Hunger). Tap anywhere to open the Status/Inventory/Map screen (`03`). |
| **Header** | Back button + "Turn 1" title + type badge |
| **Turn Status** | Day/turn info + alive count + map name |
| **AI Processing** | Animated list of tributes making choices with progress bar |
| **Narrative** | Story paragraph generated from all tribute choices |
| **Event Log** | Collapsible list of key events (deaths, items claimed, etc.) |
| **Next Question** | GM prompt + 3 wide action buttons for user's next choice |
| **Ad Banner** | 50px stub placeholder for AdMob banner |

## Left Rail (Quick Stats)

The left edge of the screen has a slim, vertically centered rail containing **three stacked bars**:

| Bar | Color | Represents |
|-----|-------|------------|
| **HP** | Green | Player health |
| **Stamina** | Theme accent | Energy / action capacity |
| **Hunger** | Yellow | Food / sustenance level |

- The rail is **flush to the left edge** (no gap).
- Bars fill from the bottom; heights vary based on mock stat values.
- **Tapping anywhere on the rail** navigates to `03-status-inventory-map` (passing all URL params).
- No labels — users discover it organically.

## URL Parameters

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `type` | classic, spicy, funny | classic | Game type (affects colors, narrative tone, tribute names) |
| `map` | arena-prime, inferno-pit, chaos-carnival | inferno-pit | Selected map (displayed in status bar) |
| `count` | 6, 8, 12, 16, 24 | 6 | Number of tributes in the game |
| `choice` | 1, 2, 3 | 1 | User's choice from the previous turn (1-3) |

## Navigation

- **From**: `01-tribute-setup/index.html` (Begin button)
- **To (next turn)**: `02-game-turn/index.html?...` (loops to self with new choice)
- **To (status screen)**: `03-status-inventory-map/index.html?...` (tap left rail)

## Animation Sequence

1. **AI Processing Phase** (~2-3 seconds)
   - Each tribute appears one by one (200ms intervals)
   - Progress bar fills as tributes are shown
   - "You" appears first with the user's previous choice

2. **Transition** (~300ms)
   - Processing section fades out
   - Narrative, events, and question fade in with staggered timing

3. **Interactive Phase**
   - Event log can be expanded/collapsed
   - User can click any of the 3 options to proceed
   - User can tap the left rail to view detailed stats/inventory/map

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure |
| `styles.css` | CSS styling (includes left rail + stacked bars) |
| `script.js` | JavaScript behavior (animation, navigation, stat values) |
| `README.md` | This documentation |

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/02-game-turn/index.html?type=classic&map=inferno-pit&count=6&choice=1
```

## Links

**Always use explicit filenames** (CloudFront/S3 compatibility):

```html
<!-- ✅ CORRECT -->
<a href="../01-tribute-setup/index.html">Link</a>

<!-- ❌ WRONG -->
<a href="../01-tribute-setup/">Link</a>
```
