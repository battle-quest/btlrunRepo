---
name: game-state-management
description: Implement event-sourced game state with snapshots, reducers, idempotency, and deterministic simulation. Use when building the game engine, handling match state transitions, or implementing event replay.
---

# Game State Management for btl.run

## Core Architecture

btl.run uses **event sourcing** with **snapshots**:

1. **Events** are append-only and immutable (source of truth)
2. **Snapshots** are derived state for fast reads
3. **Reducers** are pure functions that apply events to state
4. **Simulation** is deterministic and reproducible

## State Schema

```typescript
// For TypeScript: AskAi_KVS/shared/schemas/index.ts
// Or for Rust: backend/shared/src/lib.rs

export interface GameState {
  matchId: string;
  createdAt: number;
  mode: 'quick' | 'standard' | 'long';
  rules: MatchRules;
  theme: Theme;
  status: 'lobby' | 'active' | 'ended';
  day: number;
  turn: number;
  maxDays: number;
  roster: Tribute[];
  alliances: Alliance[];
  pendingActions: Record<string, TributeAction>;
  logSeq: number;
  memoryBlob: string;
  version: number; // For optimistic locking
}

export interface Tribute {
  id: string;
  type: 'human' | 'ai' | 'hybrid';
  name: string;
  stats: {
    vitality: number;
    wits: number;
    combat: number;
    stealth: number;
    charm: number;
  };
  hp: number;
  maxHp: number;
  alive: boolean;
  inventory: Item[];
  allianceId: string | null;
  statusEffects: StatusEffect[];
  persona: Persona;
}

export interface GameEvent {
  seq: number;
  timestamp: number;
  type: string;
  data: unknown;
}
```

## Pure Reducer Pattern

**Reducers must be pure functions for deterministic replay:**

```typescript
// Game logic (create when implementing game engine)
// Could be in: backend/shared/src/ (Rust) or AskAi_KVS/shared/ (TypeScript)

export function applyEvent(state: MatchState, event: GameEvent): MatchState {
  switch (event.type) {
    case 'MATCH_CREATED':
      return handleMatchCreated(state, event.data);
    
    case 'TRIBUTE_JOINED':
      return handleTributeJoined(state, event.data);
    
    case 'MATCH_STARTED':
      return { ...state, status: 'active', turn: 1 };
    
    case 'TRIBUTE_ACTION_SUBMITTED':
      return handleActionSubmitted(state, event.data);
    
    case 'TURN_RESOLVED':
      return handleTurnResolved(state, event.data);
    
    case 'TRIBUTE_DIED':
      return handleTributeDied(state, event.data);
    
    case 'MATCH_ENDED':
      return { ...state, status: 'ended' };
    
    default:
      console.warn({ unknownEventType: event.type });
      return state;
  }
}

// Pure helper functions
function handleTributeDied(state: MatchState, data: any): MatchState {
  return {
    ...state,
    roster: state.roster.map(t =>
      t.id === data.tributeId
        ? { ...t, alive: false, hp: 0 }
        : t
    ),
  };
}

function handleActionSubmitted(state: MatchState, data: any): MatchState {
  return {
    ...state,
    pendingActions: {
      ...state.pendingActions,
      [data.tributeId]: data.action,
    },
  };
}
```

## Event Sourcing

### Append Event

```typescript
async function appendEvent(matchId: string, eventType: string, data: unknown): Promise<number> {
  // Get current sequence
  const state = await getMatchState(matchId);
  const seq = state.logSeq + 1;
  
  const event: GameEvent = {
    seq,
    timestamp: Date.now(),
    type: eventType,
    data,
  };
  
  // Append to log
  await appendEventLog(matchId, seq, event);
  
  // Apply to snapshot
  const newState = applyEvent(state, event);
  newState.logSeq = seq;
  newState.version = state.version + 1;
  
  // Save snapshot
  await updateMatchState(matchId, newState, state.version);
  
  return seq;
}
```

### Replay Events

```typescript
async function replayEvents(matchId: string, fromSeq = 0): Promise<MatchState> {
  const events = await getAllEventLogs(matchId);
  
  let state = createEmptyMatchState(matchId);
  
  for (const event of events.filter(e => e.seq > fromSeq)) {
    state = applyEvent(state, event);
  }
  
  return state;
}
```

## Idempotency

**Prevent duplicate event processing:**

```typescript
async function submitActionIdempotent(
  matchId: string,
  tributeId: string,
  action: TributeAction,
  idempotencyKey: string
): Promise<void> {
  // Check if already processed
  const existing = await getIdempotencyRecord(matchId, idempotencyKey);
  if (existing) {
    return; // Already processed, return success
  }
  
  // Process action
  await appendEvent(matchId, 'TRIBUTE_ACTION_SUBMITTED', { tributeId, action });
  
  // Store idempotency record
  await storeIdempotencyRecord(matchId, idempotencyKey, {
    tributeId,
    action,
    processedAt: Date.now(),
  });
}

async function getIdempotencyRecord(matchId: string, key: string) {
  return await getKV(`idem#${matchId}`, key);
}

async function storeIdempotencyRecord(matchId: string, key: string, data: any) {
  await putKV(`idem#${matchId}`, key, data, { ttl: 86400 }); // 24h TTL
}
```

## Deterministic Simulation

**Use seedable PRNG for reproducible outcomes:**

```typescript
// Random number generation for deterministic game simulation

class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  // LCG algorithm for deterministic randomness
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 2**32;
    return this.seed / 2**32;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Usage in simulation
function simulateTurn(state: MatchState, seed: number): TurnOutcome {
  const rng = new SeededRandom(seed);
  
  // Deterministic outcomes based on seed
  const outcome = {
    casualties: determineCasualties(state, rng),
    encounters: generateEncounters(state, rng),
    // ...
  };
  
  return outcome;
}

// Seed based on match + turn for determinism
const seed = hashString(`${matchId}:${turn}`);
```

## State Transitions

**Implement state machine for match lifecycle:**

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'lobby': ['active', 'ended'], // Can cancel from lobby
  'active': ['ended'],
  'ended': [], // Terminal state
};

function canTransition(currentStatus: string, nextStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(nextStatus) || false;
}

async function transitionMatchStatus(
  matchId: string,
  nextStatus: 'lobby' | 'active' | 'ended'
): Promise<void> {
  const state = await getMatchState(matchId);
  
  if (!canTransition(state.status, nextStatus)) {
    throw new Error(`Invalid transition: ${state.status} -> ${nextStatus}`);
  }
  
  if (nextStatus === 'active') {
    await appendEvent(matchId, 'MATCH_STARTED', {});
  } else if (nextStatus === 'ended') {
    await appendEvent(matchId, 'MATCH_ENDED', { reason: 'completed' });
  }
}
```

## Concurrency Control

**Handle simultaneous state updates:**

```typescript
async function advanceTurn(matchId: string): Promise<void> {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Read current state
      const state = await getMatchState(matchId);
      
      if (state.status !== 'active') {
        throw new Error('Match not active');
      }
      
      // Simulate turn
      const seed = hashString(`${matchId}:${state.turn}`);
      const outcome = simulateTurn(state, seed);
      
      // Apply events
      await appendEvent(matchId, 'TURN_RESOLVED', outcome);
      
      // Check victory condition
      const aliveTributes = state.roster.filter(t => t.alive);
      if (aliveTributes.length === 1) {
        await appendEvent(matchId, 'MATCH_ENDED', {
          reason: 'victory',
          winner: aliveTributes[0].id,
        });
      }
      
      return; // Success
    } catch (error) {
      if (error.message.includes('Concurrent modification') && attempt < maxRetries - 1) {
        // Retry with exponential backoff
        await sleep(Math.pow(2, attempt) * 100);
        continue;
      }
      throw error;
    }
  }
}
```

## Snapshot Strategy

**Rebuild from events periodically to prevent drift:**

```typescript
async function rebuildSnapshot(matchId: string): Promise<void> {
  console.log({ action: 'rebuilding_snapshot', matchId });
  
  // Replay all events
  const freshState = await replayEvents(matchId);
  
  // Save rebuilt snapshot
  await updateMatchState(matchId, freshState);
  
  console.log({ action: 'snapshot_rebuilt', matchId, logSeq: freshState.logSeq });
}

// Run periodically or when drift suspected
if (state.logSeq % 100 === 0) {
  await rebuildSnapshot(matchId);
}
```

## Performance Optimization

**Avoid loading full state when not needed:**

```typescript
// Just check if match exists
async function matchExists(matchId: string): Promise<boolean> {
  const result = await getKV(`match#${matchId}`, 'state');
  return result !== null;
}

// Get only roster (for display)
async function getMatchRoster(matchId: string): Promise<Tribute[]> {
  const state = await getMatchState(matchId);
  return state.roster;
}

// Lightweight status check
async function getMatchStatus(matchId: string): Promise<string> {
  const state = await getMatchState(matchId);
  return state.status;
}
```

## Testing Reducers

**Pure functions are easy to test:**

```typescript
describe('applyEvent', () => {
  it('should kill tribute on TRIBUTE_DIED event', () => {
    const state: MatchState = {
      // ... initial state
      roster: [
        { id: 't1', name: 'Alice', alive: true, hp: 10 },
        { id: 't2', name: 'Bob', alive: true, hp: 8 },
      ],
    };
    
    const event: GameEvent = {
      seq: 5,
      timestamp: Date.now(),
      type: 'TRIBUTE_DIED',
      data: { tributeId: 't1' },
    };
    
    const newState = applyEvent(state, event);
    
    expect(newState.roster[0].alive).toBe(false);
    expect(newState.roster[0].hp).toBe(0);
    expect(newState.roster[1].alive).toBe(true); // Others unaffected
  });
});
```

## Checklist

- [ ] Reducers are pure functions (no side effects)
- [ ] Events are append-only and immutable
- [ ] Snapshots rebuilt from events periodically
- [ ] Idempotency keys prevent duplicate processing
- [ ] Concurrency conflicts handled with retries
- [ ] PRNG seeded for deterministic simulation
- [ ] State transitions validated against state machine
- [ ] Version field used for optimistic locking
