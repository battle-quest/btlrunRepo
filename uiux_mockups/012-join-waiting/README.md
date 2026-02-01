# Screen 012: Join Waiting

Pre-game waiting room for players joining an existing game via invite code or shared link. This screen handles the gap between "I've joined" and "the host has started the game."

## Purpose

- Display host's game setup (type, map, player count, join code)
- Handle first-turn choice for joining players:
  - **Deferred choice** (joined via code): Show 3 opening move options
  - **Pre-selected choice** (joined via link): Show locked-in choice
- Display other players who have joined
- Wait for host to start the game

## Key Elements

| Element | Description |
|---------|-------------|
| **Header** | Back button, "Joining Game" title, type badge |
| **Game Info Card** | Displays join code, map name, player count |
| **Choice Section** | Either shows 3 choice buttons (deferred) OR locked-in choice (pre-selected) |
| **Players List** | Shows joined players with ready status |
| **Waiting Indicator** | Spinner + "Waiting for host to start" message |
| **Ad Banner** | 50px stub placeholder |

## Entry Modes

### Mode 1: Join via Code (Deferred Choice)

**Flow:**
1. User enters code on Start Screen
2. Navigates here with `?type=X&map=Y&code=ABC123` (no `choice` param)
3. Sees the 3 opening move options
4. Selects one
5. Waits for host to start

**URL:** `?type=classic&map=inferno-pit&count=6&code=ABC123`

### Mode 2: Join via Link (Pre-Selected Choice)

**Flow:**
1. User clicks shared link with choice pre-selected
2. Navigates here with `?type=X&map=Y&code=ABC123&choice=2`
3. Sees locked-in choice confirmation
4. Waits for host to start

**URL:** `?type=classic&map=inferno-pit&count=6&code=ABC123&choice=2`

## Navigation

| From | To | Trigger |
|------|-----|---------|
| Start Screen (join code) | Here | User enters code + taps "Join" |
| Start Screen (shared link) | Here | User clicks choice link in message |
| Here | Start Screen | Back button (leave game) |
| Here | Game Turn (`02`) | Host starts game (automatic) |

## Choice State

| Mode | Display | User Action | Result |
|------|---------|-------------|--------|
| **Deferred** | 3 wide buttons (uses sprite) | Tap one | Buttons disappear, locked card shows |
| **After Selection** | Locked-in choice card | Tap to change | Returns to 3 buttons, hides players |
| **Pre-selected** | Locked-in choice card | None (read-only) | Not changeable |

### Interaction Flow (Deferred Choice)

1. User sees 3 wide button choices
2. User taps one → buttons disappear
3. Locked choice card appears with "Tap to change" hint
4. Players list becomes visible
5. User can tap locked card → returns to step 1

### Interaction Flow (Pre-Selected Choice)

1. User sees locked choice card (no "Tap to change" hint)
2. Players list visible immediately
3. Choice is read-only (cannot be changed)

## Players List

Shows all players who have joined the game:

| Player Type | Avatar | Badge |
|-------------|--------|-------|
| **You** | 👤 | "You" (green) |
| **Host** | 👑 | "Ready" (accent color) |
| **Other Joined Players** | 👥 | "Ready" or "Joining..." |

## Real-time Updates (Backend Implementation)

In the real app, this screen should:

1. **Poll or WebSocket** to detect:
   - New players joining
   - Players making their choice
   - Host starting the game
2. **Update player count** dynamically
3. **Navigate to game** when host starts

## Differences from Other Screens

| Screen | Purpose | Context | Choice Handling |
|--------|---------|---------|-----------------|
| **012-join-waiting** | Pre-game join lobby | Before game starts | First-turn choice (optional) |
| **025-waiting-for-players** | In-game turn waiting | During game (Long Play) | Turn N choice (submitted) |
| **015-host-lobby** | Host's game setup | Host creating game | No choice yet |
| **01-tribute-setup** | Solo/quick setup | Solo or host setup | No choice yet |

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure |
| `styles.css` | CSS styling |
| `script.js` | Choice handling, player list, URL params |
| `README.md` | This documentation |

## Implementation Notes

**For future React conversion:**

1. Read `type`, `map`, `count`, `timer`, `code`, `choice` from URL params
2. Validate join code via backend API
3. Fetch game state (players, host status)
4. Poll or WebSocket for real-time updates
5. If `choice` param absent, show 3 options and track selection
6. If `choice` param present, show locked-in choice (read-only)
7. Navigate to Turn Hub when host starts the game
8. Replace ad stub with real AdMob component

**Backend Requirements:**

- **Join validation**: Verify code is valid and game hasn't started
- **Add player to roster**: Replace an AI tribute with the joining player
- **Track choice state**: Store player's choice (1-3 or null for deferred)
- **Notify host**: Update host's lobby with new player
- **Game start trigger**: When host taps "Begin", all waiting players navigate to game

## Viewing

```bash
pnpm dev:pwa

# Deferred choice (no choice param)
# Open: http://localhost:5173/uiux/012-join-waiting/index.html?type=classic&map=inferno-pit&count=6&code=ABC123

# Pre-selected choice (choice=2)
# Open: http://localhost:5173/uiux/012-join-waiting/index.html?type=classic&map=inferno-pit&count=6&code=ABC123&choice=2
```

## Navigation Examples

```html
<!-- Join via code (deferred choice) -->
<a href="../012-join-waiting/index.html?type=classic&map=inferno-pit&count=6&code=ABC123">Join</a>

<!-- Join via link (pre-selected choice 2) -->
<a href="../012-join-waiting/index.html?type=classic&map=inferno-pit&count=6&code=ABC123&choice=2">Join</a>

<!-- Back to start -->
<a href="../00-start-screen/index.html">← Back</a>
```
