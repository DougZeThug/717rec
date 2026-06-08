CREATE OR REPLACE FUNCTION public.delete_match_with_stats_reversal(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_match record;
  v_winner_game_wins integer := 0;
  v_loser_game_wins integer := 0;
  v_deleted integer;
BEGIN
  -- Require admin
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Lock and read the match row
  SELECT id, team1_id, team2_id, winner_id, loser_id,
         team1_game_wins, team2_game_wins, iscompleted
    INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  -- Delete the match
  DELETE FROM public.matches WHERE id = p_match_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 1 THEN
    RAISE EXCEPTION 'Expected to delete 1 match but deleted % rows', v_deleted;
  END IF;

  -- Reverse team stats only for completed matches with winner/loser
  IF v_match.iscompleted = true
     AND v_match.winner_id IS NOT NULL
     AND v_match.loser_id IS NOT NULL THEN

    IF v_match.winner_id = v_match.team1_id THEN
      v_winner_game_wins := COALESCE(v_match.team1_game_wins, 0);
      v_loser_game_wins  := COALESCE(v_match.team2_game_wins, 0);
    ELSE
      v_winner_game_wins := COALESCE(v_match.team2_game_wins, 0);
      v_loser_game_wins  := COALESCE(v_match.team1_game_wins, 0);
    END IF;

    UPDATE public.teams
    SET
      wins        = GREATEST(0, COALESCE(wins, 0) - 1),
      game_wins   = GREATEST(0, COALESCE(game_wins, 0) - v_winner_game_wins),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_loser_game_wins)
    WHERE id = v_match.winner_id;

    UPDATE public.teams
    SET
      losses      = GREATEST(0, COALESCE(losses, 0) - 1),
      game_wins   = GREATEST(0, COALESCE(game_wins, 0) - v_loser_game_wins),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_winner_game_wins)
    WHERE id = v_match.loser_id;
  END IF;

  -- Refresh season stats
  PERFORM public.upsert_team_season_stats();

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'stats_reversed', (v_match.iscompleted = true
                       AND v_match.winner_id IS NOT NULL
                       AND v_match.loser_id IS NOT NULL)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_match_with_stats_reversal(uuid) TO authenticated;
