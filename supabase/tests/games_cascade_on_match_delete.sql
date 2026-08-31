\set ON_ERROR_STOP on

-- Deleting a live-scored match must succeed and take its live-scoring rows with
-- it. Before 20260831120000 games.match_id had no ON DELETE action, so both the
-- admin Scores bin (delete_match_with_stats_reversal) and season archiving
-- (archive_season) raised 23503 on any match that had ever been scored live.

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a301';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b301';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b302';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c301';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c302';
  v_match_id uuid := '00000000-0000-0000-0000-00000000d301';
  v_game_id uuid := '00000000-0000-0000-0000-00000000e301';
  v_player_id uuid := '00000000-0000-0000-0000-00000000f301';
  v_delete_rule "char";
  v_left integer;
  v_result_json jsonb;
BEGIN
  -- Fixture reset. match_rounds and game_players are removed explicitly so the
  -- reset works on a database where the cascade is not yet in place.
  DELETE FROM public.match_rounds WHERE match_id = v_match_id;
  DELETE FROM public.game_players WHERE game_id = v_game_id;
  DELETE FROM public.games WHERE match_id = v_match_id;
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.team_players WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id = v_admin_id;
  DELETE FROM auth.users WHERE id = v_admin_id;

  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'cascade-admin@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'cascade_admin', 'Cascade Admin', true)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Cascade Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Cascade Division', 'Cascade Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Cascade Team 1', v_division_id, 1, 0, 2, 1),
    (v_team2_id, 'Cascade Team 2', v_division_id, 0, 1, 1, 2);
  INSERT INTO public.team_players (id, team_id, display_name)
  VALUES (v_player_id, v_team1_id, 'Cascade Thrower');

  -- Case 1: the constraint itself carries ON DELETE CASCADE ('c').
  SELECT con.confdeltype INTO v_delete_rule
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  WHERE ns.nspname = 'public'
    AND rel.relname = 'games'
    AND con.conname = 'games_match_id_fkey';

  IF v_delete_rule IS NULL THEN
    RAISE EXCEPTION 'games_match_id_fkey is missing';
  END IF;
  IF v_delete_rule <> 'c' THEN
    RAISE EXCEPTION 'games_match_id_fkey delete rule is %, expected c (cascade)', v_delete_rule;
  END IF;

  -- Case 2: the admin Scores bin deletes a live-scored match instead of failing.
  PERFORM auth.set_test_claims(v_admin_id);

  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id,
                              round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_season_id,
          1, true, 2, 1);
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score)
  VALUES (v_game_id, v_match_id, 1, 'completed', v_team1_id, 21, 10);
  INSERT INTO public.game_players (game_id, team_id, player_id, slot)
  VALUES (v_game_id, v_team1_id, v_player_id, 1);
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score, entered_by_user_id)
  VALUES (v_match_id, v_game_id, 1, 9, 0, v_admin_id);

  v_result_json := public.delete_match_with_stats_reversal(v_match_id);
  IF v_result_json IS NULL THEN
    RAISE EXCEPTION 'delete_match_with_stats_reversal returned nothing for a live-scored match';
  END IF;

  SELECT COUNT(*) INTO v_left FROM public.matches WHERE id = v_match_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match survived the delete'; END IF;

  SELECT COUNT(*) INTO v_left FROM public.games WHERE match_id = v_match_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'games survived the match delete, got % rows', v_left; END IF;

  SELECT COUNT(*) INTO v_left FROM public.match_rounds WHERE match_id = v_match_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_rounds survived the match delete, got % rows', v_left; END IF;

  SELECT COUNT(*) INTO v_left FROM public.game_players WHERE game_id = v_game_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'game_players survived the match delete, got % rows', v_left; END IF;

  -- Case 3: archiving a season holding a live-scored finished match completes.
  v_match_id := '00000000-0000-0000-0000-00000000d302';
  v_game_id := '00000000-0000-0000-0000-00000000e302';

  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id,
                              round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_season_id,
          2, true, 2, 0);
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score)
  VALUES (v_game_id, v_match_id, 1, 'completed', v_team1_id, 21, 12);
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score, entered_by_user_id)
  VALUES (v_match_id, v_game_id, 1, 6, 0, v_admin_id);

  PERFORM public.archive_season(v_season_id);

  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_season_id AND is_archived = true) THEN
    RAISE EXCEPTION 'archive_season did not archive the season';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches_archive WHERE id = v_match_id) THEN
    RAISE EXCEPTION 'the live-scored match was not copied into matches_archive';
  END IF;

  SELECT COUNT(*) INTO v_left FROM public.games WHERE match_id = v_match_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'games survived archiving, got % rows', v_left; END IF;

  SELECT COUNT(*) INTO v_left FROM public.match_rounds WHERE match_id = v_match_id;
  IF v_left <> 0 THEN RAISE EXCEPTION 'match_rounds survived archiving, got % rows', v_left; END IF;

  RAISE NOTICE 'games_cascade_on_match_delete smoke test passed';
END $$;

ROLLBACK;
