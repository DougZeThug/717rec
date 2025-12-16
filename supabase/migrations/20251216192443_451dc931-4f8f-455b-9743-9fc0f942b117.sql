-- Fix update_team_stats function to correctly track row counts after each UPDATE statement
-- Previously, GET DIAGNOSTICS only captured the last UPDATE's row count, causing false errors

CREATE OR REPLACE FUNCTION public.update_team_stats(
  p_winner_id uuid, 
  p_loser_id uuid, 
  p_winner_game_wins integer DEFAULT 0, 
  p_loser_game_wins integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result JSON;
  v_winner_rows INT;
  v_loser_rows INT;
  v_total_rows INT;
BEGIN
  -- Log the operation
  RAISE NOTICE 'UPDATE TEAM STATS: Winner % (+1W, +%GW), Loser % (+1L, +%GW)', 
    p_winner_id, COALESCE(p_winner_game_wins, 0), p_loser_id, COALESCE(p_loser_game_wins, 0);

  -- Validate teams exist
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  -- Update winner stats
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

  -- Sum both row counts
  v_total_rows := v_winner_rows + v_loser_rows;

  -- Validate both teams were updated
  IF v_total_rows <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows (winner: %, loser: %)', 
      v_total_rows, v_winner_rows, v_loser_rows;
  END IF;

  -- Return success
  v_result := json_build_object(
    'success', true,
    'rows_affected', v_total_rows,
    'winner', json_build_object(
      'id', p_winner_id, 
      'match_win', 1, 
      'game_wins', COALESCE(p_winner_game_wins, 0),
      'game_losses', COALESCE(p_loser_game_wins, 0)
    ),
    'loser', json_build_object(
      'id', p_loser_id, 
      'match_loss', 1, 
      'game_wins', COALESCE(p_loser_game_wins, 0),
      'game_losses', COALESCE(p_winner_game_wins, 0)
    )
  );
  
  RETURN v_result;
END;
$function$;