CREATE OR REPLACE FUNCTION public.calculate_team_streak(p_team_id uuid)
RETURNS TABLE(streak_type text, streak_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  recent_matches RECORD;
  current_streak_type text := null;
  current_streak_count integer := 0;
  match_result text;
BEGIN
  FOR recent_matches IN 
    SELECT 
      m.id,
      m.winner_id,
      COALESCE(m.date, m.created_at) as effective_date
    FROM public.matches m
    WHERE m.iscompleted = true 
      AND (m.team1_id = p_team_id OR m.team2_id = p_team_id)
    ORDER BY COALESCE(m.date, m.created_at) DESC
    LIMIT 20
  LOOP
    IF recent_matches.winner_id = p_team_id THEN
      match_result := 'win';
    ELSE
      match_result := 'loss';
    END IF;
    
    IF current_streak_type IS NULL THEN
      current_streak_type := match_result;
      current_streak_count := 1;
    ELSIF current_streak_type = match_result THEN
      current_streak_count := current_streak_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT current_streak_type, current_streak_count;
END;
$$;