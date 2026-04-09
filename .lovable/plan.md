

## Fix: Reorder Match Deletion to Delete Before Reversing Stats

### Problem

All three match deletion paths (`useMatchDelete`, `EditScoresSection`, `MassScoreEntryTool`) decrement `teams.wins/losses` via `reverseTeamStats` BEFORE calling `deleteMatch`. If the delete fails (FK constraints, network error, etc.), career totals are permanently corrupted with no recovery — the match still exists but the stats have already been decremented.

### Why This Is Real

- `reverseTeamStats` calls an RPC that directly decrements `teams.wins/losses` — these are denormalized career totals with no recalculation function
- `upsertTeamSeasonStats` only fixes `team_season_stats`, NOT `teams.wins/losses`
- If `deleteMatch` fails after reversal, there is zero recovery path
- The `statReversalUtils.ts` wrapper also calls `upsertTeamSeasonStats()` redundantly before deletion (recalculating season stats while the match still exists)

### Fix

In all three files, move `deleteMatch()` BEFORE `reverseTeamStats()`. Also remove the redundant `upsertTeamSeasonStats()` call inside `statReversalUtils.ts` for the delete path (it's called again after deletion anyway, and calling it before deletion is wrong — the match still exists).

### Changes

**1. `src/hooks/matches/updates/useMatchDelete.ts`**

Reorder: call `deleteMatch` first, then `reverseTeamStats`, then `upsertTeamSeasonStats`.

```typescript
// Delete the match FIRST
await deleteMatch(deleteMatchId);

// If match was completed, reverse the team stats AFTER successful deletion
if (matchToDelete.iscompleted && matchToDelete.winnerId && matchToDelete.loserId) {
  // ... compute game wins ...
  await reverseTeamStats(winnerId, loserId, winnerGameWins, loserGameWins);
}

// Refresh season stats after both deletion and reversal
await upsertTeamSeasonStats();
```

**2. `src/components/admin/EditScoresSection.tsx`** — Same reorder.

**3. `src/components/admin/MassScoreEntryTool.tsx`** — Same reorder.

**4. `src/hooks/matches/updates/utils/statReversalUtils.ts`** — Remove the `upsertTeamSeasonStats()` call from inside `reverseTeamStats`. Every caller already calls it separately after deletion. Calling it inside the reversal (before the match is deleted) recalculates season stats with the match still present, which is incorrect for the delete flow.

### Scope

4 files. Logic reordering only — no new functions or behavior changes. Stats are still reversed and season stats are still refreshed; the only change is that deletion is confirmed before modifying career totals.

