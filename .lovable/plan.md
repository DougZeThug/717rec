

## Fix: Upsets not appearing in Weekly Recap

### Root Cause
Two issues:

1. **Week number sourced from empty table**: The code gets `weekNumber` from `power_score_snapshots`, which is currently empty. When `weekNumber` is `null`, `_fetchUpsets` is skipped entirely — upsets are never fetched.

2. **Threshold filter**: Even if upsets were fetched, the `UPSET_POWER_SCORE_THRESHOLD` filters out matches. The user wants the top 3 biggest upsets by gap with no minimum threshold.

### Changes

**File: `src/services/WeeklyRecapService.ts`**

1. Get the latest week number from `matches` table (latest `round_number` of completed regular-season matches) instead of `power_score_snapshots`:
```sql
-- Instead of querying power_score_snapshots:
matches.select('round_number')
  .eq('season_id', seasonId)
  .eq('iscompleted', true)
  .is('bracket_id', null)
  .order('round_number', { ascending: false })
  .limit(1)
```

2. Remove `UPSET_POWER_SCORE_THRESHOLD` constant and the `gap < threshold` check. Instead, include every completed match where the winner had a lower career power score