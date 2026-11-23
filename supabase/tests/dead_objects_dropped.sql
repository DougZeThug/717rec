\set ON_ERROR_STOP on

-- The dead-object clean-up (20261123120000_drop_dead_db_objects.sql) removed what
-- it should and left the live look-alikes alone.
--
-- Cases:
--   1 no function in public carries any of the 9 dropped names (checked by NAME
--     only, so a hidden overload fails the test too)
--   2 the 2 tables and the 3 views are gone
--   3 the live look-alikes still exist: update_team_stats, reverse_team_stats,
--     approve_match_result, delete_match_with_stats_reversal,
--     _reapply_power_score_unification_owner, update_updated_at_column, and the
--     tables team_season_stats and seasons

BEGIN;

DO $test$
DECLARE
  v_name text;
  v_found integer;
BEGIN
  -- Case 1: the 9 functions are gone, whatever their arguments.
  SELECT count(*) INTO v_found
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('auto_assign_seeds', 'get_all_team_badges', 'get_participants',
                      'get_season_badges', 'get_team_badges', 'get_team_division_weight',
                      'insert_participant', 'snapshot_current_season',
                      'preserve_team_analysis_created_by');
  IF v_found <> 0 THEN
    RAISE EXCEPTION 'expected 0 dropped functions to remain, found %', v_found;
  END IF;

  -- Case 2: the 2 tables and 3 views are gone.
  FOREACH v_name IN ARRAY ARRAY['team_stats', 'team_analysis', 'v_team_game_totals',
                                'v_team_round_stats', 'v_visible_teams'] LOOP
    IF to_regclass('public.' || v_name) IS NOT NULL THEN
      RAISE EXCEPTION 'public.% should be gone', v_name;
    END IF;
  END LOOP;

  -- Case 3: the live look-alikes are still there.
  FOREACH v_name IN ARRAY ARRAY['update_team_stats', 'reverse_team_stats', 'approve_match_result',
                                'delete_match_with_stats_reversal',
                                '_reapply_power_score_unification_owner',
                                'update_updated_at_column'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    ) THEN
      RAISE EXCEPTION 'function public.% should still exist', v_name;
    END IF;
  END LOOP;

  FOREACH v_name IN ARRAY ARRAY['team_season_stats', 'seasons'] LOOP
    IF to_regclass('public.' || v_name) IS NULL THEN
      RAISE EXCEPTION 'table public.% should still exist', v_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'dead_objects_dropped smoke test passed';
END $test$;

ROLLBACK;
