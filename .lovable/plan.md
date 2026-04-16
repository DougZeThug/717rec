

## Plan: Fix Tied Matches Counted as Losses in Streak Calculation

### The problem

In `calculateStreak.ts`, tied matches (where `winnerId` is `undefined` after transformation) slip through the `winnerId !== null` filter because `undefined !== null` is `true` in JavaScript. These ties then get counted as losses.

### The fix

**1 file** — `src/utils/rankingUtils/calculateStreak.ts` (line 15)

Change strict inequality to loose inequality:

```diff
- match.winnerId !== null &&
+ match.winnerId != null &&
```

This filters out both `null` and `undefined`, matching the `Match` type where `winnerId?: string` (i.e. `string | undefined`).

**1 file** — `src/utils/rankingUtils/__tests__/calculateStreak.test.ts`

Add a test case confirming ties with `winnerId: undefined` are excluded from streak calculation.

### What changes

- **1 source file** — one-character fix (`!==` → `!=`)
- **1 test file** — add tie-exclusion test
- **0 migrations**

