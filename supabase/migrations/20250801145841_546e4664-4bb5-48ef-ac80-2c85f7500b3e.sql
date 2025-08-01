-- Update Intermediate High division teams with correct playoff rankings for Summer 1 2025

-- Update all intermediate high teams with their division and playoff rankings
UPDATE team_season_stats 
SET 
  division_name = 'Intermediate High',
  playoff_rank = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Pepperoni Cheesers'
    ) THEN 1
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Mailmen'
    ) THEN 2
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Bag Assassins'
    ) THEN 3
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Tag Em'' & Bag Em'''
    ) THEN 4
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Happy Valley Hole Hunters'
    ) THEN 5
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Sweat Bandits'
    ) THEN 6
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Wrong Hole'
    ) THEN 7
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Tom & Tom'
    ) THEN 8
  END,
  runner_up = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Mailmen'
    ) THEN true
    ELSE false
  END,
  champion = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Pepperoni Cheesers'
    ) THEN true
    ELSE false
  END
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id IN (
    SELECT t.id FROM teams t WHERE t.name IN (
      'Pepperoni Cheesers',
      'Mailmen',
      'Bag Assassins',
      'Tag Em'' & Bag Em''',
      'Happy Valley Hole Hunters',
      'Sweat Bandits',
      'Wrong Hole',
      'Tom & Tom'
    )
  );