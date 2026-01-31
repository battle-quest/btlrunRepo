---
id: frontend-react-key-prop
category: frontend
severity: medium
keywords: [react, key, list, map, reconciliation, performance, warning]
related_rules: []
related_skills: [react-vite-performance]
created: 2026-01-24
---

# React Key Prop: Proper List Rendering

## Problem

React warning in console or unexpected list behavior:

```
Warning: Each child in a list should have a unique "key" prop.
```

Or: Items not updating correctly when list changes, animations breaking, form inputs losing focus.

## Root Cause

- React uses `key` to track which items changed, were added, or removed
- Without keys (or with index keys), React can't efficiently reconcile lists
- Using array index as key causes bugs when list order changes
- Using non-unique keys causes items to share state incorrectly

## Solution

**1. Use unique, stable IDs:**

```tsx
// Good: Each tribute has a unique ID
function RosterList({ roster }: { roster: Tribute[] }) {
  return (
    <ul>
      {roster.map((tribute) => (
        <li key={tribute.id}>{tribute.name}</li>
      ))}
    </ul>
  );
}
```

**2. When you don't have IDs:**

```tsx
// For static lists that never reorder, index is acceptable
const ACTIONS = ['scavenge', 'hide', 'hunt', 'rest'] as const;

function ActionMenu() {
  return (
    <ul>
      {ACTIONS.map((action, index) => (
        // OK because list is static and never reorders
        <li key={index}>{action}</li>
      ))}
    </ul>
  );
}

// For dynamic lists, generate IDs
import { nanoid } from 'nanoid';

function addItem(items: Item[], newItem: Omit<Item, 'id'>): Item[] {
  return [...items, { ...newItem, id: nanoid() }];
}
```

**3. Common anti-patterns:**

```tsx
// BAD: Index as key for dynamic list
{events.map((event, index) => (
  <EventCard key={index} event={event} />  // Breaks when events reorder
))}

// BAD: Non-unique key
{tributes.map((tribute) => (
  <TributeCard key={tribute.name} tribute={tribute} />  // Names might not be unique
))}

// BAD: Random key on every render
{items.map((item) => (
  <Item key={Math.random()} item={item} />  // Creates new component every render!
))}

// BAD: Object as key (stringified to "[object Object]")
{items.map((item) => (
  <Item key={item} item={item} />  // Wrong type, not unique
))}
```

**4. For Battle Quest log entries:**

```tsx
// Event log with sequence numbers
function EventLog({ events }: { events: GameEvent[] }) {
  return (
    <div className="event-log">
      {events.map((event) => (
        <EventEntry 
          key={`${event.matchId}-${event.seq}`}  // Unique within match
          event={event} 
        />
      ))}
    </div>
  );
}

// Tribute roster
function Roster({ tributes }: { tributes: Tribute[] }) {
  return (
    <div className="roster">
      {tributes.map((tribute) => (
        <TributeCard key={tribute.id} tribute={tribute} />
      ))}
    </div>
  );
}
```

**5. Fragment with key:**

```tsx
// When you need to return multiple elements per iteration
function TributeStats({ tributes }: { tributes: Tribute[] }) {
  return (
    <>
      {tributes.map((tribute) => (
        <React.Fragment key={tribute.id}>
          <dt>{tribute.name}</dt>
          <dd>HP: {tribute.hp}</dd>
        </React.Fragment>
      ))}
    </>
  );
}
```

**6. Keys in nested lists:**

```tsx
// Each level needs its own key
function AllianceView({ alliances }: { alliances: Alliance[] }) {
  return (
    <div>
      {alliances.map((alliance) => (
        <div key={alliance.id}>
          <h3>{alliance.name}</h3>
          <ul>
            {alliance.members.map((member) => (
              <li key={member.id}>{member.name}</li>  // Separate key scope
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## Prevention

- [ ] Always use unique, stable identifiers as keys
- [ ] Generate IDs when items are created, not when rendering
- [ ] Only use array index for static lists that never reorder
- [ ] Never use `Math.random()` or `Date.now()` as keys
- [ ] Check console for key warnings during development
- [ ] Keys should be strings or numbers, not objects

## References

- React docs on keys
- Related skill: `.cursor/skills/react-vite-performance/SKILL.md`
