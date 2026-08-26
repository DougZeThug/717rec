-- ============================================================
-- Seasons are created inactive
-- ============================================================
--
-- WHY
--   public.seasons.is_active defaulted to true, but the trigger that enforces a
--   single active season (trg_ensure_single_active_season, added in
--   20250614154922) fires BEFORE UPDATE only — never on INSERT. So inserting a
--   season while another was active left TWO rows with is_active = true, and
--   SeasonQueryService.fetchActiveSeason then threw
--   "Data integrity violation: N active seasons found", breaking every page
--   scoped to the active season.
--
--   Creating a season and starting one are now separate steps: a season is
--   created inactive and started with the Activate control, which routes through
--   activate_season() / activate_season_with_partial_archive() — both of which
--   deactivate the previous season atomically.
--
-- SCOPE
--   Changes the column default only. Existing rows are untouched, so whichever
--   season is active today stays active. Re-running is safe.
--
--   The app also sends is_active explicitly (SeasonLifecycleService.createSeason),
--   so it behaves correctly even before this migration is applied. This covers
--   the paths app code cannot: direct SQL inserts in the dashboard.

ALTER TABLE public.seasons ALTER COLUMN is_active SET DEFAULT false;

COMMENT ON COLUMN public.seasons.is_active IS
  'Exactly one season should be active. Defaults to false: a new season is '
  'created inactive and started with activate_season(). The single-active '
  'trigger fires on UPDATE only, so an active-by-default insert would leave two '
  'active seasons.';
