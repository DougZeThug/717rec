-- Update v_head_to_head view to include archived matches
DROP VIEW IF EXISTS v_head_to_head;

CREATE VIEW v_head_to_head AS
WITH all_matches AS (
  -- Current season matches
  SELECT 
    m.team1_id,
    m.team2_id,
    m.winner_id,
    m.loser_id,
    m.team1_game_wins,
    m.team2_game_wins,
    m.date
  FROM matches m
  WHERE m.iscompleted = true
    AND m.team1_id IS NOT NULL 
    AND m.team2_id IS NOT NULL
    AND m.winner_id IS NOT NULL
    AND m.loser_id IS NOT NULL

  UNION ALL

  -- Playoff matches
  SELECT 
    pm.team1_id,
    pm.team2_id,
    pm.winner_id,
    pm.loser_id,
    COALESCE(pm.team1_score, 0) as team1_game_wins,
    COALESCE(pm.team2_score, 0) as team2_game_wins,
    pm.created_at as date
  FROM playoff_matches pm
  WHERE pm.winner_id IS NOT NULL
    AND pm.loser_id IS NOT NULL
    AND pm.team1_id IS NOT NULL 
    AND pm.team2_id IS NOT NULL

  UNION ALL

  -- Archived matches from previous seasons
  SELECT 
    ma.team1_id,
    ma.team2_id,
    ma.winner_id,
    ma.loser_id,
    ma.team1_game_wins,
    ma.team2_game_wins,
    ma.date
  FROM matches_archive ma
  WHERE ma.iscompleted = true
    AND ma.team1_id IS NOT NULL 
    AND ma.team2_id IS NOT NULL
    AND ma.winner_id IS NOT NULL
    AND ma.loser_id IS NOT NULL
),
team_pairs AS (
  -- Create pairs for each team combination
  SELECT 
    team1_id as team_id,
    team2_id as opponent_id,
    winner_id,
    loser_id,
    team1_game_wins as team_game_wins,
    team2_game_wins as opponent_game_wins,
    date
  FROM all_matches
  
  UNION ALL
  
  SELECT 
    team2_id as team_id,
    team1_id as opponent_id,
    winner_id,
    loser_id,
    team2_game_wins as team_game_wins,
    team1_game_wins as opponent_game_wins,
    date
  FROM all_matches
)
SELECT 
  tp.team_id,
  tp.opponent_id,
  COUNT(*) as matches_played,
  COUNT(CASE WHEN tp.winner_id = tp.team_id THEN 1 END) as wins,
  COUNT(CASE WHEN tp.loser_id = tp.team_id THEN 1 END) as losses,
  SUM(tp.team_game_wins) as game_wins,
  SUM(tp.opponent_game_wins) as game_losses,
  ROUND(
    COUNT(CASE WHEN tp.winner_id = tp.team_id THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    1
  ) as win_pct,
  MAX(tp.date) as last_played_at
FROM team_pairs tp
GROUP BY tp.team_id, tp.opponent_id
HAVING COUNT(*) > 0;