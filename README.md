# btl.run

An **AI-narrated, turn-based survival battle royale** you play in **short, high-impact choices**—built for mobile, designed to be fast to start and easy to come back to.

If you've ever liked the *"Hunger Games"* fantasy of tributes + an arena + a Game Master voice, btl.run is that vibe—adapted into a **clean, modern PWA** with an **AI GM**.

## What btl.run is (and isn't)

- **What it is**: interactive storytelling + strategy + social pressure, resolved in turns. You pick one action; the arena reacts.
- **What it isn't**: a freeform group chat roleplay. btl.run is a game with a UI, turns, state, and resolution.

---

## How to Play

### Starting a Game

Open btl.run and you'll see **Day 1, Turn 1** already in progress. Pick a game type by swiping (Classic, Spicy, or Funny), then choose how to play:

#### Option 1: Play Solo
1. Tap **"Play"**
2. Quick Setup screen opens with 6 AI tributes pre-populated
3. Customize map/settings or tap **"Begin"** to start immediately
4. **Your first move**: Choose when the game begins

#### Option 2: Host for Friends
1. Tap **"Host"**
2. Host Lobby opens with just you in the roster
3. **Add AI tributes** one-at-a-time with **"+ Add AI"** button
4. **Share your invite** by tapping the copy button (creates a shareable message)
5. Wait for friends to join (they replace AI tributes)
6. Tap **"Begin"** when you have 4+ players
7. **Your first move**: Choose when the game begins

#### Option 3: Join a Friend's Game

**Via Code:**
1. Get the 6-character code from your friend
2. Enter it in **"Have a code?"** on the Start screen
3. Tap **"Join"**
4. **Choose your opening move** from 3 options in the waiting room
5. Wait for the host to start

**Via Shared Link:**
1. Friend sends you a message with 3 choice links
2. Tap the option you want (e.g., "Grab supplies")
3. **Your choice is locked in** — ready to go
4. Wait for the host to start

### First Turn Choice Timing

| How You Enter | When You Choose Turn 1 |
|---------------|------------------------|
| Tap "Play" | After game starts (deferred) |
| Tap "Host" | After game starts (deferred) |
| Enter join code | In waiting room (before start) |
| Click choice link | Already chosen (instant) |

### During the Game

Once the match begins:

1. **Read the situation** — AI GM narrates what happened + shows your status (HP, stamina, hunger, gear)
2. **Choose one action** — Pick from 3 options tailored to your current state
3. **Watch it resolve** — All tributes act simultaneously; AI narrates the outcomes
4. **Repeat** until one survivor remains or the arena forces an ending

---

## Game Modes

### Quick Play

- **Pace**: choose actions and resolve turns immediately.
- **Goal**: finish a match in one sitting.

### Long Play

- **Pace**: you submit **one choice per real-world day** (a daily cutoff).
- **Resolution**: the turn resolves when everyone submits, or at cutoff (late/non-responsive players get an AI choice).
- **Goal**: async play with friends + daily recap.

---

## Key Concepts

### Roles

- **Tributes**: players in the arena. A match has a roster of tributes (some may be AI).
- **Game Master**: an **AI or human GM** voice that drives the narrative and prompts.

### What matters (most)

- **Information**: knowing when to fight vs disappear is everything.
- **Resources**: HP, stamina, hunger, and inventory determine what options are actually safe.
- **Positioning**: the map isn't flavor—getting boxed in is how matches end.
- **Social play**: alliances can save you or get you betrayed. Choose carefully.

### Social Play

- **Alliances**: Can be formed through in-game events (`024`). Accepting an alliance unlocks private messaging and sharing of resources.
- **Messaging**: Use the **Alliance Message (`032`)** screen to coordinate with allies.
- **Betrayal**: Alliances are not binding. You can choose to betray an ally at any time during an event or via the messaging interface options.

### Inviting Friends

When hosting a game, you receive a **temporary invite code** (6 characters).

- **Share the code** — friends enter it on the Start screen to join
- **Share choice links** — friends tap a link to join with their first move pre-selected

The code expires when the game begins.

---

## "Hunger Games text game" inspiration (kid-friendly framing)

You can explain btl.run as:

- A **text survival game**, but inside a polished mobile UI.
- A **Game Master-led** elimination story where players make choices one message at a time.
- Like D&D / Mafia / Werewolf energy, but without dice and without long rulebooks.

### Content / parental note

btl.run is designed to support imaginative, drama-forward play. Tone depends on the selected Type and the GM configuration.

---

## Example GM prompts (useful patterns)

The "GM" style is: **one prompt at a time**, 2–3 options, consequences that carry forward.

### Opening / Day 1 starters

1. **You wake up in an unfamiliar place.** Do you:
   - A) Explore
   - B) Hide and observe
   - C) Call out for others
2. **You see two other tributes nearby.** Do you:
   - A) Approach peacefully
   - B) Avoid them
   - C) Follow from a distance
3. **You find a backpack on the ground.** Do you:
   - A) Take it
   - B) Inspect it first
   - C) Leave it (could be a trap)

### Social / alliance starters

4. **You can form ONE alliance right now. Who do you choose and why?**
5. **Someone offers supplies later if you protect them now. Do you accept? (Yes / No)**
6. **A rumor spreads that one tribute is lying about supplies. Do you:**
   - A) Confront them
   - B) Ignore it
   - C) Spread it further

### Strategy prompts (low-violence, high thinking)

7. **You can only carry ONE item. Choose:**
   - A) Food
   - B) Water
   - C) Map
   - D) Tool
8. **Night is coming. Do you:**
   - A) Build shelter
   - B) Keep moving
   - C) Stay awake and watch

### Twist prompts (use sparingly)

9. **An announcement says: "The environment will change in 10 minutes." Do you prepare for:**
   - A) Weather
   - B) Scarcity
   - C) Social chaos
10. **You may save ONE other tribute from elimination. Who do you choose?**

### GM move (how to respond)

When players answer, reinforce continuity:

> "Your choice changes the game…"  
> "Others notice what you did."  
> "This will matter later."

---

## Screens

The game is designed around a small set of screens:

- **Start (00)**: feels like Day 1 already started; swipe Type; (optional) tap a move; or Play/Host/Join with a code.
- **Tribute Setup (01)**: pick map, tribute count, roster; tap Begin (for solo/quick play).
- **Join Waiting (012)**: pre-game lobby for players joining via code/link; choose first move if deferred; wait for host to start.
- **Host Lobby (015)**: empty roster + invite code; add AI one-at-a-time or wait for humans; tap Begin when ready.
- **Join Profile (011)**: Identity customization (Avatar, Name, Tagline) before joining a lobby.
- **Game Turn (02)**: AI tributes "choose", the turn resolves into narrative + key events, then you pick your next move.
- **Tribute Details (031)**: Inspect another tribute's status, HP estimates, and known history.
- **Battle Encounter (021)**: Special turn resolution for combat (shows opponent + choices).
- **Event Encounter (022)**: Special turn resolution for discoveries/traps (shows event + choices).
- **Scout Encounter (023)**: Exploration resolution with clickable map card.
- **Alliance Encounter (024)**: Social interaction resolution (proposals, betrayals).
- **Waiting for Players (025)**: (Long Play) you've submitted; see who's waiting; cutoff timer; notifications prompt.
- **Eliminated (04)**: Game over screen with cause of death, shareable story, and replay options.
- **Victory (05)**: Win screen with stats, shareable story, and host-next-game flow.
- **Story Log (06)**: Scrollable history of the full narrative (AI prose + events).
- **Shared Story (07)**: Read-only view for viral sharing; includes "Start Your Own" CTA.
- **Spectator (08)**: Read-only live feed for watching games in progress.
- **Status / Inventory / Map (03)**: Accessed via the **Left Rail**. View vitals, gear, map, and tribute roster.
- **Tribute Details (031)**: Inspect another tribute's stats and history.
- **Alliance Message (032)**: Private chat with allies.

### Controls

- **Left Rail (Status Bar)**: Tap the colored bars on the left edge of the screen at any time to open the **Status/Inventory/Map** overlay. This is your dashboard for health, supplies, and navigation.
- **Back Button**: Navigate up the stack (e.g., from Status back to Game Turn).

---

## FAQ

### Is the narration "the rules"?

No. Narration is presentation. The underlying engine determines what can happen, what it costs, and what consequences persist.

### Can I get unlucky?

Yes—but the game is designed so that **good choices reduce your exposure to bad variance**. Risk is a tool; don't let the arena choose for you.
