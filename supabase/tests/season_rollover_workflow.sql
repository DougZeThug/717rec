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

DO $$ BEGIN RAISE NOTICE 'season rollover workflow OK'; END $$;

ROLLBACK;
