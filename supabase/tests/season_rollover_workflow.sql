\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000aa01';
  v_old_season_id uuid := '00000000-0000-0000-0000-00000000ab01';
  v_new_season_id uuid := '00000000-0000-0000-0000-00000000ab02';
  v_division_id uuid := '00000000-0000-0000-0000-00000000ac01';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000ad01';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000ad02';
  v_match_id uuid := '00000000-0000-0000-0000-00000000ae01';
  v_err_text text;
BEGIN
  DELETE FROM public.matches_archive WHERE id = v_match_id;
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.team_details_archive WHERE season_id IN (v_old_season_id, v_new_season_id);
  DELETE FROM public.team_season_stats WHERE season_id IN (v_old_season_id, v_new_season_id);
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id IN (v_old_season_id, v_new_season_id);
  DELETE FROM public.profiles WHERE id = v_admin_id;
  UPDATE public.seasons SET is_active = false WHERE is_active = true;

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'rollover-admin', 'Rollover Admin', true);
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active, is_archived)
  VALUES
    (v_old_season_id, 'Rollover Old Season', '2026-01-01', true, false),
    (v_new_season_id, 'Rollover New Season', '2026-04-01', false, false);
  INSERT INTO public.divisions (id, name, display_division) VALUES (v_division_id, 'Rollover Division', 'Rollover Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses)
  VALUES
    (v_team1_id, 'Rollover Team 1', v_division_id, 4, 1, 9, 4),
    (v_team2_id, 'Rollover Team 2', v_division_id, 1, 4, 4, 9);
  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id, round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_old_season_id, 1, true, 2, 1);
  INSERT INTO public.team_season_stats (season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name, recorded_at)
  VALUES
    (v_old_season_id, v_team1_id, 4, 1, 9, 4, 'Rollover Division', now()),
    (v_old_season_id, v_team2_id, 1, 4, 4, 9, 'Rollover Division', now());

  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.activate_season_with_partial_archive(v_new_season_id);

  IF (SELECT count(*) FROM public.seasons WHERE is_active) <> 1 THEN
    RAISE EXCEPTION 'season rollover left more than one active season';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_new_season_id AND is_active = true AND is_archived = false) THEN
    RAISE EXCEPTION 'new season was not activated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_old_season_id AND is_active = false AND is_archived = false AND playoffs_active = true) THEN
    RAISE EXCEPTION 'old season was not partial-archived into playoffs-active state';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.matches_archive
    WHERE id = v_match_id
      AND season_id = v_old_season_id
      AND winner_id = v_team1_id
      AND loser_id = v_team2_id
      AND team1_game_wins = 2
      AND team2_game_wins = 1
  ) THEN
    RAISE EXCEPTION 'completed regular-season match stats were not preserved in matches_archive';
  END IF;
  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_match_id) THEN
    RAISE EXCEPTION 'completed regular-season match stayed in matches after partial archive';
  END IF;
  -- Finalization snapshots team_season_stats; make that dependency explicit in
  -- the fixture so this smoke test can focus on finalize_playoffs side effects
  -- after the partial archive has moved regular matches out of public.matches.
  INSERT INTO public.team_season_stats (season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name, recorded_at)
  VALUES
    (v_old_season_id, v_team1_id, 4, 1, 9, 4, 'Rollover Division', now()),
    (v_old_season_id, v_team2_id, 1, 4, 4, 9, 'Rollover Division', now())
  ON CONFLICT (season_id, team_id) DO UPDATE
  SET match_wins = EXCLUDED.match_wins,
      match_losses = EXCLUDED.match_losses,
      game_wins = EXCLUDED.game_wins,
      game_losses = EXCLUDED.game_losses,
      division_name = EXCLUDED.division_name,
      recorded_at = EXCLUDED.recorded_at;
  IF EXISTS (SELECT 1 FROM public.teams WHERE id IN (v_team1_id, v_team2_id) AND (wins <> 0 OR losses <> 0 OR game_wins <> 0 OR game_losses <> 0)) THEN
    RAISE EXCEPTION 'team counters were not reset for new season';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'team_details_archive'
      AND indexname = 'team_details_archive_season_team_unique'
  ) THEN
    RAISE EXCEPTION 'team_details_archive is missing season/team uniqueness required by finalize_playoffs';
  END IF;

  PERFORM public.finalize_playoffs(v_old_season_id, v_team1_id, v_team2_id, NULL);
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_old_season_id AND is_active = false AND is_archived = true AND playoffs_active = false AND champion_team_id = v_team1_id AND runner_up_team_id = v_team2_id) THEN
    RAISE EXCEPTION 'finalize_playoffs did not complete archived season side effects';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_details_archive WHERE season_id = v_old_season_id AND team_id = v_team1_id) THEN
    RAISE EXCEPTION 'finalize_playoffs did not create team_details_archive snapshot';
  END IF;

  BEGIN
    PERFORM public.activate_season_with_partial_archive(v_old_season_id);
    RAISE EXCEPTION 'archived season was reactivated';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Target season not found or already archived' THEN RAISE; END IF;
  END;
END $$;

-- UX audit A-12 / Q30: the Seasons screen now offers Archive on any season that
-- is not yet archived, not just the active one. `public.teams.wins / losses /
-- game_wins / game_losses` are the LIVE league-wide standings with no season id
-- on them, so archiving an old, inactive season must leave them alone — before
-- the guard it zeroed every team's current record.
DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000aa02';
  v_active_season_id uuid := '00000000-0000-0000-0000-00000000ab11';
  v_stale_season_id uuid := '00000000-0000-0000-0000-00000000ab12';
  v_division_id uuid := '00000000-0000-0000-0000-00000000ac11';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000ad11';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000ad12';
  v_end_date date;
BEGIN
  DELETE FROM public.team_details_archive WHERE season_id IN (v_active_season_id, v_stale_season_id);
  DELETE FROM public.team_season_stats WHERE season_id IN (v_active_season_id, v_stale_season_id);
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id IN (v_active_season_id, v_stale_season_id);
  DELETE FROM public.profiles WHERE id = v_admin_id;
  UPDATE public.seasons SET is_active = false WHERE is_active = true;

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'archive-guard-admin', 'Archive Guard Admin', true);
  PERFORM set_config('session_replication_role', 'origin', true);

  -- One season being played now, and one older season nobody ever archived.
  INSERT INTO public.seasons (id, name, start_date, end_date, is_active, is_archived)
  VALUES
    (v_active_season_id, 'Guard Active Season', '2026-01-01', NULL, true, false),
    (v_stale_season_id, 'Guard Stale Season', '2024-01-01', '2024-06-30', false, false);

  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Guard Division', 'Guard Division');

  -- The live standings of the season in progress.
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses)
  VALUES
    (v_team1_id, 'Guard Team One', v_division_id, 7, 2, 15, 6),
    (v_team2_id, 'Guard Team Two', v_division_id, 2, 7, 6, 15);

  PERFORM public.archive_season(v_stale_season_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = v_team1_id AND wins = 7 AND losses = 2 AND game_wins = 15 AND game_losses = 6
  ) THEN
    RAISE EXCEPTION 'archiving an inactive season wiped the active season live standings';
  END IF;

  -- And it must not stamp today over a historical end date.
  SELECT end_date INTO v_end_date FROM public.seasons WHERE id = v_stale_season_id;
  IF v_end_date <> DATE '2024-06-30' THEN
    RAISE EXCEPTION 'archiving an inactive season overwrote its end date (got %)', v_end_date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_stale_season_id AND is_archived = true) THEN
    RAISE EXCEPTION 'archive_season did not archive the inactive season';
  END IF;

  -- The active season still resets the counters, and still ends today.
  PERFORM public.archive_season(v_active_season_id);

  IF EXISTS (
    SELECT 1 FROM public.teams
    WHERE id IN (v_team1_id, v_team2_id)
      AND (wins <> 0 OR losses <> 0 OR game_wins <> 0 OR game_losses <> 0)
  ) THEN
    RAISE EXCEPTION 'archiving the active season no longer resets the live standings';
  END IF;

  SELECT end_date INTO v_end_date FROM public.seasons WHERE id = v_active_season_id;
  IF v_end_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'archiving the active season did not stamp its end date (got %)', v_end_date;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'archive counter-reset guard OK'; END $$;

DO $$ BEGIN RAISE NOTICE 'season rollover workflow OK'; END $$;

ROLLBACK;
