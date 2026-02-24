

## Fix: "Cannot read properties of null (reading 'wins')" in Career Power Score

### Problem

In `src/utils/career/calculateCareerPowerScore.ts`, the null guard on lines 107-111 uses optional chaining (`?.`), which converts `null` to `undefined`. Since `undefined !== null` is `true` in JavaScript, the guard incorrectly passes when `currentTeamData` is `null`, and line 112 crashes trying to access `.wins` on `null`.

### Root Cause

```typescript
// Lines 107-111 — BUG: this passes when currentTeamData is null
if (
  currentTeamData?.power_score !== null &&  // undefined !== null → true
  currentTeamData?.wins !== null &&          // undefined !== null → true
  currentTeamData?.losses !== null           // undefined !== null → true
) {
  const currentSeasonMatches = (currentTeamData.wins || 0) + ...  // 💥 null.wins
```

### Fix

**File: `src/utils/career/calculateCareerPowerScore.ts`**

Add an explicit null check for `currentTeamData` itself before checking its properties:

```typescript
if (
  currentTeamData &&
  currentTeamData.power_score !== null &&
  currentTeamData.wins !== null &&
  currentTeamData.losses !== null
) {
```

This is a one-line addition that gates entry to the block. Once `currentTeamData` is confirmed non-null, the property checks no longer need optional chaining.

Additionally, in single-team mode (line 84), `.single()` should be changed to `.maybeSingle()` to avoid a PostgREST error when no row exists for a team.

### Files Modified
- `src/utils/career/calculateCareerPowerScore.ts` -- add null guard, change `.single()` to `.maybeSingle()`

### What This Achieves
- Eliminates the "Cannot read properties of null (reading 'wins')" crash
- Teams without current-season data gracefully fall through to use only historical data
- No behavioral change for teams that do have data

