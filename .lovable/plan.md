

## Fix: Make `upsertTeamSeasonStats` Throw on Failure

### Problem
`upsertTeamSeasonStats` swallows RPC errors with `warnLog`, so callers (match delete, match edit) report success even when season stats weren't refreshed. This leaves `team_season_stats` permanently out of sync with the `teams` table.

### Fix

**File: `src/services/matches/MatchWriteService.ts`**

Change `upsertTeamSeasonStats` to throw on error instead of swallowing:

```typescript
export const upsertTeamSeasonStats = async (): Promise<void> => {
  const { error } = await supabase.rpc('upsert_team_season_stats');
  if (error) {
    handleDatabaseError(error, 'Failed to refresh season stats');
  }
};
```

- Replace `warnLog` with `handleDatabaseError` (which throws and logs to Sentry)
- Remove the unused `warnLog` import if no other usage remains
- Add `handleDatabaseError` import from `@/utils/errorHandler` if not already present

### Why this is safe
- `useMatchDelete` already wraps the entire operation in try/catch and shows an error toast on failure
- `useMatchUpdate` similarly has try/catch around its stats operations
- `applyMatchResult` in `TeamStatsService.ts` already treats season stats refresh failure as non-fatal with its own separate call — that instance should also be updated to throw for consistency

### Bonus: same pattern in `TeamStatsService.ts`
`applyMatchResult` (line ~63) has the same swallowed error:
```typescript
if (seasonStatsError) {
  errorLog('Failed to refresh season stats:', seasonStatsError);
  // Non-fatal - continue
}
```
Replace with a throw so callers detect the failure. The caller `updateTeamStatsRecord` already has try/catch.

**Two files, ~4 lines each.**

