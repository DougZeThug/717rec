

# Fix: Sweep Rate Denominator Excludes Playoff Matches

## Problem

The career sweep rate calculation is inflated because playoff matches are counted in the **numerator** (sweep count) but excluded from the **denominator** (total matches).

**Example of the bug:**
- Team has 2 regular matches (1 sweep win, 1 loss) + 1 playoff sweep win
- Current (buggy): sweeps = 2, total = 2 → **100% sweep rate**
- Expected: sweeps = 2, total = 3 → **66.7% sweep rate**

## Root Cause

In both `useTeamTotalsComputed.ts` and `useTeamTotals.ts`, the `totalMatches` calculation only includes regular season wins/losses:

```typescript
const totalMatches = matchStats.career_match_wins + matchStats.career_match_losses;
```

But `calculateSweepRate()` counts sweeps from both regular AND playoff matches.

## Solution

Include playoff wins and losses in the `totalMatches` denominator.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/career/useTeamTotalsComputed.ts` | Add playoff wins/losses to totalMatches |
| `src/hooks/useTeamTotals.ts` | Same fix for backward-compatible function |
| `src/utils/career/__tests__/calculateSweepRate.test.ts` | Add test case for combined regular + playoff matches |

## Implementation Details

### 1. Fix in `useTeamTotalsComputed.ts` (line 53)

**Before:**
```typescript
const totalMatches = matchStats.career_match_wins + matchStats.career_match_losses;
```

**After:**
```typescript
const totalMatches = 
  matchStats.career_match_wins + 
  matchStats.career_match_losses +
  playoffStats.career_playoff_wins +
  playoffStats.career_playoff_losses;
```

### 2. Fix in `useTeamTotals.ts` (line 67)

Same change for the backward-compatible `fetchTeamTotals` function.

### 3. Add Test Case

Add a new test that verifies sweep rate is calculated correctly when combining regular and playoff matches:

```typescript
it('includes playoff matches in sweep rate denominator', () => {
  const regularMatches: MatchData[] = [
    {
      winner_id: 'team-1',
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1_game_wins: 2,
      team2_game_wins: 0, // 1 regular sweep
      ...
    },
    {
      winner_id: 'team-2',
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1_game_wins: 0,
      team2_game_wins: 2, // 1 loss
      ...
    },
  ];
  
  const playoffMatches: PlayoffMatchData[] = [
    {
      winner_id: 'team-1',
      team1_id: 'team-1',
      team2_id: 'team-2',
      team1_score: 2,
      team2_score: 0, // 1 playoff sweep
      ...
    },
  ];

  const result = calculateSweepRate({
    regularMatches,
    playoffMatches,
    teamId: 'team-1',
    totalMatches: 3, // 2 regular + 1 playoff
  });

  expect(result.career_sweeps).toBe(2);  // 1 regular + 1 playoff
  expect(result.career_sweep_rate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
});
```

## Impact

- Sweep rates will decrease for teams with playoff experience (now correctly calculated)
- No changes to the `calculateSweepRate` function itself - the fix is in how `totalMatches` is computed before calling it
- Both the hook and the standalone fetch function will be fixed

