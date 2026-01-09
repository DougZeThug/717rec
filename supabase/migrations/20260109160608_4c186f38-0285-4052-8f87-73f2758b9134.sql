-- Create a function to get batch head-to-head records for multiple team pairs
-- This eliminates the N+1 query problem by fetching all H2H data in one call

CREATE OR REPLACE FUNCTION get_batch_head_to_head(
  p_team_pairs JSONB
)
RETURNS TABLE (
  team1_id UUID,
  team2_id UUID,
  team1_wins INTEGER,
  team2_wins INTEGER,
  total_matches INTEGER,
  team1_game_wins INTEGER,
  team2_game_wins INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- p_team_pairs is expected to be a JSON array like:
  -- [{"team1": "uuid1", "team2": "uuid2"}, {"team1": "uuid3", "team2": "uuid4"}, ...]
  
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
  match_results AS (
    SELECT 
      tp.t1_id,
      tp.t2_id,
      m.id AS match_id,
      m.winner_id,
      m.team1_game_wins,
      m.team2_game_wins,
      m.team1_id AS m_team1_id,
      m.team2_id AS m_team2_id
    FROM team_pairs tp
    JOIN matches m ON (
      (m.team1_id = tp.t1_id AND m.team2_id = tp.t2_id) OR
      (m.team1_id = tp.t2_id AND m.team2_id = tp.t1_id)
    )
    WHERE m.iscompleted = TRUE
  )
  SELECT 
    tp.t1_id AS team1_id,
    tp.t2_id AS team2_id,
    COALESCE(SUM(CASE WHEN mr.winner_id = tp.t1_id THEN 1 ELSE 0 END), 0)::INTEGER AS team1_wins,
    COALESCE(SUM(CASE WHEN mr.winner_id = tp.t2_id THEN 1 ELSE 0 END), 0)::INTEGER AS team2_wins,
    COALESCE(COUNT(mr.match_id), 0)::INTEGER AS total_matches,
    COALESCE(SUM(
      CASE 
        WHEN mr.m_team1_id = tp.t1_id THEN COALESCE(mr.team1_game_wins, 0)
        ELSE COALESCE(mr.team2_game_wins, 0)
      END
    ), 0)::INTEGER AS team1_game_wins,
    COALESCE(SUM(
      CASE 
        WHEN mr.m_team1_id = tp.t2_id THEN COALESCE(mr.team1_game_wins, 0)
        ELSE COALESCE(mr.team2_game_wins, 0)
      END
    ), 0)::INTEGER AS team2_game_wins
  FROM team_pairs tp
  LEFT JOIN match_results mr ON mr.t1_id = tp.t1_id AND mr.t2_id = tp.t2_id
  GROUP BY tp.t1_id, tp.t2_id;
END;
$$;