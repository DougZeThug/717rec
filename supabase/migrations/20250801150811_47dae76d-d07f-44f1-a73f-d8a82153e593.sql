-- Update Recreational division teams with correct playoff rankings for Summer 1 2025

-- Update all recreational teams with their division and playoff rankings
UPDATE team_season_stats 
SET 
  division_name = 'Recreational',
  playoff_rank = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Here for Fireball'
    ) THEN 1
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'The Wheezys'
    ) THEN 2
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Bean Queens'
    ) THEN 3
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Killa Queens'
    ) THEN 4
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'T-Baggers'
    ) THEN 5
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Corn Kitties'
    ) THEN 6
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Jerm'
    ) THEN 7
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Red Roof Rockets'
    ) THEN 8
  END,
  runner_up = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'The Wheezys'
    ) THEN true
    ELSE false
  END,
  champion = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Here for Fireball'
    ) THEN true
    ELSE false
  END
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id IN (
    SELECT t.id FROM teams t WHERE t.name IN (
      'Here for Fireball',
      'The Wheezys',
      'Bean Queens',
      'Killa Queens',
      'T-Baggers',
      'Corn Kitties',
      'Jerm',
      'Red Roof Rockets'
    )
  );