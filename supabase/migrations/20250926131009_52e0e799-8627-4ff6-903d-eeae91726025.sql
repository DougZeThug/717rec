-- Update remaining playoff rankings for Summer 2 2025

-- Update INT2 playoff rankings (3rd-8th place)
WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 3
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Toss D. Bag');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 4
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Buttery Nips');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 5
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Massive Sacks');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 6
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'On a Mission');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 7
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'The Undigestibles');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 8
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Triple Dippers');

-- Update REC playoff rankings (3rd-6th place)
WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 3
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Here for Fireball');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 4
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Killa Queens');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 5
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Corn Kitties');

WITH season_info AS (
  SELECT id as season_id FROM seasons WHERE name = 'Summer 2 2025'
)
UPDATE team_season_stats 
SET playoff_rank = 6
FROM season_info
WHERE team_season_stats.season_id = season_info.season_id 
  AND team_season_stats.team_id = (SELECT id FROM teams WHERE name = 'Sour Patch Kids');

-- Update seasons table to set Here for Fireball as third place (REC 3rd place finisher)
UPDATE seasons 
SET third_place_team_id = (SELECT id FROM teams WHERE name = 'Here for Fireball')
WHERE name = 'Summer 2 2025';