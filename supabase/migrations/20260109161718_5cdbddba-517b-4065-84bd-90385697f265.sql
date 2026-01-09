-- Update get_batch_head_to_head to include ALL historical matches (not just current season)
-- This fixes the regression where H2H on schedule page was showing only current season data

CREATE OR REPLACE FUNCTION public.get_batch_head_to_head(p_team_pairs jsonb)
 RETURNS TABLE(team1_id uuid, team2_id uuid, team1_wins integer, team2_wins integer, total_matches integer, team1_game_wins integer, team2_game_wins integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH team_pairs AS (
    SELECT 
      (pair->>'team1')::UUID AS t1_id,
      (pair->>'team2')::UUID AS t2_id
    FROM jsonb_array_elements(p_team_pairs) AS pair
    WHERE (pair->>'team1') IS NOT NULL 
      AND (pair->>'team2') IS NOT NULL
      AND (pair->>'team1') != (pair->>'team2')
  ),
  -- Include ALL match sources for all-time H2H records
  all_matches AS (
    -- Current season matches
    SELECT 
      m.team1_id,
      m.team2_id,
      m.winner_id,
      COALESCE(m.team1_game_wins, 0) AS team1_game_wins,
      COALESCE(m.team2_game_wins, 0) AS team2_game_wins
    FROM matches m
    WHERE m.iscompleted = TRUE 
      AND m.team1_id IS NOT NULL 
      AND m.team2_id IS NOT NULL 
      AND m.winner_id IS NOT NULL

    UNION ALL

    -- Playoff matches
    SELECT 
      pm.team1_id,
      pm.team2_id,
      pm.winner_id,
      COALESCE(pm.team1_score, 0) AS team1_game_wins,
      COALESCE(pm.team2_score, 0) AS team2_game_wins
    FROM playoff_matches pm
    WHERE pm.winner_id IS NOT NULL 
      AND pm.team1_id IS NOT NULL 
      AND pm.team2_id IS NOT NULL

    UNION ALL

    -- Archived matches (previous seasons)
    SELECT 
      ma.team1_id,
      ma.team2_id,
      ma.winner_id,
      COALESCE(ma.team1_game_wins, 0) AS team1_game_wins,
      COALESCE(ma.team2_game_wins, 0) AS team2_game_wins
    FROM matches_archive ma
    WHERE ma.iscompleted = TRUE 
      AND ma.team1_id IS NOT NULL 
      AND ma.team2_id IS NOT NULL 
      AND ma.winner_id IS NOT NULL
  ),
  match_results AS (
    SELECT 
      tp.t1_id,
      tp.t2_id,
      am.winner_id,
      am.team1_game_wins AS m_team1_game_wins,
      am.team2_game_wins AS m_team2_game_wins,
      am.team1_id AS m_team1_id,
      am.team2_id AS m_team2_id
    FROM team_pairs tp
    JOIN all_matches am ON (
      (am.team1_id = tp.t1_id AND am.team2_id = tp.t2_id) OR
      (am.team1_id = tp.t2_id AND am.team2_id = tp.t1_id)
    )
  )
  SELECT 
    tp.t1_id AS team1_id,
    tp.t2_id AS team2_id,
    COALESCE(SUM(CASE WHEN mr.winner_id = tp.t1_id THEN 1 ELSE 0 END), 0)::INTEGER AS team1_wins,
    COALESCE(SUM(CASE WHEN mr.winner_id = tp.t2_id THEN 1 ELSE 0 END), 0)::INTEGER AS team2_wins,
    COALESCE(COUNT(mr.winner_id), 0)::INTEGER AS total_matches,
    COALESCE(SUM(
      CASE 
        WHEN mr.m_team1_id = tp.t1_id THEN mr.m_team1_game_wins
        ELSE mr.m_team2_game_wins
      END
    ), 0)::INTEGER AS team1_game_wins,
    COALESCE(SUM(
      CASE 
        WHEN mr.m_team1_id = tp.t2_id THEN mr.m_team1_game_wins
        ELSE mr.m_team2_game_wins
      END
    ), 0)::INTEGER AS team2_game_wins
  FROM team_pairs tp
  LEFT JOIN match_results mr ON mr.t1_id = tp.t1_id AND mr.t2_id = tp.t2_id
  GROUP BY tp.t1_id, tp.t2_id;
END;
$function$;