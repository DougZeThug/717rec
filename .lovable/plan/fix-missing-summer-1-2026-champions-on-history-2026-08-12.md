# Fix missing Summer 1 2026 champions on History

## What is wrong

**The History page reads champions from `team_season_stats`, and for Summer 1 2026 every row has `champion = false` and `playoff_rank = NULL`.** The playoff data itself is fine.

Verified in the database:
- Summer 1 2026 has 27 stat rows, 0 champions, 0 playoff ranks.
- All three Summer 1 brackets are `state = completed` and each has a 1st-place row in `playoff_team_records`:
  - Competitive: Baggin' & Braggin'
  - Intermediate: Buttery Nips
  - Recreational: Sha-Bags
- All three Summer 1 brackets have `wb_champion_id = NULL`.
- Spring 2026 and older brackets all have `wb_champion_id` set, and those seasons do show champions.

## Root cause

`archive_season()` first clears `champion / runner_up / playoff_rank` for the season, then loops only over brackets `WHERE wb_champion_id IS NOT NULL` to write them back. Summer 1's brackets never got `wb_champion_id` set, so the loop skipped all three and left the season with no champions.

## Fix

1. **Backfill the three brackets**: set `brackets.wb_champion_id` from the `placement = 1` row in `playoff_team_records` for each Summer 1 2026 bracket.
2. **Backfill the season standings**: write `champion = true, playoff_rank = 1` for the three winners, and `runner_up = true, playoff_rank = 2` for each bracket's grand-final loser, into `team_season_stats` for Summer 1 2026 — same rules `archive_season()` uses, applied to this one archived season.
3. **Stop it happening again**: make `wb_champion_id` fill itself when a bracket completes, by setting it inside the existing `_do_finalize_bracket_standings()` path from the placement-1 team. Fall back inside `archive_season()` to `playoff_team_records.placement = 1` when `wb_champion_id` is still null.
4. **Verify**: re-query Summer 1 2026 for 3 champions and 3 runners-up, then confirm the History page shows the champion cards.

## Technical notes

- Steps 1 and 2 are data writes on an archived season (insert/update tool), not schema changes.
- Step 3 is one SQL migration replacing two functions; no app code changes.
- No frontend change is needed — `SeasonStatsService.fetchSeasonStatsForAccordion` already reads `champion`, `runner_up`, and `playoff_rank`.
