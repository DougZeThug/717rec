CREATE OR REPLACE FUNCTION public.reopen_live_match(p_match_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_winner_id uuid;
  v_loser_id uuid;
  v_team1_id uuid;
  v_iscompleted boolean;
  v_t1_gw integer;
  v_t2_gw integer;
  v_winner_gw integer;
  v_loser_gw integer;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT winner_id, loser_id, team1_id, iscompleted,
         COALESCE(team1_game_wins, 0), COALESCE(team2_game_wins, 0)
  INTO v_winner_id, v_loser_id, v_team1_id, v_iscompleted, v_t1_gw, v_t2_gw
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF v_winner_id IS NULL THEN
    -- Nothing recorded at all: the match is already open.
    IF NOT COALESCE(v_iscompleted, false) THEN
      RETURN false;
    END IF;

    -- Completed with no winner, i.e. a tie. No team records to reverse.
    UPDATE public.matches
    SET iscompleted = false,
        team1_score = 0,
        team2_score = 0,
        metadata = (COALESCE(metadata, '{}'::jsonb) - 'tie_confirmed_at' - 'tie_confirmed_by')
    WHERE id = p_match_id;

    PERFORM public.upsert_team_season_stats();
    PERFORM public.process_all_match_badges(p_match_id);

    RETURN true;
  END IF;

  IF v_winner_id = v_team1_id THEN
    v_winner_gw := v_t1_gw; v_loser_gw := v_t2_gw;
  ELSE
    v_winner_gw := v_t2_gw; v_loser_gw := v_t1_gw;
  END IF;

  UPDATE public.teams
  SET wins = GREATEST(0, COALESCE(wins, 0) - 1),
      game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_winner_gw),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_loser_gw)
  WHERE id = v_winner_id;

  UPDATE public.teams
  SET losses = GREATEST(0, COALESCE(losses, 0) - 1),
      game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_loser_gw),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_winner_gw)
  WHERE id = v_loser_id;

  UPDATE public.matches
  SET winner_id = NULL,
      loser_id = NULL,
      iscompleted = false,
      team1_score = 0,
      team2_score = 0
  WHERE id = p_match_id;

  PERFORM public.upsert_team_season_stats();
  PERFORM public.process_all_match_badges(p_match_id);

  RETURN true;
END;
$function$;