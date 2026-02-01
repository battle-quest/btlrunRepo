# Screen 00: Start Screen

The first screen a user sees when opening btl.run. Designed to feel like the game has **already started** — no friction, no onboarding walls.

## Purpose

- Provide an immediate, immersive "Day 1, Turn 1" experience
- Let users choose a game "type" (Classic, Spicy, Funny) via swipe
- Present the first GM broadcast and three action choices
- Easy entry points: Play solo, Host for friends, or Join with a code

## Key Elements

| Element | Description |
|---------|-------------|
| **Day/Turn Badge** | Shows "Day 1 • Turn 1" at the top — game feels live |
| **Type Selector** | Swipeable carousel: Classic (default), Spicy, Funny |
| **Arena Preview** | Mini-map with type-appropriate flavor text |
| **GM Broadcast** | AI Game Master's opening message + subtext |
| **Action Buttons** | Three wide buttons for tribute's first choice (for shared link flow) |
| **Join Code Input** | Text field + button to join a friend's game |
| **Action Bar** | Play (solo) / Host (friends) |
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

## Game Entry Points

### 1. Action Buttons (Shared Link Flow)

The three wide action buttons (e.g., "Grab supplies", "Run for cover", "Make a friend") are primarily for **users who receive a shared invite link**. When a user clicks one of these:

- Their first turn choice is **pre-selected**
- They go to Tribute Setup with that choice locked in
- When the game starts, their choice is already made

### 2. Play Button (Solo Flow)

Tapping "Play" takes the user to **Tribute Setup (01)** with:

- A pre-populated roster of AI tributes
- **Deferred choice** — user picks their first action after the game begins
- Quick path to start playing immediately

### 3. Host Button (Friends Flow)

Tapping "Host" takes the user to **Host Lobby (015)** with:

- An empty roster (just "You" as host)
- Ability to add AI tributes one at a time
- Invite code to share with friends
- **Deferred choice** for all players

### 4. Join Code Input (Join Flow)

Users can enter a 6-character code to join an existing game:

- Validates the code
- Takes user to **Join Waiting (012)** pre-game lobby
- Shows 3 opening move options (deferred choice)
- User selects their choice and waits for host to start
- Replaces an AI tribute in the host's roster

## Choice Timing Summary

| Entry Method | When Choice is Made |
|--------------|---------------------|
| Tap action button (wide btn) | Immediately (pre-selected) |
| Click shared link with choice | Immediately (pre-selected) |
| Tap "Play" button | After game begins (deferred) |
| Tap "Host" button | After game begins (deferred) |
| Enter join code | After game begins (deferred) |

## Implementation Notes

**For future React conversion:**

1. The `selectedType` state drives the color palette and copy
2. Action buttons route to tribute setup with `choice` param
3. Play button routes to tribute setup with `mode=solo`
4. Host button routes to host lobby (015)
5. Join input validates code and routes to tribute setup with `code` param
6. Replace ad banner stub with real AdMob component

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/00-start-screen/
```

## Links to Other Pages

**Always use explicit filenames** (required for CloudFront/S3 compatibility):

```html
<!-- Play Solo (deferred choice) -->
<a href="../01-tribute-setup/index.html?type=classic&mode=solo">Play</a>

<!-- Host for Friends -->
<a href="../015-host-lobby/index.html?type=classic">Host</a>

<!-- Action button (pre-selected choice) -->
<a href="../01-tribute-setup/index.html?type=classic&choice=1">Grab supplies</a>

<!-- Join with code (deferred choice) -->
<a href="../012-join-waiting/index.html?type=classic&map=inferno-pit&count=6&code=ABC123">Join</a>

<!-- Join with link (pre-selected choice) -->
<a href="../012-join-waiting/index.html?type=classic&map=inferno-pit&count=6&code=ABC123&choice=2">Join (choice 2)</a>

<!-- To shared assets (relative path) -->
<img src="../assets/bq-background-grid-map.png" />
```
