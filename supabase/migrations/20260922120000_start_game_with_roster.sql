-- Starting a game and writing both line-ups, in one transaction.
--
-- The JS path did three writes with nothing wrapping them: createGame, then
-- both setGamePlayers calls under Promise.all. Promise.all does not cancel the
-- sibling when one rejects, so a single failed line-up write left a committed
-- game -- status defaults to 'in_progress' -- with one side rostered and the
-- other empty. The mutation only raised a toast; there was no rollback.
--
-- What the scorer then saw: ActiveGamePanel for a live game where one side's
-- thrower bar reads "No players selected", because throwerOptions maps an
-- empty game_players list. Rounds still save, with team{N}_thrower_id null,
-- and nothing blocks completing the game. The damage is quiet and permanent:
-- v_player_match_stats drops null-thrower rounds, and the game_results CTE in
-- v_player_season_stats joins game_players to count game_wins and game_losses,
-- so the un-rostered side's players lose their thrower rows AND their
-- game-level win/loss credit for that game.
--
-- Doing it in the database makes it all-or-nothing, the way finalize_live_match
-- already handles the completion transition.

CREATE OR REPLACE FUNCTION public.start_game_with_roster(
  p_match_id uuid,
  p_game_number integer,
  p_team1_id uuid,
  p_team1_player_ids uuid[],
  p_team2_id uuid,
  p_team2_player_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_game_id uuid;
  v_created boolean := true;
BEGIN
  IF NOT public.user_can_score_match(p_match_id) THEN
    RAISE EXCEPTION 'Not authorized to score this match' USING HINT = 'user-visible';
  END IF;

  -- Two slots a side, matching the game_players slot CHECK and the client's
  -- MAX_PLAYERS_PER_SIDE. Caught here so a bad call cannot half-write.
  IF coalesce(array_length(p_team1_player_ids, 1), 0) > 2
     OR coalesce(array_length(p_team2_player_ids, 1), 0) > 2 THEN
    RAISE EXCEPTION 'A team can have at most 2 players in a game'
      USING HINT = 'user-visible';
  END IF;

  -- Serialize against a concurrent start of the same game, the way
  -- finalize_live_match serializes against concurrent completion.
  PERFORM 1 FROM public.matches WHERE id = p_match_id FOR UPDATE;

  INSERT INTO public.games (match_id, game_number)
  VALUES (p_match_id, p_game_number)
  ON CONFLICT (match_id, game_number) DO NOTHING
  RETURNING id INTO v_game_id;

  -- Already started: return the existing row rather than failing, which is what
  -- createGame's own 23505 handler did in JS. Two scorers tapping Start Game at
  -- once both land in the same game.
  IF v_game_id IS NULL THEN
    v_created := false;
    SELECT id INTO v_game_id
    FROM public.games
    WHERE match_id = p_match_id AND game_number = p_game_number;
  END IF;

  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'Could not start game % for match %', p_game_number, p_match_id;
  END IF;

  -- Replace rather than append, so a retry after a failed call is safe. Both
  -- sides go in the same statement pair inside this transaction: either both
  -- line-ups land or neither does.
  DELETE FROM public.game_players
  WHERE game_id = v_game_id AND team_id IN (p_team1_id, p_team2_id);

  INSERT INTO public.game_players (game_id, team_id, player_id, slot)
  SELECT v_game_id, p_team1_id, player_id, slot
  FROM unnest(p_team1_player_ids) WITH ORDINALITY AS t(player_id, slot)
  UNION ALL
  SELECT v_game_id, p_team2_id, player_id, slot
  FROM unnest(p_team2_player_ids) WITH ORDINALITY AS t(player_id, slot);

  RETURN jsonb_build_object(
    'game_id', v_game_id,
    'game_number', p_game_number,
    'created', v_created
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_game_with_roster(uuid, integer, uuid, uuid[], uuid, uuid[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_game_with_roster(uuid, integer, uuid, uuid[], uuid, uuid[])
  TO authenticated;
