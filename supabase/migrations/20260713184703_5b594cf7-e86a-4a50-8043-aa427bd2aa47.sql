-- Atomic, idempotent RPC for submitting or editing a match result.
-- In a single transaction: locks the match, reverses any prior result's team
-- counters, writes new scores + winner/loser, applies new counters, refreshes
-- season stats. If the requested result already matches the stored result
-- exactly, returns {applied:false} without touching counters.
CREATE OR REPLACE FUNCTION public.resubmit_match_result(
  p_match_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_game_wins integer,
  p_loser_game_wins integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_team1_id uuid;
  v_team2_id uuid;
  v_prev_winner uuid;
  v_prev_loser uuid;
  v_prev_completed boolean;
  v_prev_t1_gw integer;
  v_prev_t2_gw integer;
  v_prev_t1_score integer;
  v_prev_t2_score integer;
  v_prev_winner_gw integer;
  v_prev_loser_gw integer;
  v_new_t1_score integer;
  v_new_t2_score integer;
  v_new_t1_gw integer;
  v_new_t2_gw integer;
  v_reversed boolean := false;
  v_winner_rows integer;
  v_loser_rows integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_winner_id IS NULL OR p_loser_id IS NULL THEN
    RAISE EXCEPTION 'Winner and loser required';
  END IF;
  IF p_winner_id = p_loser_id THEN
    RAISE EXCEPTION 'Winner and loser must be different teams';
  END IF;

  -- Lock the match row
  SELECT team1_id, team2_id, winner_id, loser_id, iscompleted,
         team1_game_wins, team2_game_wins, team1_score, team2_score
    INTO v_team1_id, v_team2_id, v_prev_winner, v_prev_loser, v_prev_completed,
         v_prev_t1_gw, v_prev_t2_gw, v_prev_t1_score, v_prev_t2_score
    FROM public.matches
    WHERE id = p_match_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  IF v_team1_id IS NULL OR v_team2_id IS NULL THEN
    RAISE EXCEPTION 'Match % is missing team IDs', p_match_id;
  END IF;

  -- Validate winner/loser are the match's two teams
  IF NOT ((p_winner_id = v_team1_id AND p_loser_id = v_team2_id)
       OR (p_winner_id = v_team2_id AND p_loser_id = v_team1_id)) THEN
    RAISE EXCEPTION 'Winner/loser (% / %) do not match teams (% / %)',
      p_winner_id, p_loser_id, v_team1_id, v_team2_id;
  END IF;

  -- Compute new per-team fields relative to team1/team2 slots
  IF p_winner_id = v_team1_id THEN
    v_new_t1_score := 1;
    v_new_t2_score := 0;
    v_new_t1_gw := COALESCE(p_winner_game_wins, 0);
    v_new_t2_gw := COALESCE(p_loser_game_wins, 0);
  ELSE
    v_new_t1_score := 0;
    v_new_t2_score := 1;
    v_new_t1_gw := COALESCE(p_loser_game_wins, 0);
    v_new_t2_gw := COALESCE(p_winner_game_wins, 0);
  END IF;

  -- Idempotency: exact same completed result already stored -> no-op
  IF v_prev_completed IS TRUE
     AND v_prev_winner = p_winner_id
     AND v_prev_loser  = p_loser_id
     AND COALESCE(v_prev_t1_gw, 0) = v_new_t1_gw
     AND COALESCE(v_prev_t2_gw, 0) = v_new_t2_gw
     AND COALESCE(v_prev_t1_score, 0) = v_new_t1_score
     AND COALESCE(v_prev_t2_score, 0) = v_new_t2_score THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reversed_previous', false,
      'previous_winner_id', v_prev_winner
    );
  END IF;

  -- Reverse prior counters if match was previously completed with a winner
  IF v_prev_winner IS NOT NULL AND v_prev_loser IS NOT NULL THEN
    IF v_prev_winner = v_team1_id THEN
      v_prev_winner_gw := COALESCE(v_prev_t1_gw, 0);
      v_prev_loser_gw  := COALESCE(v_prev_t2_gw, 0);
    ELSE
      v_prev_winner_gw := COALESCE(v_prev_t2_gw, 0);
      v_prev_loser_gw  := COALESCE(v_prev_t1_gw, 0);
    END IF;

    UPDATE public.teams
      SET wins        = GREATEST(0, COALESCE(wins, 0) - 1),
          game_wins   = GREATEST(0, COALESCE(game_wins, 0) - v_prev_winner_gw),
          game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_prev_loser_gw)
      WHERE id = v_prev_winner;

    UPDATE public.teams
      SET losses      = GREATEST(0, COALESCE(losses, 0) - 1),
          game_wins   = GREATEST(0, COALESCE(game_wins, 0) - v_prev_loser_gw),
          game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_prev_winner_gw)
      WHERE id = v_prev_loser;

    v_reversed := true;
  END IF;

  -- Write the new match result
  UPDATE public.matches
     SET winner_id        = p_winner_id,
         loser_id         = p_loser_id,
         team1_score      = v_new_t1_score,
         team2_score      = v_new_t2_score,
         team1_game_wins  = v_new_t1_gw,
         team2_game_wins  = v_new_t2_gw,
         iscompleted      = true
     WHERE id = p_match_id;

  -- Apply new counters
  UPDATE public.teams
    SET wins        = COALESCE(wins, 0) + 1,
        game_wins   = COALESCE(game_wins, 0) + COALESCE(p_winner_game_wins, 0),
        game_losses = COALESCE(game_losses, 0) + COALESCE(p_loser_game_wins, 0)
    WHERE id = p_winner_id;
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  UPDATE public.teams
    SET losses      = COALESCE(losses, 0) + 1,
        game_wins   = COALESCE(game_wins, 0) + COALESCE(p_loser_game_wins, 0),
        game_losses = COALESCE(game_losses, 0) + COALESCE(p_winner_game_wins, 0)
    WHERE id = p_loser_id;
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  -- Refresh season stats
  PERFORM public.upsert_team_season_stats();

  RETURN jsonb_build_object(
    'applied', true,
    'reversed_previous', v_reversed,
    'previous_winner_id', v_prev_winner
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resubmit_match_result(uuid, uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resubmit_match_result(uuid, uuid, uuid, integer, integer) TO authenticated;