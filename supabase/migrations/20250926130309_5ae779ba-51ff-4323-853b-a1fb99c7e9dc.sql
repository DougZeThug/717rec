-- Update team_season_stats with Summer 2 2025 playoff results

-- First, get the Summer 2 2025 season_id and team IDs we need
WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
),
team_ids AS (
  SELECT 
    (SELECT id FROM teams WHERE name = 'Zoo Pals') as zoo_pals_id,
    (SELECT id FROM teams WHERE name = 'Tom & Tom') as tom_tom_id,
    (SELECT id FROM teams WHERE name = 'Jerm') as jerm_id,
    (SELECT id FROM teams WHERE name = 'Cornographic Material') as cornographic_id
)

-- Update Zoo Pals as INT2 Champion
UPDATE team_season_stats 
SET 
  champion = true,
  playoff_rank = 1
FROM season_info, team_ids
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = team_ids.zoo_pals_id;

-- Update Tom & Tom as INT2 Runner-up  
WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
),
team_ids AS (
  SELECT (SELECT id FROM teams WHERE name = 'Tom & Tom') as tom_tom_id
)
UPDATE team_season_stats 
SET 
  runner_up = true,
  playoff_rank = 2
FROM season_info, team_ids
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = team_ids.tom_tom_id;

-- Update Jerm as REC Champion
WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
),
team_ids AS (
  SELECT (SELECT id FROM teams WHERE name = 'Jerm') as jerm_id
)
UPDATE team_season_stats 
SET 
  champion = true,
  playoff_rank = 1
FROM season_info, team_ids
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = team_ids.jerm_id;

-- Update Cornographic Material as REC Runner-up
WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
),
team_ids AS (
  SELECT (SELECT id FROM teams WHERE name = 'Cornographic Material') as cornographic_id
)
UPDATE team_season_stats 
SET 
  runner_up = true,
  playoff_rank = 2
FROM season_info, team_ids
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = team_ids.cornographic_id;

-- Also update the seasons table with the champions
WITH team_ids AS (
  SELECT 
    (SELECT id FROM teams WHERE name = 'Zoo Pals') as zoo_pals_id,
    (SELECT id FROM teams WHERE name = 'Jerm') as jerm_id
)
UPDATE seasons 
SET 
  champion_team_id = team_ids.zoo_pals_id,
  runner_up_team_id = (SELECT id FROM teams WHERE name = 'Tom & Tom'),
  third_place_team_id = team_ids.jerm_id
FROM team_ids
WHERE name = 'Summer 2 2025';