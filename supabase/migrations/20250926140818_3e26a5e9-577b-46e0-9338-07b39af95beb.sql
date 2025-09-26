-- Fix Summer 2 2025 matches and archive them properly
-- The correct season ID is: d50bb12e-99be-4170-802a-695a402373ce

-- Step 1: Assign correct season_id to Summer 2 2025 matches (dates Aug-Sep 2025)
UPDATE matches 
SET season_id = 'd50bb12e-99be-4170-802a-695a-402373ce'
WHERE season_id IS NULL 
  AND date >= '2025-08-01' 
  AND date <= '2025-09-30'
  AND iscompleted = true;

-- Step 2: Update team_season_stats with correct season_id and playoff-based divisions
UPDATE team_season_stats 
SET division_name = 'Competitive'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = 'bcadf3b4-903b-4222-95f1-e28bb60bb6bc'
  );

UPDATE team_season_stats 
SET division_name = 'Intermediate High'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = 'c71b40da-0ad9-4957-a542-ce47b2aa8a01'
  );

UPDATE team_season_stats 
SET division_name = 'Intermediate Low'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = 'a3b46815-30cb-4a84-8ec3-b0e11dcc3cac'
  );

UPDATE team_season_stats 
SET division_name = 'Recreational'
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = '68b5c75e-ccab-45d7-9aa1-6824d1c7f80e'
  );

-- Step 3: Archive the Summer 2 2025 matches
INSERT INTO matches_archive (
  id, bracket_id, round_number, team1_id, team2_id, winner_id, best_of,
  created_at, match_type, position, next_match_id, next_loser_match_id,
  team1_score, team2_score, date, iscompleted, loser_id, team1_game_wins,
  team2_game_wins, metadata, season_id, location, archived_at
)
SELECT 
  id, bracket_id, round_number, team1_id, team2_id, winner_id, best_of,
  created_at, match_type, position, next_match_id, next_loser_match_id,
  team1_score, team2_score, date, iscompleted, loser_id, team1_game_wins,
  team2_game_wins, metadata, season_id, location, now() as archived_at
FROM matches 
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND iscompleted = true;

-- Step 4: Remove archived matches from active table
DELETE FROM matches 
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND iscompleted = true;

-- Step 5: Archive the season
UPDATE seasons 
SET 
  is_active = false,
  is_archived = true,
  updated_at = now()
WHERE id = 'd50bb12e-99be-4170-802a-695a402373ce';