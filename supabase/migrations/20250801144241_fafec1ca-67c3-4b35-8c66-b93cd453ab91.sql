-- Update competitive division teams with correct playoff rankings for Summer 1 2025

-- Update all competitive teams with their division and playoff rankings
UPDATE team_season_stats 
SET 
  division_name = 'Competitive',
  playoff_rank = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Cuzzo''s Clinic'
    ) THEN 1
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Seize the Maize'
    ) THEN 2
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Hole Violators'
    ) THEN 3
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Jager Bombers'
    ) THEN 4
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Baggin'' and Braggin'''
    ) THEN 5
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Hole Burners'
    ) THEN 6
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = '3 Amigos'
    ) THEN 7
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Birds of Prey'
    ) THEN 8
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Shut Your Cornhole'
    ) THEN 9
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Came from Dicks'
    ) THEN 10
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Bag Babies'
    ) THEN 11
  END,
  runner_up = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Seize the Maize'
    ) THEN true
    ELSE false
  END,
  champion = CASE 
    WHEN team_id IN (
      SELECT t.id FROM teams t WHERE t.name = 'Cuzzo''s Clinic'
    ) THEN true
    ELSE false
  END
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id IN (
    SELECT t.id FROM teams t WHERE t.name IN (
      'Cuzzo''s Clinic',
      'Seize the Maize', 
      'Hole Violators',
      'Jager Bombers',
      'Baggin'' and Braggin''',
      'Hole Burners',
      '3 Amigos',
      'Birds of Prey',
      'Shut Your Cornhole',
      'Came from Dicks',
      'Bag Babies'
    )
  );