

## Fix: Widen rematch deprioritization guard in findBestOpponent

### What's wrong

In the `findBestOpponent` sort (line 345), the "prefer fresh opponents" tiebreaker only activates at `relaxationLevel >= 2`. But the `rematchAllowedFor` mechanism allows specific teams to rematch at any relaxation level. When a team has both fresh and rematch opponents available at level 0 or 1, the sort doesn't distinguish them, so a rematch could be picked over a fresh opponent.

### Fix

**File:** `src/utils/scheduling/greedyBackToBackScheduler.ts` (line 345)

Replace:
```ts
if (relaxationLevel >= 2) {
```

With:
```ts
if (relaxationLevel >= 2 || (rematchAllowedFor && rematchAllowedFor.size > 0)) {
```

This makes the code match its own comment on line 329: "prefer fresh opponents even when rematches allowed."

### Scope

One file, one line. No behavioral change when `rematchAllowedFor` is empty or undefined.

