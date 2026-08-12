-- Undo the power-score rollout (20260811210000 - 20260812140000).
--
-- NOT A MIGRATION. This file lives outside supabase/migrations/ on purpose: CI
-- replays every migration, and if this were one it would undo the rollout on
-- every run. Paste it into the Supabase SQL Editor only when you actually want
-- to go back.
--
-- Requires 20260811205000_power_score_rollout_backup.sql to have run first.
-- It restores from the snapshots that migration captured:
--
--   team_season_stats_pre_power_rollout  -> the stored ratings
--   power_score_rollout_ddl_backup       -> the view and function definitions
--
-- Views are DROPped and recreated rather than replaced. CREATE OR REPLACE VIEW
-- cannot remove a column, and the rollout added match_date to the match-source
-- chain, so replacing in place would fail on the way back.
--
-- Runs in a single transaction. If any step raises, nothing is applied.
--
-- AFTER RUNNING: the migration files are still in the repo, so anyone applying
-- migrations by hand will re-apply the rollout. Revert the PR or remove those
-- files too, or you will silently roll forward again.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Refuse to run without a backup, rather than leaving a half-reverted schema.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.power_score_rollout_ddl_backup') IS NULL
     OR to_regclass('public.team_season_stats_pre_power_rollout') IS NULL THEN
    RAISE EXCEPTION
      'The pre-rollout backup tables are missing. Run '
      '20260811205000_power_score_rollout_backup.sql before the rollout, not after.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.power_score_rollout_ddl_backup) THEN
    RAISE EXCEPTION 'power_score_rollout_ddl_backup is empty; there is nothing to restore.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Drop the objects the rollout introduced.
-- ---------------------------------------------------------------------------
DROP TRIGGER  IF EXISTS trg_record_division_weight_change ON public.divisions;
DROP FUNCTION IF EXISTS public.record_division_weight_change() CASCADE;
DROP FUNCTION IF EXISTS public.admin_recompute_season_power(uuid);
DROP VIEW     IF EXISTS public.v_power_score_team_matches_rated CASCADE;
DROP VIEW     IF EXISTS public.v_team_last_known_division CASCADE;
DROP VIEW     IF EXISTS public.v_team_current_division CASCADE;
DROP VIEW     IF EXISTS public.v_division_rateable CASCADE;
DROP FUNCTION IF EXISTS public.division_is_hidden(text, text, numeric) CASCADE;

-- The parameterised upsert must go before the zero-argument original can be
-- restored, or calls would be ambiguous.
DROP FUNCTION IF EXISTS public.upsert_team_season_stats(boolean);

-- division_weight_history and division_archive_distrust are deliberately KEPT.
-- They are additive, nothing else reads them once the views are gone, and the
-- weight history is genuine observational data that cannot be recreated once
-- discarded. Drop them by hand if you are certain.

-- ---------------------------------------------------------------------------
-- 2. Drop the replaced views, dependents first.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_team_details_with_season CASCADE;
DROP VIEW IF EXISTS public.v_team_power_scores CASCADE;
DROP VIEW IF EXISTS public.v_team_details CASCADE;
DROP VIEW IF EXISTS public.v_team_season_agg CASCADE;
DROP VIEW IF EXISTS public.v_power_score_components_current CASCADE;
DROP VIEW IF EXISTS public.v_power_score_components CASCADE;
DROP VIEW IF EXISTS public.v_power_score_team_matches CASCADE;
DROP VIEW IF EXISTS public.v_power_score_match_source_current CASCADE;
DROP VIEW IF EXISTS public.v_power_score_match_source CASCADE;
DROP VIEW IF EXISTS public.v_team_match_stats CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Recreate from the snapshot, dependencies first.
--
-- The order is explicit because power_score_rollout_ddl_backup does not encode
-- the dependency graph. A missing entry is skipped rather than failing: the
-- backup only holds objects that existed when it was taken.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_name text;
  v_def  text;
  v_order text[] := ARRAY[
    'v_power_score_match_source',
    'v_power_score_match_source_current',
    'v_power_score_team_matches',
    'v_power_score_components',
    'v_power_score_components_current',
    'v_team_match_stats',
    'v_team_details',
    'v_team_details_with_season',
    'v_team_power_scores',
    'v_team_season_agg'
  ];
  v_restored int := 0;
BEGIN
  FOREACH v_name IN ARRAY v_order LOOP
    SELECT definition INTO v_def
    FROM public.power_score_rollout_ddl_backup
    WHERE object_name = v_name AND object_type = 'view';

    IF v_def IS NOT NULL THEN
      EXECUTE v_def;
      v_restored := v_restored + 1;
    END IF;
  END LOOP;

  -- Functions have no ordering constraint among themselves.
  FOR v_name, v_def IN
    SELECT object_name, definition
    FROM public.power_score_rollout_ddl_backup
    WHERE object_type = 'function'
    ORDER BY object_name
  LOOP
    EXECUTE v_def;
    v_restored := v_restored + 1;
  END LOOP;

  RAISE NOTICE 'restored % object definitions from the pre-rollout snapshot', v_restored;
END $$;

-- Grants are not carried in pg_get_viewdef, so reinstate the public read the
-- app depends on.
GRANT SELECT ON public.v_power_score_match_source          TO anon, authenticated;
GRANT SELECT ON public.v_power_score_match_source_current  TO anon, authenticated;
GRANT SELECT ON public.v_power_score_team_matches          TO anon, authenticated;
GRANT SELECT ON public.v_power_score_components            TO anon, authenticated;
GRANT SELECT ON public.v_power_score_components_current    TO anon, authenticated;
GRANT SELECT ON public.v_team_match_stats                  TO anon, authenticated;
GRANT SELECT ON public.v_team_details                      TO anon, authenticated;
GRANT SELECT ON public.v_team_details_with_season          TO anon, authenticated;
GRANT SELECT ON public.v_team_power_scores                 TO anon, authenticated;
GRANT SELECT ON public.v_team_season_agg                   TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Restore the stored ratings.
--
-- Only the columns the rollout can move. Records are deliberately included
-- because 20260811210000 and its successors also changed which matches count.
-- ---------------------------------------------------------------------------
UPDATE public.team_season_stats s
SET power_score   = b.power_score,
    sos           = b.sos,
    division_name = b.division_name,
    match_wins    = b.match_wins,
    match_losses  = b.match_losses,
    game_wins     = b.game_wins,
    game_losses   = b.game_losses,
    recorded_at   = now()
FROM public.team_season_stats_pre_power_rollout b
WHERE s.season_id = b.season_id
  AND s.team_id   = b.team_id;

-- Rows the rollout created that did not exist before are removed, so the table
-- matches the snapshot exactly rather than keeping orphans.
DELETE FROM public.team_season_stats s
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_season_stats_pre_power_rollout b
  WHERE b.season_id = s.season_id AND b.team_id = s.team_id
);

-- ---------------------------------------------------------------------------
-- 5. Prove the restore landed.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_diff bigint;
BEGIN
  SELECT count(*) INTO v_diff
  FROM public.team_season_stats s
  JOIN public.team_season_stats_pre_power_rollout b
    ON b.season_id = s.season_id AND b.team_id = s.team_id
  WHERE s.power_score IS DISTINCT FROM b.power_score
     OR s.sos IS DISTINCT FROM b.sos
     OR s.division_name IS DISTINCT FROM b.division_name;

  IF v_diff > 0 THEN
    RAISE EXCEPTION 'Restore incomplete: % rows still differ from the snapshot.', v_diff;
  END IF;

  RAISE NOTICE 'power-score rollout reverted; team_season_stats matches the pre-rollout snapshot';
END $$;

COMMIT;
