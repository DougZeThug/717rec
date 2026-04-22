CREATE OR REPLACE FUNCTION public.partial_archive_season(p_season_id uuid)
 RETURNS seasons
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result public.seasons;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seasons
    WHERE id = p_season_id AND is_archived = false
  ) THEN
    RAISE EXCEPTION 'Season not found or already archived';
  END IF;

  PERFORM public.upsert_team_season_stats();

  DELETE FROM public.match_comments
  WHERE match_id IN (
    SELECT id FROM public.matches WHERE season_id = p_season_id
  );

  INSERT INTO public.matches_archive (
    id, bracket_id, round_number, team1_id, team2_id, winner_id,
    best_of, created_at, match_type, position, next_match_id,
    next_loser_match_id, team1_score, team2_score, date, location,
    iscompleted, loser_id, team1_game_wins, team2_game_wins,
    metadata, season_id, archived_at
  )
  SELECT
    id, bracket_id, round_number, team1_id, team2_id, winner_id,
    best_of, created_at, match_type, position, next_match_id,
    next_loser_match_id, team1_score, team2_score, date, location,
    iscompleted, loser_id, team1_game_wins, team2_game_wins,
    metadata, season_id, now()
  FROM public.matches
  WHERE season_id = p_season_id
    AND iscompleted = true
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.matches
  WHERE season_id = p_season_id
    AND iscompleted = true;

  UPDATE public.teams
  SET wins = 0, losses = 0, game_wins = 0, game_losses = 0
  WHERE id IS NOT NULL;

  UPDATE public.seasons
  SET
    is_active = false,
    playoffs_active = true,
    updated_at = now()
  WHERE id = p_season_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$
