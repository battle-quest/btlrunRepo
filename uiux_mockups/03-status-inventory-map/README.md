# Screen 03: Status / Inventory / Map

This is a utility screen reached by tapping the left-rail on `02-game-turn`. It provides a detailed view of the player's current state, gear, and explored territory through **two tabs**.

## Purpose

- **Status Tab**: Show health vitals and inventory in a scrollable layout.
- **Map Tab**: Show the full explored territory map vertically.
- Use a **distinct colored left rail** as the "back" affordance (tap anywhere on it to return to `02`).

> **Important — Client-Side Storage**: Map discovery data is stored locally on the player's device using browser `localStorage`. This enables offline viewing, instant rendering, and reduces server load. See [Map Discovery Storage](#map-discovery-storage) for details.

## Two-Tab Layout

The screen features a segmented tab bar with two views:

### Status Tab (default)
- **Vitals Card** — HP, Stamina, Hunger, Heat (with labeled bars and percentages).
- **Inventory Card** — Scrollable list of items the player holds. The inventory has its own scroll container, similar to the tribute lists on other pages.

### Map Tab
- **Explored Territory** — Full vertical map showing fog-of-war style preview of all explored areas.
- **Legend** — Shows "You", "Explored", and "Unknown" indicators.
- The map scrolls vertically to show the entire explored territory.

## Key Elements

| Element | Description |
|---------|-------------|
| **Back Rail** | Flush-left, vertically centered, theme-colored bar. Tap anywhere to return to `02-game-turn`. |
| **Header** | "Status" title + type badge |
| **Context Pills** | Turn, map name, alive count |
| **Tab Bar** | Segmented control to switch between Status and Map views |
| **Vitals Card** | HP, Stamina, Hunger, Heat — each with a labeled bar + percentage |
| **Inventory Card** | Scrollable grid of items with icon, name, category chip, and meta info |
| **Full Map Card** | Tall, scrollable fog-of-war map showing all explored zones + current position |
| **Ad Banner** | 50px stub placeholder |

## Back Rail

The left edge of the screen has a slim, vertically centered bar in the **theme accent color**:

- **Flush to the left edge** (no gap).
- Taller and more pronounced than the `02` rail so it reads as an intentional "back" control.
- **Tapping anywhere on the rail** navigates back to `02-game-turn` (preserving URL params).
- No labels — users discover it organically (mirroring `02` discovery).

## Vitals

| Stat | Color | Description |
|------|-------|-------------|
| **HP** | Theme accent | Player health |
| **Stamina** | Theme accent | Energy / action capacity |
| **Hunger** | Yellow/amber | Food / sustenance level |
| **Heat** | Pink/red | Environmental heat stress (map-dependent) |

Values are driven by mock logic based on `choice` and `map` URL params.

## Inventory

Example items vary by game type:

| Type | Extra Item |
|------|------------|
| Classic | Base items only |
| Spicy | Improvised bomb (Risk) |
| Funny | Cheese wheel (Food) |

Base items: Small knife, Backpack, Bandage, Water.

The inventory section has its own scrollable container, allowing players to browse through all items while keeping the vitals visible at the top.

## Explored Map

The map tab displays a tile grid that scales based on tribute count. The grid fits within the screen (no scrolling required).

### Map Scaling by Tribute Count

| Tributes | Grid Size | Arena Type |
|----------|-----------|------------|
| 6-8 | 6×8 (48 tiles) | Small Arena — cozy, fast games |
| 10-16 | 8×10 (80 tiles) | Standard Arena — balanced |
| 20-24 | 10×12 (120 tiles) | Grand Arena — epic scale |

Each size has a unique exploration pattern with appropriate landmark density.

### Tile States

| State | Visual | Description |
|-------|--------|-------------|
| **Current** | Bright accent border + pulse | Your current position |
| **Path** | Medium accent fill | Tiles you've walked through |
| **Explored** | Dim accent fill | Tiles visible from your path (adjacent) |
| **Fog** | Dark/black | Unknown territory |

### Terrain Icons

Explored tiles may show terrain indicators:

| Icon | Meaning |
|------|---------|
| 🚩 | Starting point |
| 🏕️ | Camp / safe zone |
| 🏚️ | Ruins / loot |
| 🌲 | Forest |
| 💧 | Water |
| ⛰️ | Mountain |
| ⚠️ | Danger zone (visible in fog) |

### Exploration Logic

1. **Path tiles** — Where the player has actually walked
2. **Explored tiles** — All tiles adjacent to path tiles (8-directional visibility)
3. **Fog tiles** — Everything else remains hidden

This creates a natural "fog of war" effect where your exploration reveals nearby areas.

### Map Discovery Storage

**Map discovery data is stored locally on the client device** using the browser's `localStorage` API. This is a deliberate architectural decision with the following benefits:

| Benefit | Description |
|---------|-------------|
| **Offline Access** | Players can view their explored map even without internet connectivity |
| **Instant Rendering** | No API calls or server round-trips needed to display the map |
| **Reduced Server Load** | Map state doesn't need to be fetched from the backend on every view |
| **Progressive Discovery** | As the player explores, new tiles are revealed and automatically saved |
| **Session Persistence** | Map data survives browser refreshes and app restarts |

#### Storage Key Format

```
btlrun:exploredMap:{gameId}
```

Each game has its own storage key, allowing players to have multiple games with separate map states.

#### Data Structure

The stored JSON contains the complete exploration state:

```json
{
  "tiles": [
    [{ "state": "fog", "terrain": "empty" }, { "state": "explored", "terrain": "forest" }, ...]
  ],
  "path": [
    { "col": 1, "row": 1 },
    { "col": 2, "row": 1 }
  ],
  "current": { "col": 5, "row": 7 }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tiles` | 2D array | Grid of tile objects with `state` and `terrain` properties |
| `path` | array | Ordered list of tiles the player has walked through |
| `current` | object | Player's current position (col, row) |

#### Storage Considerations

- **Size**: Typical map data is ~2-5 KB per game (well within localStorage limits)
- **Clearing**: Data is cleared when the browser's localStorage is cleared
- **Privacy**: Data stays on-device and is never transmitted to servers
- **Fallback**: If localStorage is unavailable, the map generates fresh mock data each session

## URL Parameters

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `type` | classic, spicy, funny | classic | Affects accent colors + inventory items |
| `map` | arena-prime, inferno-pit, chaos-carnival | inferno-pit | Affects heat stat + map label |
| `count` | 6, 8, 12, 16, 24 | 6 | Alive pill display |
| `choice` | 1, 2, 3 | 1 | Drives stat bar values |
| `tab` | status, map | status | Which tab is active on load |

## Navigation

- **From**: `02-game-turn/index.html` (tap the left-rail)
- **To**: `02-game-turn/index.html` (tap the colored left rail on this screen)

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure with tab bar and two tab panels |
| `styles.css` | CSS styling (tabs, scrollable containers, full map) |
| `script.js` | JavaScript behavior (tab switching, localStorage, rendering) |
| `README.md` | This documentation |

## Viewing

```bash
pnpm dev:pwa

# Small arena (6 tributes):
# http://localhost:5173/uiux/03-status-inventory-map/index.html?type=classic&map=arena-prime&count=6&tab=map

# Standard arena (12 tributes):
# http://localhost:5173/uiux/03-status-inventory-map/index.html?type=spicy&map=inferno-pit&count=12&tab=map

# Grand arena (24 tributes):
# http://localhost:5173/uiux/03-status-inventory-map/index.html?type=funny&map=chaos-carnival&count=24&tab=map
```

## Links

**Always use explicit filenames** (CloudFront/S3 compatibility):

```html
<!-- ✅ CORRECT -->
<a href="../02-game-turn/index.html">Back</a>

<!-- ❌ WRONG -->
<a href="../02-game-turn/">Back</a>
```
