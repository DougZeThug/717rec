

## Plan: Fix NULL team_id crash in season archival

### The bug

`upsert_team_season_stats()` reads from `v_team_season_agg` and inserts into `team_season_stats`, which has a NOT NULL constraint on `team_id` (and `season_id`). The view can return rows where `team_id` is NULL (e.g., orphaned aggregates), causing the INSERT to crash. This blocks `archive_season`, `partial_archive_season`, and `finalize_playoffs` — all of which call this function first.

### The fix

Add a single migration that re-declares `public.upsert_team_season_stats()` with a `WHERE team_id IS NOT NULL AND season_id IS NOT NULL` guard on the SELECT. Everything else in the function stays identical (same columns, same ON CONFLICT behavior, same archived-season division_name preservation).

We fix this at the function level rather than the view because the view feeds other read paths (standings, insights, rankings) where dropping NULL rows could quietly hide data. The INSERT is the only place NULLs are fatal, so filter there.

### Files touched

- Create: `supabase/migrations/20260422120000_fix_upsert_team_season_stats_null_team_id.sql` — single `CREATE OR REPLACE FUNCTION` statement with the new NULL guards.

No code changes — function signature, return type, and behavior on valid rows are unchanged. All existing callers (`archive_season`, `partial_archive_season`, `finalize_playoffs`, plus app code in `MatchWriteService` and `useMatchDelete`) keep working without edits.

### Verification

1. Run the migration.
2. From the SQL editor: `SELECT public.upsert_team_season_stats();` — completes without the NOT NULL violation.
3. Trigger the original failing flow (e.g., archive a season or finalize playoffs from the admin UI). It should complete end-to-end.
4. Spot-check `team_season_stats` after the run — row counts for valid teams should match the previous behavior (only NULL-keyed rows are now skipped).

### Rollback

Revert the migration file and re-run the prior `CREATE OR REPLACE FUNCTION` body from `20260408173631_…sql` (lines 142–176). One step.

