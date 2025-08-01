-- Fix Miracle @ Marion division and hide teams with no division for Summer 1 2025

-- Update Miracle @ Marion to Intermediate Low division
UPDATE team_season_stats 
SET division_name = 'Intermediate Low'
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id = '2ab2e684-8c28-45c3-801a-ea215433a8e4';

-- Remove teams with no division from Summer 1 2025 season stats (opted out teams)
DELETE FROM team_season_stats 
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND division_name IS NULL;