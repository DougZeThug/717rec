

## Fix: Add Error Logging for Enrichment Queries in TeamSeasonStatsService

### Problem

`fetchSeasonBreakdown` runs 6 DB queries but only handles errors on query 1. Queries 2–6 silently swallow errors, giving zero production observability (no Sentry, no console output). The UI degrades gracefully already — the missing piece is developer-facing error logging.

### Approach

Add `errorLog()` calls for queries 2–6. These are enrichment queries — they should **not** throw (that would break the entire response when only supplemental data failed). Instead, log the error so it appears in Sentry/console, then continue with empty/default data. This matches the pattern used in `WeeklyRecapService` and `RankingTrendsService`.

### Changes

**File: `src/services/TeamSeasonStatsService.ts`**

After the existing error check for query 1 (line 118), add error logging for queries 2–5:

```typescript
// Log errors from enrichment queries (non-critical — UI degrades gracefully)
if (allTeamSeasonStatsResult.error) {
  errorLog('Failed to fetch all team season stats for division lookup:', allTeamSeasonStatsResult.error);
}
if (currentMatchesResult.error) {
  errorLog('Failed to fetch current matches for season breakdown:', currentMatchesResult.error);
}
if (archivedMatchesResult.error) {
  errorLog('Failed to fetch archived matches for season breakdown:', archivedMatchesResult.error);
}
if (playoffMatchesResult.error) {
  errorLog('Failed to fetch playoff matches for season breakdown:', playoffMatchesResult.error);
}
```

For query 6 (brackets, line 163), capture and log the error:

```typescript
const { data: brackets, error: bracketsError } = await supabase
  .from('brackets')
  .select('id, season_id, divisions(division_weight)')
  .in('id', bracketIds);

if (bracketsError) {
  errorLog('Failed to fetch bracket info for season breakdown:', bracketsError);
}
```

Update the JSDoc on `fetchSeasonBreakdown` to document this:

```typescript
/**
 * Fetch season-by-season breakdown stats for a team.
 * Returns null if no data exists.
 *
 * Query 1 (team_season_stats) is critical and throws on failure.
 * Queries 2-6 are enrichment — errors are logged but not thrown,
 * allowing graceful UI degradation with partial data.
 */
```

### Scope

1 file, logging additions only. No logic or behavior changes.

