-- Fix duplicate head-to-head records by normalizing team pairs
-- Drop dependent views first
DROP VIEW IF EXISTS v_head_to_head;
DROP VIEW IF EXISTS v_head_to_head_pairs;
DROP VIEW IF EXISTS v_match_pairs;

-- Recreate v_match_pairs with normalized team ordering (smaller ID always as a_id)
CREATE VIEW v_match_pairs AS
SELECT 
  m.season_id,
  m.date as completed_at,
  CASE 
    WHEN m.team1_id < m.team2_id THEN m.team1_id 
    ELSE m.team2_id 
  END as a_id,
  CASE 
    WHEN m.team1_id < m.team2_id THEN m.team2_id 
    ELSE m.team1_id 
  END as b_id,
  CASE 
    WHEN m.team1_id < m.team2_id THEN 
      CASE WHEN m.winner_id = m.team1_id THEN 1 ELSE 0 END
    ELSE 
      CASE WHEN m.winner_id = m.team2_id THEN 1 ELSE 0 END
  END as a_match_score,
  CASE 
    WHEN m.team1_id < m.team2_id THEN COALESCE(m.team1_game_wins, 0)
    ELSE COALESCE(m.team2_game_wins, 0)
  END as a_game_wins,
  CASE 
    WHEN m.team1_id < m.team2_id THEN 
      CASE WHEN m.winner_id = m.team2_id THEN 1 ELSE 0 END
    ELSE 
      CASE WHEN m.winner_id = m.team1_id THEN 1 ELSE 0 END
  END as b_match_score,
  CASE 
    WHEN m.team1_id < m.team2_id THEN COALESCE(m.team2_game_wins, 0)
    ELSE COALESCE(m.team1_game_wins, 0)
  END as b_game_wins,
  m.id as match_id
FROM (
  SELECT id, season_id, date, team1_id, team2_id, winner_id, team1_game_wins, team2_game_wins, iscompleted
  FROM matches WHERE iscompleted = true
  UNION ALL
  SELECT id, season_id, date, team1_id, team2_id, winner_id, team1_game_wins, team2_game_wins, iscompleted
  FROM matches_archive WHERE iscompleted = true
) m
WHERE m.team1_id IS NOT NULL 
  AND m.team2_id IS NOT NULL 
  AND m.winner_id IS NOT NULL;

-- Recreate v_head_to_head_pairs with aggregated statistics per normalized team pair
CREATE VIEW v_head_to_head_pairs AS
SELECT 
  mp.a_id,
  mp.b_id,
  COUNT(*) as matches_played,
  SUM(mp.a_match_score) as a_match_wins,
  SUM(mp.b_match_score) as b_match_wins,
  SUM(mp.a_game_wins) as a_game_wins,
  SUM(mp.b_game_wins) as b_game_wins,
  MAX(mp.completed_at) as last_played_at
FROM v_match_pairs mp
GROUP BY mp.a_id, mp.b_id;

-- Recreate v_head_to_head to show each team's perspective using the normalized pairs
CREATE VIEW v_head_to_head AS
SELECT 
  h.a_id as team_id,
  h.b_id as opponent_id,
  h.matches_played,
  h.a_match_wins as wins,
  h.b_match_wins as losses,
  h.a_game_wins as game_wins,
  h.b_game_wins as game_losses,
  CASE 
    WHEN h.matches_played > 0 
    THEN ROUND((h.a_match_wins::numeric / h.matches_played::numeric) * 100, 1)
    ELSE 0 
  END as win_pct,
  h.last_played_at
FROM v_head_to_head_pairs h

UNION ALL

SELECT 
  h.b_id as team_id,
  h.a_id as opponent_id,
  h.matches_played,
  h.b_match_wins as wins,
  h.a_match_wins as losses,
  h.b_game_wins as game_wins,
  h.a_game_wins as game_losses,
  CASE 
    WHEN h.matches_played > 0 
    THEN ROUND((h.b_match_wins::numeric / h.matches_played::numeric) * 100, 1)
    ELSE 0 
  END as win_pct,
  h.last_played_at
FROM v_head_to_head_pairs h;