

## Problem: Teams Table Not Reset After Archival

The `v_team_details` view has this fallback pattern:
```sql
COALESCE(stats.wins, t.wins::bigint) AS wins
```

After archival:
- All matches moved to `matches_archive` → `v_team_match_stats` returns NULL (no matches to count)
- The view falls back to `t.wins` on the `teams` table, which still has the old season's numbers
- Power score and SOS show 0/0.5 because those are calculated from the `matches` table (now empty) — but W-L and Games show stale data from the `teams` table fallback

## Fix

Add a single step to the `archive_season` RPC (after Step 5, match archival) that resets the `teams` table stats to 0:

```sql
UPDATE public.teams
SET wins = 0, losses = 0, game_wins = 0, game_losses = 0;
```

This resets all teams so the next season starts clean. The historical data is already safely stored in `team_season_stats` and `team_details_archive`.

### Changes

| What | Change |
|---|---|
| `archive_season` RPC (new migration) | Add `UPDATE teams SET wins=0, losses=0, game_wins=0, game_losses=0` after Step 5 (match archival) |

One migration file, no frontend changes needed.

