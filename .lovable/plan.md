

## Fix: Silent match update failure in matchUpdateCore.ts

### Problem
`updateMatchInDatabase` ignores the return value of `updateMatchArray`. When a match ID doesn't exist, `updateMatchArray` returns `[]` without throwing, so the function returns `true` (success). The caller then proceeds to update team standings for a match that was never saved — corrupting data.

### Fix
Capture the return value of `updateMatchArray` and check if any rows were affected. Return `false` if the array is empty, consistent with the pattern already used in `useMatchUpdates.ts`.

### Change (single file)

**`src/components/admin/mass-score-entry/services/matchUpdateCore.ts`** (lines 54-67):

Replace the inner try/catch to capture and validate the return value:

```typescript
try {
  const data = await updateMatchArray(match.id, {
    team1_score: match.team1Score,
    team2_score: match.team2Score,
    team1_game_wins: match.team1_game_wins,
    team2_game_wins: match.team2_game_wins,
    iscompleted: match.iscompleted,
    winner_id: winnerId,
    loser_id: loserId,
  });

  if (!data || data.length === 0) {
    errorLog(`Supabase update returned 0 rows affected for match ${match.id}. Match not saved.`);
    return false;
  }
} catch (error) {
  errorLog(`Error updating match ${match.id}:`, error);
  return false;
}
```

Add `warnLog` to the import from `@/utils/logger` if desired, though `errorLog` is more appropriate here since this represents a real failure.

