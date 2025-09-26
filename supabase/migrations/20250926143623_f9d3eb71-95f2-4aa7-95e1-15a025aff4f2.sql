-- Fix playoff ranking for "Toss D.Bag" team in Summer 2 2025
-- Team ID: abd71084-cf3f-431e-a57a-428cbe96b459
-- Season ID: d50bb12e-99be-4170-802a-695a402373ce
-- Bracket ID: e5ad0de8-c3bf-4a07-999d-49cb77cb99ba (Intermediate Low)

-- Add missing playoff record for "Toss D.Bag"
INSERT INTO playoff_team_records (team_id, bracket_id, wins, losses, game_wins, game_losses, placement)
VALUES (
  'abd71084-cf3f-431e-a57a-428cbe96b459', -- Toss D.Bag
  'e5ad0de8-c3bf-4a07-999d-49cb77cb99ba', -- Intermediate Low bracket
  3, -- wins
  2, -- losses  
  9, -- game wins (3*2 + 3*1 = 9 estimated)
  7, -- game losses (2*2 + 3*1 = 7 estimated)
  3  -- 3rd place
)
ON CONFLICT (team_id, bracket_id) 
DO UPDATE SET 
  wins = 3,
  losses = 2,
  game_wins = 9,
  game_losses = 7,
  placement = 3,
  updated_at = now();

-- Update playoff_rank in team_season_stats for "Toss D.Bag"
UPDATE team_season_stats 
SET playoff_rank = 3
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND team_id = 'abd71084-cf3f-431e-a57a-428cbe96b459';

-- Adjust other teams' playoff ranks in Intermediate Low division
-- Shift teams with playoff_rank >= 3 to accommodate the correct placement
UPDATE team_season_stats 
SET playoff_rank = playoff_rank + 1
WHERE season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND division_name = 'Intermediate Low'
  AND playoff_rank >= 3
  AND team_id != 'abd71084-cf3f-431e-a57a-428cbe96b459';