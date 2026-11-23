SET lock_timeout = '5s';

-- Clean-up: drop 9 unused functions, 2 empty tables and 3 unused views.
--
-- Why this file exists. The app does not call any of these objects. No code in
-- src/ or supabase/functions/ uses them (searched 2026-11-23; the generated
-- types file only lists them). On 2026-11-23 Doug also ran read-only checks on
-- the live database. They found no other function, trigger, scheduled job, view,
-- rule or column default that uses them, both tables hold 0 rows with no foreign
-- key pointing in, and the 3 views have nothing built on them. Doug approved this
-- one clean-up. The ninth function, preserve_team_analysis_created_by(), is the
-- trigger helper of team_analysis. Doug approved it too. Before applying, Doug
-- checks that no trigger on another table uses it (docs/OPERATIONS.md section 6i).
--
-- What goes (everything is in schema public):
--   Functions: auto_assign_seeds(uuid), get_all_team_badges(), get_participants(uuid),
--              get_season_badges(uuid), get_team_badges(uuid),
--              get_team_division_weight(uuid), insert_participant(uuid, uuid, integer),
--              snapshot_current_season(), preserve_team_analysis_created_by()
--              (the trigger helper of team_analysis; Doug approved it on 2026-11-23)
--   Tables:    team_stats, team_analysis (both must hold 0 rows)
--   Views:     v_team_game_totals, v_team_round_stats, v_visible_teams
--
-- What stays. These are LIVE and are not touched: update_team_stats,
-- reverse_team_stats, approve_match_result, delete_match_with_stats_reversal,
-- _reapply_power_score_unification_owner and update_updated_at_column. Their names
-- only look close to the objects above. The standings, the Power Score and the
-- season history do not read anything that goes.
--
-- No CASCADE. Every DROP is plain. If something unknown still depends on an
-- object, that DROP fails with an error instead of taking the dependent object
-- with it.
--
-- One block, all or nothing. All the drops run inside one DO block, so they
-- succeed together or none of them happens. A guard runs first: if either table
-- holds a row, the block stops with an error and NOTHING is changed.
--
-- Historical impact: none. No season, match, player or stat row is read or
-- changed. Both tables are empty.
--
-- A merged migration does NOT reach production. Production is unchanged until
-- Doug applies this file by hand. Steps (backup first, then apply, then check):
-- docs/OPERATIONS.md section 6i. After he applies it, regenerate
-- src/integrations/supabase/types.ts, because the function, table and view types
-- change.
--
-- Not a security fix. These are unused functions. The live grants on them were
-- not checked, so this file does not claim to close any access hole.
--
-- Idempotent: every DROP uses IF EXISTS and the guard skips a table that is
-- already gone, so a second run changes nothing.
--
-- Revert: DROP cannot be undone from this file. Before applying, Doug saves the
-- function and view definitions (docs/OPERATIONS.md section 6i, step 1). To put
-- an object back, run the saved definition. Repo sources for a rebuild:
--   * get_team_badges, get_all_team_badges, get_season_badges: 20260713153829
--   * insert_participant, auto_assign_seeds: 20251225204207, then the REVOKEs in
--     20260504143401 and 20261003192751
--   * preserve_team_analysis_created_by: 20260708174642 (the function and the
--     trigger on team_analysis)
--   * get_participants, get_team_division_weight, snapshot_current_season and the
--     views v_visible_teams and v_team_game_totals: 00000000000000_baseline.sql.
--     That is RECONSTRUCTED only: the live bodies may differ from the repo.
--   * v_team_round_stats: 20260708120000, then replaced in 20260709120308
--   * team_stats and team_analysis: 00000000000000_baseline.sql (line 165), their
--     policies in 20251219142530, 20251231185403 and 20260410152541, and the
--     trigger in 20260708174642. Policies and grants are lost on DROP and must be
--     added again. Both tables hold 0 rows, so no data is lost.

DO $mig$
DECLARE
  v_table text;
  n bigint;
BEGIN
  -- Guard: stop, and change nothing, if either table holds a row.
  FOREACH v_table IN ARRAY ARRAY['team_stats', 'team_analysis'] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', v_table) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION '% has % row(s). NOTHING was changed. Stop and tell the developer.', v_table, n;
      END IF;
    END IF;
  END LOOP;

  -- Views first (nothing is built on them).
  DROP VIEW IF EXISTS public.v_team_game_totals;
  DROP VIEW IF EXISTS public.v_team_round_stats;
  DROP VIEW IF EXISTS public.v_visible_teams;

  -- Empty tables.
  DROP TABLE IF EXISTS public.team_stats;
  DROP TABLE IF EXISTS public.team_analysis;
  -- The trigger on team_analysis went with the table, so nothing uses this now.
  DROP FUNCTION IF EXISTS public.preserve_team_analysis_created_by();

  -- Unused functions. The argument types make each DROP exact.
  DROP FUNCTION IF EXISTS public.auto_assign_seeds(uuid);
  DROP FUNCTION IF EXISTS public.get_all_team_badges();
  DROP FUNCTION IF EXISTS public.get_participants(uuid);
  DROP FUNCTION IF EXISTS public.get_season_badges(uuid);
  DROP FUNCTION IF EXISTS public.get_team_badges(uuid);
  DROP FUNCTION IF EXISTS public.get_team_division_weight(uuid);
  DROP FUNCTION IF EXISTS public.insert_participant(uuid, uuid, integer);
  DROP FUNCTION IF EXISTS public.snapshot_current_season();
END
$mig$;

RESET lock_timeout;
