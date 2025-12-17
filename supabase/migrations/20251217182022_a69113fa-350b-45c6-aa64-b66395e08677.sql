-- Create function to reverse team stats when a completed match is deleted
CREATE OR REPLACE FUNCTION public.reverse_team_stats(
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_game_wins integer DEFAULT 0,
  p_loser_game_wins integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_result JSON;
  v_winner_rows INT;
  v_loser_rows INT;
BEGIN
  -- Log the operation
  RAISE NOTICE 'REVERSE TEAM STATS: Winner % (-1W, -%GW), Loser % (-1L, -%GW)', 
    p_winner_id, COALESCE(p_winner_game_wins, 0), p_loser_id, COALESCE(p_loser_game_wins, 0);

  -- Validate teams exist
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_winner_id) THEN
    RAISE EXCEPTION 'Winner team not found: %', p_winner_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser team not found: %', p_loser_id;
  END IF;

  -- Reverse winner stats (decrement wins and game stats)
  UPDATE public.teams
  SET 
    wins = GREATEST(0, COALESCE(wins, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - COALESCE(p_winner_game_wins, 0)),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - COALESCE(p_loser_game_wins, 0))
  WHERE id = p_winner_id;
  
  GET DIAGNOSTICS v_winner_rows = ROW_COUNT;

  -- Reverse loser stats (decrement losses and game stats)
  UPDATE public.teams
  SET 
    losses = GREATEST(0, COALESCE(losses, 0) - 1),
    game_wins = GREATEST(0, COALESCE(game_wins, 0) - COALESCE(p_loser_game_wins, 0)),
    game_losses = GREATEST(0, COALESCE(game_losses, 0) - COALESCE(p_winner_game_wins, 0))
  WHERE id = p_loser_id;
  
  GET DIAGNOSTICS v_loser_rows = ROW_COUNT;

  -- Validate both teams were updated
  IF (v_winner_rows + v_loser_rows) <> 2 THEN
    RAISE EXCEPTION 'Expected to update 2 teams but updated % rows', (v_winner_rows + v_loser_rows);
  END IF;

  -- Return success
  v_result := json_build_object(
    'success', true,
    'rows_affected', v_winner_rows + v_loser_rows,
    'winner', json_build_object(
      'id', p_winner_id, 
      'match_win_reversed', 1, 
      'game_wins_reversed', COALESCE(p_winner_game_wins, 0),
      'game_losses_reversed', COALESCE(p_loser_game_wins, 0)
    ),
    'loser', json_build_object(
      'id', p_loser_id, 
      'match_loss_reversed', 1, 
      'game_wins_reversed', COALESCE(p_loser_game_wins, 0),
      'game_losses_reversed', COALESCE(p_winner_game_wins, 0)
    )
  );
  
  RETURN v_result;
END;
$$;

-- Fix the stats for 3 Amigos and Bag Babies (reset to 0-0 since deleted match was their only match)
UPDATE public.teams 
SET wins = 0, losses = 0, game_wins = 0, game_losses = 0 
WHERE id IN (
  '9ee2b996-99f6-446c-be20-8255ca75d8c8',  -- 3 Amigos
  '626be920-071d-4aea-a1f5-1819893215ca'   -- Bag Babies
);