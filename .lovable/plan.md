

## Add Server-Side Filters to Bulk Career Fetch

### Assessment

This issue is **technically valid but low-impact in practice**. The function is only ever called from `computeAllTeamsTotals`, which always passes ALL team IDs from `useTeamsQuery`. So the unfiltered queries already return exactly the data needed.

That said, adding `.in('team_id', teamIds)` filters on the tables that support it is cheap defensive coding — it protects against future misuse and marginally reduces payload if the function is ever called with a subset.

### What changes

**File: `src/services/career/CareerBulkFetchService.ts`**

Add `.in()` filters to the 3 queries that have a direct `team_id` column:

1. **`team_season_stats`** query — add `.in('team_id', teamIds)`
2. **`team_details_archive`** query — add `.in('team_id', teamIds)`
3. **`teams`** (division weights) query — add `.in('id', teamIds)`

**Not filtered** (intentionally):
- `matches` / `matches_archive` / `playoff_matches` — these have `team1_id` and `team2_id`, requiring `.or()` string interpolation which is fragile and adds complexity. Since we need matches for all teams anyway, the current approach of fetching all completed matches and grouping in memory is fine.

### Scope

One file, 3 lines added. No behavioral change for current callers.

