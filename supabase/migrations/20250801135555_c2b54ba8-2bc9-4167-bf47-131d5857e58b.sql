-- Archive Summer 1 2025 matches
-- Step 1: Assign season_id to Summer 1 2025 matches (June 7 - August 31, 2025)
UPDATE matches 
SET season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
WHERE date >= '2025-06-07' 
  AND date <= '2025-08-31'
  AND season_id IS NULL;

-- Step 2: Copy Summer 1 2025 matches to archive table
INSERT INTO matches_archive (
  id, team1_id, team2_id, team1_score, team2_score, date, location, 
  iscompleted, winner_id, loser_id, round_number, position, bracket_id, 
  match_type, next_match_id, next_loser_match_id, best_of, created_at, 
  team1_game_wins, team2_game_wins, season_id, metadata, archived_at
)
SELECT 
  id, team1_id, team2_id, team1_score, team2_score, date, location,
  iscompleted, winner_id, loser_id, round_number, position, bracket_id,
  match_type, next_match_id, next_loser_match_id, best_of, created_at,
  team1_game_wins, team2_game_wins, season_id, metadata, NOW()
FROM matches 
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';

-- Step 3: Archive the Summer 1 2025 season
UPDATE seasons 
SET is_archived = true, is_active = false, updated_at = NOW()
WHERE id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';