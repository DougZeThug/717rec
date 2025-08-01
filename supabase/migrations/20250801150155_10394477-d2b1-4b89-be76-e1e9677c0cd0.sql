-- Update Intermediate Low division teams with correct playoff rankings for Summer 1 2025

-- Update all intermediate low teams with their division and playoff rankings
UPDATE team_season_stats 
SET 
  division_name = 'Intermediate Low',
  playoff_rank = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Miracle @ Marion'
    ) THEN 1
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Zoo Pals'
    ) THEN 2
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Buttery Nips'
    ) THEN 3
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Massive Sacks'
    ) THEN 4
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'On a Mission'
    ) THEN 5
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Triple Dippers'
    ) THEN 6
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'The Undigestibles'
    ) THEN 7
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Toss D. Bag'
    ) THEN 8
  END,
  runner_up = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Zoo Pals'
    ) THEN true
    ELSE false
  END,
  champion = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Miracle @ Marion'
    ) THEN true
    ELSE false
  END
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id IN (
    SELECT t.id FROM teams t WHERE t.name IN (
      'Miracle @ Marion',
      'Zoo Pals',
      'Buttery Nips',
      'Massive Sacks',
      'On a Mission',
      'Triple Dippers',
      'The Undigestibles',
      'Toss D. Bag'
    )
  );