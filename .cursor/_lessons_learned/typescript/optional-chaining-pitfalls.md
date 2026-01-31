---
id: typescript-optional-chaining
category: typescript
severity: medium
keywords: [optional-chaining, undefined, null, defensive, nullish]
related_rules: [20-standards.mdc]
related_skills: []
created: 2026-01-24
---

# Optional Chaining Pitfalls: Masking Real Bugs

## Problem

Overusing optional chaining (`?.`) to silence TypeScript errors without understanding why the type could be undefined:

```typescript
// Agent added ?. to make error go away
const tribute = match.roster?.find(t => t.id === id);
const hp = tribute?.stats?.vitality ?? 0;
```

This masks real issues:
- If `roster` should never be undefined, you've hidden a bug
- If `tribute` is not found, you get 0 HP which might be wrong
- Silent failures make debugging harder

## Root Cause

- Optional chaining is easy to add without thinking
- TypeScript's error messages about "possibly undefined" prompt quick fixes
- Difference between "might legitimately be absent" vs "should always exist" isn't considered
- Nullish coalescing (`??`) defaults can hide problems

## Solution

**Think before using `?.`:**

1. **Should this value exist?** If yes, investigate why TypeScript thinks it might not
2. **Handle the missing case explicitly** if it's legitimately optional

```typescript
// Bad: Silent undefined propagation
const tribute = match.roster?.find(t => t.id === id);
const hp = tribute?.stats?.vitality ?? 0;

// Good: Explicit handling when value should exist
const tribute = match.roster.find(t => t.id === id);
if (!tribute) {
  throw new Error(`Tribute ${id} not found in match ${match.matchId}`);
}
const hp = tribute.stats.vitality; // No ?. needed, tribute is guaranteed

// Good: Explicit handling when value is legitimately optional
const alliance = tribute.allianceId 
  ? alliances.get(tribute.allianceId) 
  : null;
if (alliance) {
  // alliance operations
}
```

**For arrays that might be empty:**

```typescript
// Instead of hiding empty array issues
const firstAlive = roster?.filter(t => t.alive)?.[0]?.name ?? 'Nobody';

// Be explicit about what you're checking
const aliveRoster = roster.filter(t => t.alive);
if (aliveRoster.length === 0) {
  return 'No survivors remain';
}
const firstAlive = aliveRoster[0].name;
```

## Prevention

- [ ] Ask "should this value exist?" before adding `?.`
- [ ] If value should exist, throw an error or log when it doesn't
- [ ] Use early returns with explicit error messages
- [ ] Don't use `?.` just to silence TypeScript
- [ ] Review optional chains in code review for correctness

## References

- TypeScript docs on narrowing
- Related rule: `.cursor/rules/20-standards.mdc`
