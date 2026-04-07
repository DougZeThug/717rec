

## Fix: Remove non-null assertions in feasibility.ts

### What's wrong

Two `teams.find(...)!` calls use the forbidden `!` non-null assertion (JS-0339). While the team will always be found (since `atRiskTeams` comes from the same `teams` array), the linter rightfully flags this.

### Fix

**File:** `src/utils/scheduling/greedy/feasibility.ts` (lines 39 and 57)

Replace both instances of:
```ts
const team = teams.find((t) => t.id === teamId)!;
```

With:
```ts
const team = teams.find((t) => t.id === teamId);
if (!team) continue;
```

### Scope

One file, two lines changed. No logic changes — teams will always be found, but the guard clause satisfies the linter and adds defensive safety.

