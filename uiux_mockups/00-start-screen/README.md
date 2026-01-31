# Screen 00: Start Screen

The first screen a user sees when opening btl.run. Designed to feel like the game has **already started** — no friction, no onboarding walls.

## Purpose

- Provide an immediate, immersive "Day 1, Turn 1" experience
- Let users choose a game "type" (Classic, Spicy, Funny) via swipe
- Present the first GM broadcast and three action choices
- Mode navigation (Solo, Party, Friends) and settings access

## Key Elements

| Element | Description |
|---------|-------------|
| **Day/Turn Badge** | Shows "Day 1 • Turn 1" at the top — game feels live |
| **Type Selector** | Swipeable carousel: Classic (default), Spicy, Funny |
| **Arena Preview** | Mini-map with type-appropriate flavor text |
| **GM Broadcast** | AI Game Master's opening message + subtext |
| **Action Buttons** | Three wide buttons for tribute's first choice |
| **Mode Bar** | Solo / Party / Friends / Settings (gear icon) |
| **Ad Banner** | 50px stub placeholder for AdMob banner |

## Type Variations

Each type changes:
- Accent color (teal / orange / magenta)
- Arena text
- GM broadcast message
- Action button labels

| Type | Accent | Tone |
|------|--------|------|
| Classic | Teal (#28f2d3) | Serious, strategic |
| Spicy | Orange (#ff7a2f) | Dangerous, intense |
| Funny | Magenta (#ff4dd8) | Humorous, absurd |

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure with semantic markup |
| `styles.css` | All CSS styling (moved from inline) |
| `script.js` | Type selection and dynamic content |
| `README.md` | This documentation |

## Implementation Notes

**For future React conversion:**

1. The `selectedType` state drives the color palette and copy
2. Action buttons route to tribute setup screen
3. Mode buttons navigate to respective flows
4. Replace inline SVG with icon component
5. Replace ad banner stub with real AdMob component

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/00-start-screen/
```

## Links to Other Pages

**Always use explicit filenames** (required for CloudFront/S3 compatibility):

```html
<!-- ✅ CORRECT - explicit filename works everywhere -->
<a href="../01-tribute-setup/index.html">Next Screen</a>

<!-- ❌ WRONG - may not work on CloudFront/S3 -->
<a href="../01-tribute-setup/">Next Screen</a>

<!-- To shared assets (relative path) -->
<img src="../assets/bq-background-grid-map.png" />
```
