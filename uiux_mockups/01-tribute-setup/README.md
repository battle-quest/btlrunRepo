# Screen 01: Tribute Setup

Quick setup screen that lets users configure and start a game in **2 taps**. All options are prepopulated with sensible defaults. Supports multiple entry flows with different choice timing.

## Purpose

- Receive game type from previous screen (via `?type=` URL param)
- Handle different entry modes: solo play, join with code, or action button choice
- Let user choose a map pack (optional)
- Let user choose tribute count (optional)
- Show prepopulated AI tribute roster
- Generate and display invite code for human players to join
- Single "Begin" button to start the game

## Entry Modes

This screen handles three different entry flows:

### 1. Solo Mode (`?mode=solo`)
- User tapped "Play" on Start Screen
- AI tributes pre-populated based on count selection
- **Deferred choice** — user picks their first action after game begins
- URL: `?type=classic&mode=solo`

### 2. Action Button Mode (`?choice=N`)
- User tapped one of the three action buttons on Start Screen
- Or user clicked a shared link with a choice pre-selected
- AI tributes pre-populated
- **Choice is locked in** — no need to choose after game begins
- URL: `?type=classic&choice=2`

### 3. Join Mode (`?code=XXXXXX`)
- User entered an invite code on Start Screen
- Joins an existing game session
- **Deferred choice** — user picks after game begins
- Replaces an AI tribute in the host's roster
- URL: `?type=classic&code=ABC123`

## Key Elements

| Element | Description |
|---------|-------------|
| **Header** | Back button, "Quick Setup" title, type badge |
| **Map Pack** | Swipeable cards with map previews; default selected based on type |
| **Tribute Count** | Buttons: 6 (default), 8, 12, 16, 24 |
| **Tribute Response Time** | Time limit for tribute responses: 30s (default), 1m, 5m, 30m, 1hr, 1d |
| **Roster** | Scrollable list of tributes with avatar, name, persona |
| **Invite Code** | Temporary 6-character code for inviting human players |
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

## Response Timer

The response timer sets how long each tribute has to submit their choice before AI auto-selects for them.

| Timer | Use Case | Behavior |
|-------|----------|----------|
| **30s** | Quick Play, real-time action | Fast-paced, keeps pressure high |
| **1m** | Standard Quick Play | Balanced, time to think |
| **5m** | Relaxed Quick Play | Casual pace, no rush |
| **30m** | Semi-async play | Check in periodically |
| **1hr** | Slow-paced sessions | Time to strategize between turns |
| **1d** | Long Play / Async | Daily turns, perfect for async with friends |

### How It Works

1. **Quick Play (30s–5m)**: When a turn begins, a countdown timer appears. If a tribute doesn't submit before time expires, AI chooses based on their persona/strategy profile.

2. **Extended Play (30m–1hr)**: Suitable for games where players may step away. Push notifications remind players when time is running low.

3. **Long Play (1d)**: Designed for async play over days. Each player submits once per day; the turn resolves at cutoff (e.g., 9 PM). Late players get AI auto-choices.

### Backend Implementation Notes

- Store `responseTimer` in game config (seconds, 0 = unlimited)
- For Quick Play: start countdown when turn begins, auto-resolve on timeout
- For Long Play: use EventBridge scheduled rule for daily cutoff
- AI auto-choice should match tribute's established playstyle
- Notify players when their time is running low (push notification at 50% and 10%)

## Invite Code

The invite code allows the game host to invite human players to join and replace AI tributes.

| Feature | Description |
|---------|-------------|
| **Code Format** | 6 uppercase alphanumeric characters (excludes confusing chars: 0, O, I, 1, L) |
| **Generation** | New code generated each time the setup screen loads |
| **Validity** | Code expires when the game begins |
| **Copy Button** | One-tap copy to clipboard with visual feedback |
| **Join Flow** | Friends enter code on their device to join and replace an AI tribute |

### How It Works

1. Host opens Tribute Setup screen → invite code auto-generated
2. Host shares code with friends (copy button → paste in chat/text)
3. Friends enter code on their device (via Join Game screen)
4. When a friend joins, they replace one AI tribute in the roster
5. Code becomes invalid once the game begins

## User Flow

1. User arrives via one of the entry modes above
2. Defaults already selected (map + 6 tributes + AI roster)
3. User can customize OR just tap "Begin"
4. **Minimum friction: 2 taps from app open to gameplay**

## Choice Timing

| Entry Method | `choice` Param | When User Chooses |
|--------------|----------------|-------------------|
| "Play" button | None | After game begins (Turn 1 prompt) |
| Action button | `choice=1,2,3` | Already chosen (locked in) |
| Shared link with choice | `choice=1,2,3` | Already chosen (locked in) |
| Join via code | None | After game begins (Turn 1 prompt) |

### Deferred Choice Flow

When a user has a **deferred choice** (no `choice` param):

1. Game begins, user is taken to Turn Hub
2. Turn 1 displays: "You have 30 seconds. What do you do?"
3. User sees the same three options from the Start Screen
4. User selects their action
5. Game continues normally

### Pre-Selected Choice Flow

When a user has a **pre-selected choice** (`choice=1,2,3`):

1. Game begins, user is taken to Turn Hub
2. Turn 1 displays: "You chose [action]. Here's what happened..."
3. AI resolves the turn with user's pre-selected action
4. Game continues to Turn 2

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure with semantic markup |
| `styles.css` | All CSS styling |
| `script.js` | Type detection, roster rendering, selection handling |
| `README.md` | This documentation |

## Implementation Notes

**For future React conversion:**

1. Read `type`, `mode`, `choice`, `code` from URL params
2. Store choice in app state (null for deferred, 1-3 for pre-selected)
3. Fetch AI tribute names/personas from config or AI
4. Generate invite code via backend API (store in KVS with TTL)
5. Poll for joined players and update roster in real-time
6. "Begin" creates game in backend and routes to Turn Hub
7. Pass choice state to Turn Hub for proper handling
8. Replace ad stub with real AdMob component

**Invite Code Backend Requirements:**

- Generate unique code via API (collision-resistant)
- Store code → game session mapping in KVS with TTL (e.g., 30 min)
- Validate code on join attempt
- Update roster when player joins (replace AI tribute)
- Invalidate code when game starts
- Track each player's choice state (null or 1-3)

**Choice State Backend Requirements:**

- Store player's choice in game state: `{ choice: 1 | 2 | 3 | null }`
- When game begins, check each player's choice state
- Players with `choice: null` need Turn 1 prompt
- Players with `choice: N` skip prompt, action already set

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/01-tribute-setup/index.html?type=classic
# Try: ?type=spicy or ?type=funny
# Try: ?type=classic&mode=solo (deferred choice)
# Try: ?type=classic&choice=2 (pre-selected choice)
```

## Navigation

```html
<!-- Solo play (deferred choice) -->
<a href="../01-tribute-setup/index.html?type=classic&mode=solo">Play</a>

<!-- Action button (pre-selected choice) -->
<a href="../01-tribute-setup/index.html?type=classic&choice=1">Grab supplies</a>

<!-- Join via code -->
<a href="../01-tribute-setup/index.html?type=classic&code=ABC123">Join</a>

<!-- Back to start screen -->
<a href="../00-start-screen/index.html">← Back</a>

<!-- To waiting screen -->
<a href="../025-waiting-for-players/index.html?type=classic">Begin</a>
```
