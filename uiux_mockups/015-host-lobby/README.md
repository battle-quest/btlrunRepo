# Screen 015: Host Lobby

Host-initiated game setup for playing with friends. Unlike the standard Tribute Setup (01), this screen starts with an **empty roster** and lets the host build the game one player at a time.

## Purpose

- Host a multiplayer game for friends
- Share invite code so friends can join
- Add AI tributes one at a time to fill empty slots
- Wait for human players to join via code or shared link
- Configure game settings (map, response timer)

## Key Elements

| Element | Description |
|---------|-------------|
| **Header** | Back button, "Host Lobby" title, type badge |
| **Invite Card** | Prominent invite code display with copy button |
| **Game Settings** | Collapsible section with map and timer options |
| **Player Roster** | List of players (host + AI + joined friends) |
| **Add AI Button** | Button to add one AI tribute at a time |
| **Begin Button** | Disabled until minimum players reached (4+) |
| **Ad Banner** | 50px stub placeholder |

## User Flow

1. User taps "Host" on Start Screen → navigates here with `?type=X`
2. Roster starts with just "You" (the host)
3. Host can:
   - **Add AI tributes** one at a time with the "+ Add AI" button
   - **Share the invite code** by tapping copy (generates shareable message with links)
   - **Wait for friends** to join via code or links
   - **Adjust settings** by expanding the Game Settings section
4. "Begin" button enables when roster has 4+ players
5. Tapping "Begin" starts the game

## Invite Code Flow

When host taps the copy button, a shareable message is generated with:

1. A theme-appropriate scenario introduction
2. Three choice links (one for each opening action)
3. The raw invite code as fallback

Example message:

```
🎮 Join my btl.run game!

You wake to distant horns and a glowing perimeter.

Choose your opening move:

🎯 Grab supplies
Risk the center for better gear
https://btl.run/join?code=ABC123&type=classic&choice=1

🏃 Run for cover
Survive now, loot later
https://btl.run/join?code=ABC123&type=classic&choice=2

🤝 Make a friend
Wave like you totally won't betray them
https://btl.run/join?code=ABC123&type=classic&choice=3

Or enter code: ABC123
```

### When Friends Click a Link

Friends who click one of the three choice links have their **first turn choice pre-selected**. When the game begins, their choice is already locked in.

### When Friends Enter Code Manually

Friends who enter the code manually will be prompted to choose their first action **after the game begins** (deferred choice).

## Game Type Variations

Type is passed via URL: `?type=classic|spicy|funny`

| Type | AI Tribute Style |
|------|------------------|
| Classic | Tactical warriors (Steel Vanguard, Silent Arrow...) |
| Spicy | Ruthless killers (Bone Crusher, Backstabber...) |
| Funny | Absurd characters (Sir Trips-a-Lot, Duck Commander...) |

## Player Limits

| Setting | Value |
|---------|-------|
| Minimum players to start | 4 |
| Maximum players | 24 |

## Differences from Tribute Setup (01)

| Feature | Tribute Setup (01) | Host Lobby (015) |
|---------|-------------------|------------------|
| Initial roster | Pre-filled with AI | Empty (just host) |
| AI tributes | All added at once | Added one at a time |
| Invite code | Secondary element | Prominent display |
| Target use case | Quick solo play | Multiplayer with friends |
| Begin button | Always enabled | Requires 4+ players |

## Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure with semantic markup |
| `styles.css` | All CSS styling |
| `script.js` | Invite code, roster management, settings |
| `README.md` | This documentation |

## Implementation Notes

**For future React conversion:**

1. Read `type` from app state or URL params
2. Generate invite code via backend API (store in KVS with TTL)
3. Poll for joined players and update roster in real-time
4. Use WebSocket or polling to detect when friends join
5. "Begin" creates game in backend and routes to Turn Hub
6. Notify all joined players when game starts

**Invite Code Backend Requirements:**

- Generate unique code via API (collision-resistant)
- Store code → game session mapping in KVS with TTL (e.g., 30 min)
- Validate code on join attempt
- Update roster when player joins
- Invalidate code when game starts
- Track which choice each player made (if via link) or null (if via code)

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/015-host-lobby/index.html?type=classic
# Try: ?type=spicy or ?type=funny
```

## Navigation

```html
<!-- From 00-start-screen to here -->
<a href="../015-host-lobby/index.html?type=classic">Host</a>

<!-- Back to start screen -->
<a href="../00-start-screen/index.html">← Back</a>

<!-- To waiting screen when game starts -->
<a href="../025-waiting-for-players/index.html?type=classic&mode=host">Begin</a>
```
