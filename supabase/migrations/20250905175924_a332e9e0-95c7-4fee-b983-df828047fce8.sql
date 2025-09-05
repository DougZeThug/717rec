-- Drop dependent views first
DROP VIEW IF EXISTS v_head_to_head CASCADE;
DROP VIEW IF EXISTS v_head_to_head_pairs CASCADE;
DROP VIEW IF EXISTS v_match_pairs CASCADE;

-- Recreate v_match_pairs with both current and archived matches
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

-- Recreate v_head_to_head_pairs
CREATE VIEW v_head_to_head_pairs AS
SELECT 
  a_id,
  b_id,
  COUNT(*) as matches_played,
  SUM(a_match_score) as a_match_wins,
  SUM(b_match_score) as b_match_wins,
  SUM(a_game_wins) as a_game_wins,
  SUM(b_game_wins) as b_game_wins,
  MAX(completed_at) as last_played_at
FROM v_match_pairs
GROUP BY a_id, b_id;

-- Recreate v_head_to_head
CREATE VIEW v_head_to_head AS
SELECT 
  a_id as team_id,
  b_id as opponent_id,
  matches_played,
  a_match_wins as wins,
  b_match_wins as losses,
  a_game_wins as game_wins,
  b_game_wins as game_losses,
  CASE 
    WHEN matches_played > 0 THEN 
      ROUND((a_match_wins::numeric / matches_played::numeric) * 100, 1)
    ELSE 0 
  END as win_pct,
  last_played_at
FROM v_head_to_head_pairs

UNION ALL

SELECT 
  b_id as team_id,
  a_id as opponent_id,
  matches_played,
  b_match_wins as wins,
  a_match_wins as losses,
  b_game_wins as game_wins,
  a_game_wins as game_losses,
  CASE 
    WHEN matches_played > 0 THEN 
      ROUND((b_match_wins::numeric / matches_played::numeric) * 100, 1)
    ELSE 0 
  END as win_pct,
  last_played_at
FROM v_head_to_head_pairs;