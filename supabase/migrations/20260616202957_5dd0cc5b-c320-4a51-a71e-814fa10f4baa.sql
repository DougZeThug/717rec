CREATE OR REPLACE FUNCTION public.replace_playoff_games(
  p_match_id uuid,
  p_games jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Require admin (mirrors other write RPCs in this project)
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_match_id IS NULL THEN
    RAISE EXCEPTION 'match_id is required';
  END IF;

  -- Delete + insert run inside the same function call, so they share
  -- a single transaction. If the insert fails, the delete is rolled back.
  DELETE FROM public.playoff_games WHERE match_id = p_match_id;

  IF p_games IS NOT NULL AND jsonb_array_length(p_games) > 0 THEN
    INSERT INTO public.playoff_games (match_id, game_number, team1_score, team2_score, winner_id)
    SELECT
      p_match_id,
      (g->>'game_number')::int,
      (g->>'team1_score')::int,
      (g->>'team2_score')::int,
      NULLIF(g->>'winner_id', '')::uuid
    FROM jsonb_array_elements(p_games) AS g;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_playoff_games(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_playoff_games(uuid, jsonb) TO service_role;