\set ON_ERROR_STOP on

-- Undoing or editing a round must move games.updated_at of the in-progress
-- game (20261120120000), so completeGame's guard
--   UPDATE games SET status = 'completed' ... WHERE status = 'in_progress'
--   AND updated_at = <value the scorer's screen loaded>
-- matches no row on a stale phone. Only a DELETE and an UPDATE of the two scores
-- (or the game) touch the game. An INSERT does not: a scorer's own new round
-- would otherwise make their own screen look stale. A completed game is never
-- touched.
--
-- Inside one test transaction now() never changes, so each game gets an old
-- updated_at (2000-01-01) and the stamps are put back between steps. The reset
-- turns session_replication_role to replica so set_games_updated_at does not
-- overwrite the planted value.

BEGIN;

DO $$
DECLARE
  v_old timestamptz := '2000-01-01 00:00:00+00';
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a901';
  v_scorer_id uuid := '00000000-0000-0000-0000-00000000a902';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b901';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b902';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c901';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c902';
  v_match_id uuid := '00000000-0000-0000-0000-00000000d901';
  v_match2_id uuid := '00000000-0000-0000-0000-00000000d902';
  v_game1_id uuid := '00000000-0000-0000-0000-00000000e901';
  v_game2_id uuid := '00000000-0000-0000-0000-00000000e902';
  v_game3_id uuid := '00000000-0000-0000-0000-00000000e903';
  v_game4_id uuid := '00000000-0000-0000-0000-00000000e904';
  v_round1_id uuid := '00000000-0000-0000-0000-00000000f901';
  v_round2_id uuid := '00000000-0000-0000-0000-00000000f902';
  v_round3_id uuid := '00000000-0000-0000-0000-00000000f903';
  v_round4_id uuid := '00000000-0000-0000-0000-00000000f904';
  v_thrower_id uuid := '00000000-0000-0000-0000-00000000f9a1';
  v_func oid;
  v_trig record;
  v_cols text[];
  v_seen timestamptz;
  v_n bigint;
  v_stamp1 timestamptz;
  v_stamp2 timestamptz;
  v_stamp3 timestamptz;
BEGIN
  -- Fixture reset (children first, so a re-run on a dirty database works).
  DELETE FROM public.match_rounds WHERE match_id IN (v_match_id, v_match2_id);
  DELETE FROM public.games WHERE match_id IN (v_match_id, v_match2_id);
  DELETE FROM public.matches WHERE id IN (v_match_id, v_match2_id);
  DELETE FROM public.team_players WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.team_memberships WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_scorer_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_scorer_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'touch-round-admin@example.test'),
    (v_scorer_id, 'touch-round-scorer@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'touch_round_admin', 'Touch Round Admin', true),
    (v_scorer_id, 'touch_round_scorer', 'Touch Round Scorer', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Touch Round Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Touch Round Division', 'Touch Round Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Touch Round Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Touch Round Team 2', v_division_id, 0, 0, 0, 0);
  INSERT INTO public.team_players (id, team_id, display_name)
  VALUES (v_thrower_id, v_team1_id, 'Touch Round Thrower');
  -- The scorer is an approved member of team 1: a scorer, not an admin.
  INSERT INTO public.team_memberships (team_id, user_id, is_approved, approved_by, approved_at)
  VALUES (v_team1_id, v_scorer_id, true, v_admin_id, now());

  -- Match 1 is open. Game 1 is the one under test (two rounds), game 2 is a
  -- control that is also in progress, game 3 is finished.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, false);
  INSERT INTO public.games (id, match_id, game_number, status) VALUES
    (v_game1_id, v_match_id, 1, 'in_progress'),
    (v_game2_id, v_match_id, 2, 'in_progress');
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score)
  VALUES (v_game3_id, v_match_id, 3, 'completed', v_team1_id, 21, 10);
  INSERT INTO public.match_rounds (id, match_id, game_id, round_number, team1_score, team2_score) VALUES
    (v_round1_id, v_match_id, v_game1_id, 1, 5, 0),
    (v_round2_id, v_match_id, v_game1_id, 2, 0, 3),
    (v_round3_id, v_match_id, v_game2_id, 1, 4, 0),
    (v_round4_id, v_match_id, v_game3_id, 1, 6, 0);

  -- Case 1: the function and the trigger are what the migration says.
  SELECT p.oid INTO v_func
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'touch_game_on_round_change';
  IF v_func IS NULL THEN
    RAISE EXCEPTION 'function touch_game_on_round_change is missing';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_func) THEN
    RAISE EXCEPTION 'touch_game_on_round_change is not SECURITY DEFINER';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(p.proconfig) c
    WHERE p.oid = v_func AND c = 'search_path=pg_catalog, public'
  ) THEN
    RAISE EXCEPTION 'touch_game_on_round_change does not pin search_path to pg_catalog, public: %',
      (SELECT proconfig FROM pg_proc WHERE oid = v_func);
  END IF;
  IF has_function_privilege('anon', v_func, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute touch_game_on_round_change';
  END IF;
  IF has_function_privilege('authenticated', v_func, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute touch_game_on_round_change';
  END IF;

  SELECT t.tgtype, t.tgenabled, t.tgattr, t.tgfoid INTO v_trig
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.match_rounds'::regclass
    AND t.tgname = 'touch_game_on_round_change'
    AND NOT t.tgisinternal;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'trigger touch_game_on_round_change is missing on match_rounds';
  END IF;
  IF v_trig.tgfoid <> v_func THEN
    RAISE EXCEPTION 'trigger touch_game_on_round_change calls the wrong function';
  END IF;
  IF v_trig.tgenabled <> 'O' THEN
    RAISE EXCEPTION 'trigger touch_game_on_round_change is not enabled, got %', v_trig.tgenabled;
  END IF;
  -- tgtype bits: 1 row, 2 BEFORE, 4 INSERT, 8 DELETE, 16 UPDATE, 32 TRUNCATE.
  IF (v_trig.tgtype & 1) = 0 THEN RAISE EXCEPTION 'trigger is not row-level'; END IF;
  IF (v_trig.tgtype & 2) <> 0 THEN RAISE EXCEPTION 'trigger is BEFORE, expected AFTER'; END IF;
  IF (v_trig.tgtype & 4) <> 0 THEN RAISE EXCEPTION 'trigger fires on INSERT, it must not'; END IF;
  IF (v_trig.tgtype & 8) = 0 THEN RAISE EXCEPTION 'trigger does not fire on DELETE'; END IF;
  IF (v_trig.tgtype & 16) = 0 THEN RAISE EXCEPTION 'trigger does not fire on UPDATE'; END IF;
  IF (v_trig.tgtype & 32) <> 0 THEN RAISE EXCEPTION 'trigger fires on TRUNCATE, it must not'; END IF;
  SELECT array_agg(a.attname::text ORDER BY a.attname) INTO v_cols
  FROM pg_attribute a
  WHERE a.attrelid = 'public.match_rounds'::regclass
    AND a.attnum = ANY (v_trig.tgattr::int2[]);
  IF v_cols IS DISTINCT FROM ARRAY['game_id', 'team1_score', 'team2_score'] THEN
    RAISE EXCEPTION 'UPDATE trigger columns are %, expected game_id, team1_score, team2_score', v_cols;
  END IF;

  -- Case 2: deleting a round of an in-progress game moves that game only.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  DELETE FROM public.match_rounds WHERE id = v_round2_id;

  SELECT updated_at INTO v_stamp1 FROM public.games WHERE id = v_game1_id;
  SELECT updated_at INTO v_stamp2 FROM public.games WHERE id = v_game2_id;
  SELECT updated_at INTO v_stamp3 FROM public.games WHERE id = v_game3_id;
  IF v_stamp1 IS NOT DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'deleting a round did not move updated_at of its in-progress game';
  END IF;
  IF v_stamp2 IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'deleting a round moved the control in-progress game of the same match';
  END IF;
  IF v_stamp3 IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'deleting a round moved a completed game of the same match';
  END IF;

  -- Case 3a: editing a score moves the game. Either team's score counts.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  UPDATE public.match_rounds SET team1_score = 7 WHERE id = v_round1_id;

  SELECT updated_at INTO v_stamp1 FROM public.games WHERE id = v_game1_id;
  SELECT updated_at INTO v_stamp2 FROM public.games WHERE id = v_game2_id;
  SELECT updated_at INTO v_stamp3 FROM public.games WHERE id = v_game3_id;
  IF v_stamp1 IS NOT DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'editing team1_score did not move updated_at of the game';
  END IF;
  IF v_stamp2 IS DISTINCT FROM v_old OR v_stamp3 IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'editing a round moved another game of the match';
  END IF;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  UPDATE public.match_rounds SET team2_score = 2 WHERE id = v_round1_id;

  IF (SELECT updated_at FROM public.games WHERE id = v_game1_id) IS NOT DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'editing team2_score did not move updated_at of the game';
  END IF;

  -- Case 3b: a column outside the list (the thrower) does not move the game.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  UPDATE public.match_rounds SET team1_thrower_id = v_thrower_id WHERE id = v_round1_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_rounds WHERE id = v_round1_id AND team1_thrower_id = v_thrower_id
  ) THEN
    RAISE EXCEPTION 'the thrower edit did not apply, so the test below proves nothing';
  END IF;
  IF (SELECT updated_at FROM public.games WHERE id = v_game1_id) IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'editing only the thrower moved updated_at of the game';
  END IF;

  -- Case 4: inserting a round does NOT move the game (the scorer's own round).
  INSERT INTO public.match_rounds (id, match_id, game_id, round_number, team1_score, team2_score)
  VALUES (v_round2_id, v_match_id, v_game1_id, 2, 0, 3);

  IF (SELECT updated_at FROM public.games WHERE id = v_game1_id) IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'inserting a round moved updated_at of the game';
  END IF;

  -- Case 5: a scorer (approved team member, not an admin) undoes the last round.
  -- The RLS policy "Scorers delete last round" lets that through, and the touch
  -- must still happen although the scorer has no right to write games here.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'the role switch did not happen, current_user is %', current_user;
  END IF;
  DELETE FROM public.match_rounds WHERE id = v_round2_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'the scorer could not undo the last round, deleted % rows', v_n;
  END IF;
  IF (SELECT updated_at FROM public.games WHERE id = v_game1_id) IS NOT DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'a scorer undoing a round did not move updated_at of the game';
  END IF;
  IF (SELECT updated_at FROM public.games WHERE id = v_game2_id) IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'a scorer undoing a round moved the control game';
  END IF;

  -- Case 6, the real proof: completeGame's own guarded write after an undo.
  -- The phone loaded the game at stamp "seen"; a teammate then undoes a round.
  -- The round it undoes is the winning one, so the game must NOT finish.
  INSERT INTO public.match_rounds (id, match_id, game_id, round_number, team1_score, team2_score)
  VALUES (v_round2_id, v_match_id, v_game1_id, 2, 0, 3);

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  SELECT updated_at INTO v_seen FROM public.games WHERE id = v_game1_id;
  DELETE FROM public.match_rounds WHERE id = v_round2_id;

  UPDATE public.games
  SET status = 'completed', winner_team_id = v_team1_id
  WHERE id = v_game1_id AND status = 'in_progress' AND updated_at = v_seen;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'a stale screen finished the game after a round was undone (% rows)', v_n;
  END IF;
  IF (SELECT status FROM public.games WHERE id = v_game1_id) <> 'in_progress' THEN
    RAISE EXCEPTION 'the game left in_progress although the guard matched no row';
  END IF;

  -- Same proof for an admin's score edit.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  SELECT updated_at INTO v_seen FROM public.games WHERE id = v_game1_id;
  PERFORM auth.set_test_claims(v_admin_id);
  UPDATE public.match_rounds SET team1_score = 9 WHERE id = v_round1_id;
  PERFORM auth.set_test_claims(NULL);

  UPDATE public.games
  SET status = 'completed', winner_team_id = v_team1_id
  WHERE id = v_game1_id AND status = 'in_progress' AND updated_at = v_seen;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'a stale screen finished the game after a round edit (% rows)', v_n;
  END IF;

  -- Control: with nothing changed since the screen loaded, the same guarded
  -- write still finishes the game. Without this the zeros above could just be
  -- a guard that never matches. Game 2 was not touched by any step above.
  SELECT updated_at INTO v_seen FROM public.games WHERE id = v_game2_id;
  IF v_seen IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'the control game was touched earlier, got %', v_seen;
  END IF;
  UPDATE public.games
  SET status = 'completed', winner_team_id = v_team1_id
  WHERE id = v_game2_id AND status = 'in_progress' AND updated_at = v_seen;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'the guarded finish did not work on an untouched game (% rows)', v_n;
  END IF;

  -- Case 7: a round change on a COMPLETED game leaves it alone (history).
  -- Game 2 is completed now, and so is game 3.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE match_id = v_match_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  UPDATE public.match_rounds SET team1_score = 8 WHERE id = v_round4_id;
  DELETE FROM public.match_rounds WHERE id = v_round3_id;

  IF (SELECT updated_at FROM public.games WHERE id = v_game3_id) IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'a round edit moved the updated_at of a completed game';
  END IF;
  IF (SELECT updated_at FROM public.games WHERE id = v_game2_id) IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'a round delete moved the updated_at of a game completed a moment ago';
  END IF;
  IF (SELECT status FROM public.games WHERE id = v_game3_id) <> 'completed' THEN
    RAISE EXCEPTION 'the completed game changed status';
  END IF;

  -- Case 8: cascades raise nothing and leave nothing behind.
  -- 8a: a game that is deleted takes its rounds with it.
  DELETE FROM public.games WHERE id = v_game1_id;
  SELECT count(*) INTO v_n FROM public.match_rounds WHERE game_id = v_game1_id;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'rounds survived the delete of their game, got % rows', v_n;
  END IF;

  -- 8b: a match deleted with an in-progress game that has 2 rounds.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_match2_id, v_team1_id, v_team2_id, v_season_id, 2, false);
  INSERT INTO public.games (id, match_id, game_number, status)
  VALUES (v_game4_id, v_match2_id, 1, 'in_progress');
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score) VALUES
    (v_match2_id, v_game4_id, 1, 3, 0),
    (v_match2_id, v_game4_id, 2, 0, 6);

  DELETE FROM public.matches WHERE id = v_match2_id;

  SELECT count(*) INTO v_n FROM public.games WHERE match_id = v_match2_id;
  IF v_n <> 0 THEN RAISE EXCEPTION 'games survived the match delete, got % rows', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.match_rounds WHERE match_id = v_match2_id;
  IF v_n <> 0 THEN RAISE EXCEPTION 'match_rounds survived the match delete, got % rows', v_n; END IF;

  RAISE NOTICE 'touch_game_on_round_change smoke test passed';
END $$;

ROLLBACK;
