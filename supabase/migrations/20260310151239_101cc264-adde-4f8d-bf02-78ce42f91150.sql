
-- Atomic, idempotent RPC for approving a pending match result
CREATE OR REPLACE FUNCTION public.approve_match_result(
  p_match_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_game_wins integer DEFAULT 0,
  p_loser_game_wins integer DEFAULT 0
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_rows integer;
  v_winner_rows integer;
  v_loser_rows integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Idempotent: only update if not already approved
  UPDATE public.matches
  SET winner_id = p_winner_id, loser_id = p_loser_id
  WHERE id = p_match_id AND winner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN false; -- already approved or match not found
  END IF;

  -- Validate teams exist
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  -- Update winner stats (inline, same logic as update_team_stats)
  UPDATE public.teams
  SET
    wins = COALESCE(wins, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_winner_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_loser_game_wins, 0)
  WHERE id = p_winner_id;
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  -- Update loser stats
  UPDATE public.teams
  SET
    losses = COALESCE(losses, 0) + 1,
    game_wins = COALESCE(game_wins, 0) + COALESCE(p_loser_game_wins, 0),
    game_losses = COALESCE(game_losses, 0) + COALESCE(p_winner_game_wins, 0)
  WHERE id = p_loser_id;
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  -- Refresh season stats
  PERFORM public.upsert_team_season_stats();

  RETURN true;
END;
$$;

-- Atomic, idempotent RPC for marking a match as a tie
CREATE OR REPLACE FUNCTION public.mark_match_as_tie(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_winner_id uuid;
  v_loser_id uuid;
  v_team1_id uuid;
  v_team1_game_wins integer;
  v_team2_game_wins integer;
  v_winner_gw integer;
  v_loser_gw integer;
  v_winner_rows integer;
  v_loser_rows integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Lock row and get current state
  SELECT winner_id, loser_id, team1_id, team1_game_wins, team2_game_wins
  INTO v_winner_id, v_loser_id, v_team1_id, v_team1_game_wins, v_team2_game_wins
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  -- Already a tie (idempotent)
  IF v_winner_id IS NULL THEN
    RETURN false;
  END IF;

  -- Determine winner/loser game wins based on which team was the winner
  IF v_winner_id = v_team1_id THEN
    v_winner_gw := COALESCE(v_team1_game_wins, 0);
    v_loser_gw := COALESCE(v_team2_game_wins, 0);
  ELSE
    v_winner_gw := COALESCE(v_team2_game_wins, 0);
    v_loser_gw := COALESCE(v_team1_game_wins, 0);
  END IF;

  -- Reverse winner stats (inline, same logic as reverse_team_stats)
  UPDATE public.teams
  SET
    wins = GREATEST(0, COALESCE(wins, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_winner_gw),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_loser_gw)
  WHERE id = v_winner_id;
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  -- Reverse loser stats
  UPDATE public.teams
  SET
    losses = GREATEST(0, COALESCE(losses, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_loser_gw),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_winner_gw)
  WHERE id = v_loser_id;
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  -- Clear winner/loser on match
  UPDATE public.matches
  SET winner_id = NULL, loser_id = NULL
  WHERE id = p_match_id;

  -- Refresh season stats
  PERFORM public.upsert_team_season_stats();

  RETURN true;
END;
$$;

-- Grant execute to authenticated users only
REVOKE EXECUTE ON FUNCTION public.approve_match_result(uuid, uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_match_result(uuid, uuid, uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_match_as_tie(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_match_as_tie(uuid) TO authenticated;
