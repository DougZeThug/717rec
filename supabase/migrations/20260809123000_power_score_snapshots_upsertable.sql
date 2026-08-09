-- Let a week's power-score snapshot be refreshed instead of written once.
--
-- capture-power-snapshots inserts a row per team per week and skips entirely if
-- every team already has one. That made the write safe to retry, but it also
-- froze the week: results entered after the first run of the week never reached
-- the snapshot, so the Movers section kept reporting the older numbers.
--
-- A unique key lets the function upsert instead, so each run refreshes the
-- current week.
--
-- Created without CONCURRENTLY on purpose: Supabase runs migrations inside a
-- transaction, where CREATE INDEX CONCURRENTLY is not allowed, and this table is
-- small enough that the brief lock does not matter.

-- Collapse any pre-existing duplicates, keeping the most recently captured row,
-- or the unique index below cannot be built.
DELETE FROM public.power_score_snapshots a
USING public.power_score_snapshots b
WHERE a.team_id = b.team_id
  AND a.season_id = b.season_id
  AND a.week_number = b.week_number
  AND (a.snapshot_date, a.id) < (b.snapshot_date, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_power_score_snapshots_team_season_week
  ON public.power_score_snapshots (team_id, season_id, week_number);

COMMENT ON INDEX public.idx_power_score_snapshots_team_season_week IS
  'Upsert key for capture-power-snapshots, so re-running refreshes the current week.';
