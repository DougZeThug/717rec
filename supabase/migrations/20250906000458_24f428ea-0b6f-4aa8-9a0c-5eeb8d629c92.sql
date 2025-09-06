-- Create function to get opponent match history
CREATE OR REPLACE FUNCTION public.get_opponent_match_history(p_team_id uuid, p_opponent_id uuid)
RETURNS TABLE(
  id uuid,
  date timestamp with time zone,
  team1_name text,
  team2_name text,
  team1_score integer,
  team2_score integer,
  team1_game_wins integer,
  team2_game_wins integer,
  winner_name text,
  location text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_matches AS (
    -- Regular season matches from matches table
    SELECT 
      m.id,
      m.date,
      t1.name as team1_name,
      t2.name as team2_name,
      m.team1_score,
      m.team2_score,
      m.team1_game_wins,
      m.team2_game_wins,
      CASE 
        WHEN m.winner_id = m.team1_id THEN t1.name
        WHEN m.winner_id = m.team2_id THEN t2.name
        ELSE NULL
      END as winner_name,
      m.location
    FROM public.matches m
    JOIN public.teams t1 ON m.team1_id = t1.id
    JOIN public.teams t2 ON m.team2_id = t2.id
    WHERE m.iscompleted = true
      AND (
        (m.team1_id = p_team_id AND m.team2_id = p_opponent_id) OR
        (m.team1_id = p_opponent_id AND m.team2_id = p_team_id)
      )
    
    UNION ALL
    
    -- Archived matches from matches_archive table
    SELECT 
      ma.id,
      ma.date,
      t1.name as team1_name,
      t2.name as team2_name,
      ma.team1_score,
      ma.team2_score,
      ma.team1_game_wins,
      ma.team2_game_wins,
      CASE 
        WHEN ma.winner_id = ma.team1_id THEN t1.name
        WHEN ma.winner_id = ma.team2_id THEN t2.name
        ELSE NULL
      END as winner_name,
      ma.location
    FROM public.matches_archive ma
    JOIN public.teams t1 ON ma.team1_id = t1.id
    JOIN public.teams t2 ON ma.team2_id = t2.id
    WHERE ma.iscompleted = true
      AND (
        (ma.team1_id = p_team_id AND ma.team2_id = p_opponent_id) OR
        (ma.team1_id = p_opponent_id AND ma.team2_id = p_team_id)
      )
    
    UNION ALL
    
    -- Playoff matches from playoff_matches table
    SELECT 
      pm.id,
      pm.created_at as date,
      t1.name as team1_name,
      t2.name as team2_name,
      pm.team1_score,
      pm.team2_score,
      -- For playoff matches, calculate game wins from the scores
      CASE WHEN pm.team1_score IS NOT NULL THEN pm.team1_score ELSE 0 END as team1_game_wins,
      CASE WHEN pm.team2_score IS NOT NULL THEN pm.team2_score ELSE 0 END as team2_game_wins,
      CASE 
        WHEN pm.winner_id = pm.team1_id THEN t1.name
        WHEN pm.winner_id = pm.team2_id THEN t2.name
        ELSE NULL
      END as winner_name,
      NULL::text as location
    FROM public.playoff_matches pm
    JOIN public.teams t1 ON pm.team1_id = t1.id
    JOIN public.teams t2 ON pm.team2_id = t2.id
    WHERE pm.winner_id IS NOT NULL
      AND (
        (pm.team1_id = p_team_id AND pm.team2_id = p_opponent_id) OR
        (pm.team1_id = p_opponent_id AND pm.team2_id = p_team_id)
      )
  )
  SELECT 
    all_matches.id,
    all_matches.date,
    all_matches.team1_name,
    all_matches.team2_name,
    all_matches.team1_score,
    all_matches.team2_score,
    all_matches.team1_game_wins,
    all_matches.team2_game_wins,
    all_matches.winner_name,
    all_matches.location
  FROM all_matches
  ORDER BY all_matches.date DESC NULLS LAST
  LIMIT 20;
END;
$function$