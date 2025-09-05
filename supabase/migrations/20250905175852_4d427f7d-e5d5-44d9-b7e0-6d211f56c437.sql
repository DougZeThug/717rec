-- Update v_match_pairs to include both current and archived matches
DROP VIEW IF EXISTS v_match_pairs;

CREATE VIEW v_match_pairs AS
WITH all_matches AS (
  -- Current matches
  SELECT 
    id as match_id,
    season_id,
    date as completed_at,
    team1_id as a_id,
    team2_id as b_id,
    CASE 
      WHEN winner_id = team1_id THEN 1 
      WHEN winner_id = team2_id THEN 0 
      ELSE NULL 
    END as a_match_score,
    COALESCE(team1_game_wins, 0) as a_game_wins,
    CASE 
      WHEN winner_id = team2_id THEN 1 
      WHEN winner_id = team1_id THEN 0 
      ELSE NULL 
    END as b_match_score,
    COALESCE(team2_game_wins, 0) as b_game_wins
  FROM matches 
  WHERE iscompleted = true
  
  UNION ALL
  
  -- Archived matches
  SELECT 
    id as match_id,
    season_id,
    date as completed_at,
    team1_id as a_id,
    team2_id as b_id,
    CASE 
      WHEN winner_id = team1_id THEN 1 
      WHEN winner_id = team2_id THEN 0 
      ELSE NULL 
    END as a_match_score,
    COALESCE(team1_game_wins, 0) as a_game_wins,
    CASE 
      WHEN winner_id = team2_id THEN 1 
      WHEN winner_id = team1_id THEN 0 
      ELSE NULL 
    END as b_match_score,
    COALESCE(team2_game_wins, 0) as b_game_wins
  FROM matches_archive 
  WHERE iscompleted = true
)
SELECT * FROM all_matches
WHERE a_id IS NOT NULL AND b_id IS NOT NULL;