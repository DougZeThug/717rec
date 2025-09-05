-- Head-to-Head System Database Views
-- Adapted for current schema (using iscompleted, team1_id/team2_id, etc.)

-- 1) Canonical pair per match (A,B ordered) + who won
CREATE OR REPLACE VIEW v_match_pairs AS
SELECT
  m.id as match_id,
  m.season_id,
  m.date as completed_at,
  -- canonical opponent pair: (a_id,b_id) with a_id < b_id for stable grouping
  LEAST(m.team1_id, m.team2_id) as a_id,
  GREATEST(m.team1_id, m.team2_id) as b_id,

  -- normalize results into "a" perspective
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
  END as b_game_wins

FROM matches m
WHERE m.iscompleted = true 
  AND m.winner_id IS NOT NULL 
  AND m.team1_id IS NOT NULL 
  AND m.team2_id IS NOT NULL;

-- 2) Aggregate per (a_id,b_id)
CREATE OR REPLACE VIEW v_head_to_head_pairs AS
SELECT
  p.a_id,
  p.b_id,
  COUNT(*) as matches_played,
  SUM(p.a_match_score) as a_match_wins,
  SUM(p.b_match_score) as b_match_wins,
  SUM(p.a_game_wins) as a_game_wins,
  SUM(p.b_game_wins) as b_game_wins,
  MAX(p.completed_at) as last_played_at
FROM v_match_pairs p
GROUP BY p.a_id, p.b_id;

-- 3) Symmetric (team_id, opponent_id) rows
CREATE OR REPLACE VIEW v_head_to_head AS
SELECT
  a_id as team_id,
  b_id as opponent_id,
  matches_played,
  a_match_wins as wins,
  b_match_wins as losses,
  a_game_wins as game_wins,
  b_game_wins as game_losses,
  CASE WHEN matches_played > 0
       THEN ROUND((a_match_wins::numeric / matches_played::numeric), 4)
       ELSE 0 END as win_pct,
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
  CASE WHEN matches_played > 0
       THEN ROUND((b_match_wins::numeric / matches_played::numeric), 4)
       ELSE 0 END as win_pct,
  last_played_at
FROM v_head_to_head_pairs;