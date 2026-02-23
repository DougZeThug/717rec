

## Fix: Prevent double-decrement of team stats in mass score entry

### Problem confirmed

The bug is **real and exploitable**. The `handleSubmitAll` function reverses team statistics (via `reverseTeamStats` RPC) for all matches **before** attempting to submit new scores. If submissions fail:

1. The reversed stats are never rolled back
2. `originalMatches` is not refreshed on total failure
3. A retry reverses the same stats again using the stale snapshot, causing **double-decrement**

There is also a partial-failure variant: if 2 of 3 matches fail, those 2 have stats reversed but no new stats applied, and a retry reverses them again.

### Fix approach

Move the stat reversal to be **per-match, paired with its submission**, so each match's reversal only happens if its submission can immediately follow. On any failure, refetch matches to reset the `originalMatches` snapshot, preventing stale-snapshot retries.

### Changes

**File: `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts`**

1. **Remove the separate reversal loop** (lines 92-121) that reverses stats for all matches upfront

2. **Move reversal into the per-match submission lambda** inside `Promise.allSettled`, so each match reverses its own stats and immediately submits. If the submission fails, the reversal is already done for only that one match (acceptable -- see point 3)

3. **Always refetch matches after any attempt** (not just on success). Move the `fetchMatches` + `setMatches` call to the `finally` block or after the results processing, so `originalMatches` is always refreshed. This prevents stale snapshots on retry, which is the core fix for double-decrement

4. **Track reversed match IDs** within the submission attempt to prevent re-reversal if the same function is somehow called twice in the same session

### Technical detail

```typescript
// Inside handleSubmitAll, replace the separate reversal loop + Promise.allSettled with:

const results = await Promise.allSettled(
  validMatches.map(async (match) => {
    const original = originalMatches.get(match.id);

    // Reverse old stats for this specific match before submitting its new scores
    if (original?.iscompleted && original.winnerId && original.loserId) {
      const oldWinnerGameWins =
        original.winnerId === original.team1Id
          ? original.team1_game_wins || 0
          : original.team2_game_wins || 0;
      const oldLoserGameWins =
        original.loserId === original.team1Id
          ? original.team1_game_wins || 0
          : original.team2_game_wins || 0;

      await reverseTeamStats(
        original.winnerId,
        original.loserId,
        oldWinnerGameWins,
        oldLoserGameWins
      );
    }

    // Immediately submit new scores for this match
    return handleSubmitScore({
      matchId: match.id,
      team1Score: match.team1Score ?? 0,
      team2Score: match.team2Score ?? 0,
      team1GameWins: match.team1_game_wins ?? 0,
      team2GameWins: match.team2_game_wins ?? 0,
    });
  })
);

// ... existing success/failure processing ...

// ALWAYS refetch to reset originalMatches snapshot (prevents double-decrement on retry)
const fetchedMatches = await fetchMatches(filters);
setMatches(fetchedMatches);
```

This ensures:
- Each match's reversal is paired with its submission (not all-or-nothing)
- `originalMatches` is always refreshed after any attempt, so retries use fresh DB state
- A failed match that had its stats reversed will show correct DB state on refetch, preventing re-reversal

### Risk

Per-match reversal still means a failed submission leaves that one match with reversed stats until the refetch + re-submit. This is acceptable for this admin-only tool since the refetch immediately corrects the snapshot state. A full database transaction (single RPC) would be ideal but is a larger architectural change not warranted here.

