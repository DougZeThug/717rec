-- Seasons are created inactive
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

-- Repair any database that is ALREADY in the broken state. Changing the default
-- only protects future inserts; it does not undo the damage. Two earlier
-- migrations insert a season with is_active = true
-- (20250801183139 'Summer 2 2025', 20251001184630 'Fall 2025'), and because the
-- trigger never fired on INSERT, a full replay leaves BOTH active — so a freshly
-- rebuilt database throws on the first read of the active season.
--
-- Keep exactly one: prefer a season that is not archived, then the one that
-- started most recently, with created_at and id as tie-breaks so the outcome is
-- deterministic. This is a no-op wherever a single season is already active, so
-- it does not disturb a healthy live database. If it ever does pick the wrong
-- season, an admin can correct it with the Activate control.

UPDATE public.seasons
SET is_active = false
WHERE is_active = true
  AND id <> (
    SELECT id
    FROM public.seasons
    WHERE is_active = true
    ORDER BY is_archived, start_date DESC, created_at DESC, id
    LIMIT 1
  );

COMMENT ON COLUMN public.seasons.is_active IS
  'Exactly one season should be active. Defaults to false: a new season is '
  'created inactive and started with activate_season(). The single-active '
  'trigger fires on UPDATE only, so an active-by-default insert would leave two '
  'active seasons.';