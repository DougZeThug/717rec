-- Fix Summer 2 2025 team season stats from archived matches
-- Season ID: d50bb12e-99be-4170-802a-695a-402373ce

-- Step 1: Recalculate team statistics from matches_archive
WITH season_stats AS (
  SELECT 
    team_id,
    'd50bb12e-99be-4170-802a-695a402373ce'::uuid as season_id,
    SUM(CASE WHEN winner_id = team_id THEN 1 ELSE 0 END) as match_wins,
    SUM(CASE WHEN loser_id = team_id THEN 1 ELSE 0 END) as match_losses,
    SUM(CASE 
      WHEN team1_id = team_id THEN COALESCE(team1_game_wins, 0)
      WHEN team2_id = team_id THEN COALESCE(team2_game_wins, 0)
      ELSE 0
    END) as game_wins,
    SUM(CASE 
      WHEN team1_id = team_id THEN COALESCE(team2_game_wins, 0)
      WHEN team2_id = team_id THEN COALESCE(team1_game_wins, 0)
      ELSE 0
    END) as game_losses
  FROM (
    -- Get all teams that participated in Summer 2 2025 matches
    SELECT team1_id as team_id, winner_id, loser_id, team1_id, team2_id, team1_game_wins, team2_game_wins
    FROM matches_archive 
    WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
      AND iscompleted = true
    UNION ALL
    SELECT team2_id as team_id, winner_id, loser_id, team1_id, team2_id, team1_game_wins, team2_game_wins
    FROM matches_archive 
    WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
      AND iscompleted = true
  ) team_matches
  GROUP BY team_id
)
UPDATE team_season_stats 
SET 
  match_wins = season_stats.match_wins,
  match_losses = season_stats.match_losses,
  game_wins = season_stats.game_wins,
  game_losses = season_stats.game_losses,
  recorded_at = now()
FROM season_stats
WHERE team_season_stats.season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_season_stats.team_id = season_stats.team_id;

-- Step 2: Update division names based on playoff brackets
-- Get the correct bracket IDs for Summer 2 2025 playoff divisions

-- Competitive division
UPDATE team_season_stats 
SET division_name = 'Competitive'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    JOIN brackets b ON p.bracket_id = b.id
    WHERE b.title ILIKE '%COMP%' 
      AND b.created_at >= '2025-08-01' 
      AND b.created_at <= '2025-09-30'
  );

-- Intermediate High division
UPDATE team_season_stats 
SET division_name = 'Intermediate High'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    JOIN brackets b ON p.bracket_id = b.id
    WHERE b.title ILIKE '%INT1%' 
      AND b.created_at >= '2025-08-01' 
      AND b.created_at <= '2025-09-30'
  );

-- Intermediate Low division
UPDATE team_season_stats 
SET division_name = 'Intermediate Low'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    JOIN brackets b ON p.bracket_id = b.id
    WHERE b.title ILIKE '%INT2%' 
      AND b.created_at >= '2025-08-01' 
      AND b.created_at <= '2025-09-30'
  );

-- Recreational division
UPDATE team_season_stats 
SET division_name = 'Recreational'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    JOIN brackets b ON p.bracket_id = b.id
    WHERE b.title ILIKE '%REC%' 
      AND b.created_at >= '2025-08-01' 
      AND b.created_at <= '2025-09-30'
  );

-- Step 3: Update champion and runner-up flags based on season data
UPDATE team_season_stats 
SET champion = true
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id = (
    SELECT champion_team_id 
    FROM seasons 
    WHERE id = 'd50bb12e-99be-4170-802a-695a402373ce'
  );

UPDATE team_season_stats 
SET runner_up = true
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id = (
    SELECT runner_up_team_id 
    FROM seasons 
    WHERE id = 'd50bb12e-99be-4170-802a-695a402373ce'
  );