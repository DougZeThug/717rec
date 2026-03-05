

## Fix: Mass Score Entry Delete Not Fully Cleaning Up

### Root Cause

The mass score entry delete handler only invalidates two query keys (`matches` and `mass-score-entry`), while the schedule page delete uses `invalidateAllDataQueries()` which invalidates **8 query keys** including teams, rankings, teamStats, team-totals, season-data, team, and team-matches.

This means after deleting from mass score entry:
- The schedule page still shows the match (its cache was never invalidated)
- Team stats appear unchanged (teams/rankings/teamStats caches are stale)

### Fix

**`src/components/admin/MassScoreEntryTool.tsx`** — Replace the two manual `invalidateQueries` calls with `invalidateAllDataQueries(queryClient)` (imported from `src/hooks/matches/updates/utils/queryInvalidation.ts`), plus keep `mass-score-entry` invalidation since that's specific to this view.

One file, ~3 lines changed.

