-- Fix the division name for Toss D.Bag (correct name without space)
UPDATE team_season_stats 
SET 
  division_name = 'Intermediate Low',
  playoff_rank = 8,
  champion = false,
  runner_up = false
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id = 'abd71084-cf3f-431e-a57a-428cbe96b459';