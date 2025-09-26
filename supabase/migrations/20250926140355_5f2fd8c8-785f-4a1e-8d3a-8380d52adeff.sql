-- Step 1: Update team_season_stats division names based on playoff bracket participation
-- for Summer 2 2025 season (ID: 344c8618-067b-4f04-aade-41b816ff8c08)

-- COMP bracket teams → 'Competitive'
UPDATE team_season_stats 
SET division_name = 'Competitive'
WHERE season_id = '344c8618-067b-4f04-aade-41b816ff8c08'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = 'bcadf3b4-903b-4222-95f1-e28bb60bb6bc'
  );

-- INT1 bracket teams → 'Intermediate High' 
UPDATE team_season_stats 
SET division_name = 'Intermediate High'
WHERE season_id = '344c8618-067b-4f04-aade-41b816ff8c08'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = 'c71b40da-0ad9-4957-a542-ce47b2aa8a01'
  );

-- INT2 bracket teams → 'Intermediate Low'
UPDATE team_season_stats 
SET division_name = 'Intermediate Low'
WHERE season_id = '344c8618-067b-4f04-aade-41b816ff8c08'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = 'a3b46815-30cb-4a84-8ec3-b0e11dcc3cac'
  );

-- REC bracket teams → 'Recreational'
UPDATE team_season_stats 
SET division_name = 'Recreational'
WHERE season_id = '344c8618-067b-4f04-aade-41b816ff8c08'
  AND team_id IN (
    SELECT DISTINCT p.team_id 
    FROM participants p 
    WHERE p.bracket_id = '68b5c75e-ccab-45d7-9aa1-6824d1c7f80e'
  );

-- Step 2: Archive all completed Summer 2 2025 regular season matches
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
WHERE season_id = '344c8618-067b-4f04-aade-41b816ff8c08'
  AND iscompleted = true;

-- Remove the archived matches from the active matches table
DELETE FROM matches 
WHERE season_id = '344c8618-067b-4f04-aade-41b816ff8c08'
  AND iscompleted = true;

-- Step 3: Archive the Summer 2 2025 season
UPDATE seasons 
SET 
  is_active = false,
  is_archived = true,
  updated_at = now()
WHERE id = '344c8618-067b-4f04-aade-41b816ff8c08';