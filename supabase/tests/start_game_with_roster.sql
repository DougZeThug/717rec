\set ON_ERROR_STOP on

-- start_game_with_roster must be all-or-nothing: the game row and both sides'
-- game_players land together, or neither does. The JS path it replaces did
-- three unwrapped writes, so one failed line-up left a committed in-progress
-- game with one side rostered and the other empty.

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a401';
  v_outsider_id uuid := '00000000-0000-0000-0000-00000000a402';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b401';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b402';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c401';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c402';
  v_match_id uuid := '00000000-0000-0000-0000-00000000d401';
  v_p1 uuid := '00000000-0000-0000-0000-00000000f401';
  v_p2 uuid := '00000000-0000-0000-0000-00000000f402';
  v_p3 uuid := '00000000-0000-0000-0000-00000000f403';
  v_p4 uuid := '00000000-0000-0000-0000-00000000f404';
  v_result jsonb;
  v_game_id uuid;
  v_second_game_id uuid;
  v_count integer;
  v_refused boolean;
BEGIN
  -- Fixture reset.
  DELETE FROM public.match_rounds WHERE match_id = v_match_id;
  DELETE FROM public.game_players
   WHERE game_id IN (SELECT id FROM public.games WHERE match_id = v_match_id);
  DELETE FROM public.games WHERE match_id = v_match_id;
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.team_players WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.team_memberships WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_outsider_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_outsider_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'start-game-admin@example.test'),
    (v_outsider_id, 'start-game-outsider@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'start_game_admin', 'Start Game Admin', true),
    (v_outsider_id, 'start_game_outsider', 'Start Game Outsider', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Start Game Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Start Game Division', 'Start Game Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Start Game Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Start Game Team 2', v_division_id, 0, 0, 0, 0);
  INSERT INTO public.team_players (id, team_id, display_name) VALUES
    (v_p1, v_team1_id, 'One'),
    (v_p2, v_team1_id, 'Two'),
    (v_p3, v_team2_id, 'Three'),
    (v_p4, v_team2_id, 'Four');
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, false);

  PERFORM auth.set_test_claims(v_admin_id);

  -- Case 1: one call creates the game and both line-ups.
  v_result := public.start_game_with_roster(
    v_match_id, 1, v_team1_id, ARRAY[v_p1, v_p2], v_team2_id, ARRAY[v_p3]
  );

  IF (v_result ->> 'created')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'first call did not report creating the game: %', v_result;
  END IF;

  v_game_id := (v_result ->> 'game_id')::uuid;
  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'start_game_with_roster returned no game_id';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.games WHERE id = v_game_id AND status = 'in_progress';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected one in-progress game, got %', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.game_players WHERE game_id = v_game_id AND team_id = v_team1_id;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'team 1 line-up has % rows, expected 2', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.game_players WHERE game_id = v_game_id AND team_id = v_team2_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'team 2 line-up has % rows, expected 1', v_count;
  END IF;

  -- Slots are assigned in the order given.
  IF NOT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = v_game_id AND player_id = v_p1 AND slot = 1
  ) THEN
    RAISE EXCEPTION 'first player did not take slot 1';
  END IF;

  -- Case 2: calling again for the same game number replaces rather than
  -- duplicates, and reports that it did not create the game. This is what makes
  -- a retry after a failure safe, and what stops two scorers starting twice.
  v_result := public.start_game_with_roster(
    v_match_id, 1, v_team1_id, ARRAY[v_p2], v_team2_id, ARRAY[v_p3, v_p4]
  );

  IF (v_result ->> 'game_id')::uuid <> v_game_id THEN
    RAISE EXCEPTION 'retry returned a different game id';
  END IF;
  IF (v_result ->> 'created')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'retry reported creating a second game: %', v_result;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.games WHERE match_id = v_match_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'retry created a second game row, got % games', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.game_players WHERE game_id = v_game_id;
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'retry left % line-up rows, expected 3', v_count;
  END IF;

  -- Case 3: a different game number is a different game.
  v_result := public.start_game_with_roster(
    v_match_id, 2, v_team1_id, ARRAY[v_p1], v_team2_id, ARRAY[v_p3]
  );
  v_second_game_id := (v_result ->> 'game_id')::uuid;
  IF v_second_game_id = v_game_id THEN
    RAISE EXCEPTION 'game 2 reused the game 1 row';
  END IF;

  -- Case 4: more than two players a side is refused, and nothing is written.
  BEGIN
    PERFORM public.start_game_with_roster(
      v_match_id, 3, v_team1_id, ARRAY[v_p1, v_p2, v_p1], v_team2_id, ARRAY[v_p3]
    );
    v_refused := false;
  EXCEPTION WHEN others THEN
    v_refused := true;
  END;
  IF NOT v_refused THEN
    RAISE EXCEPTION 'a three-player side was accepted';
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.games WHERE match_id = v_match_id AND game_number = 3;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'the refused call still created a game row';
  END IF;

  -- Case 5: a match that does not exist is refused, rather than falling
  -- through to the insert and failing on the foreign key. The lock and this
  -- check run before authorization, so an admin hits it too.
  BEGIN
    PERFORM public.start_game_with_roster(
      '00000000-0000-0000-0000-0000000000ff'::uuid, 1,
      v_team1_id, ARRAY[v_p1], v_team2_id, ARRAY[v_p3]
    );
    v_refused := false;
  EXCEPTION WHEN others THEN
    v_refused := true;
  END;
  IF NOT v_refused THEN
    RAISE EXCEPTION 'a match that does not exist was accepted';
  END IF;

  -- Case 6: somebody who cannot score this match is refused.
  PERFORM auth.set_test_claims(v_outsider_id);
  BEGIN
    PERFORM public.start_game_with_roster(
      v_match_id, 3, v_team1_id, ARRAY[v_p1], v_team2_id, ARRAY[v_p3]
    );
    v_refused := false;
  EXCEPTION WHEN others THEN
    v_refused := true;
  END;
  IF NOT v_refused THEN
    RAISE EXCEPTION 'a non-scorer was allowed to start a game';
  END IF;

  RAISE NOTICE 'start_game_with_roster: all cases passed';
END $$;

ROLLBACK;
